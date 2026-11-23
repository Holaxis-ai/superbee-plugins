import {
  constants,
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
  lstatSync,
  writeFileSync,
  chmodSync,
  linkSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  applyEdits,
  getNodeValue,
  modify,
  parseTree,
  type Node,
  type ParseError,
} from "jsonc-parser";

function missing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkKeys(node: Node) {
  if (node.type === "object") {
    const keys = new Set<string>();
    for (const field of node.children ?? []) {
      const key = field.children![0].value;
      if (keys.has(key))
        throw new Error("Duplicate key in client configuration.");
      keys.add(key);
    }
  }
  for (const child of node.children ?? []) checkKeys(child);
}

export function configObject(source: string, jsonc: boolean) {
  const errors: ParseError[] = [];
  const tree = parseTree(source, errors, {
    allowTrailingComma: jsonc,
    disallowComments: !jsonc,
  });
  if (!tree || tree.type !== "object" || errors.length)
    throw new Error("Invalid client configuration.");
  checkKeys(tree);
  return getNodeValue(tree) as Record<string, unknown>;
}

export function snapshot(file: string) {
  let destination: string;
  try {
    destination = realpathSync(file);
  } catch (error) {
    if (!missing(error)) throw error;
    try {
      lstatSync(file);
    } catch (statError) {
      if (missing(statError))
        return { file, destination: undefined, text: undefined, mode: 0o600 };
      throw statError;
    }
    throw new Error("Client configuration is a dangling symlink.");
  }
  const fd = openSync(
    destination,
    constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
  );
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
      throw new Error("Unsupported client configuration file.");
    const text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(readFileSync(fd));
    return { file, destination, text, mode: stat.mode & 0o777 };
  } finally {
    closeSync(fd);
  }
}

export type Snapshot = ReturnType<typeof snapshot>;

export function patchConfig(before: Snapshot, keys: string[], value: unknown) {
  const text = before.text ?? "{}\n";
  const edits = modify(text, keys, value, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: text.includes("\r\n") ? "\r\n" : "\n",
    },
  });
  const destination = before.destination ?? before.file;
  const temp = join(
    dirname(destination),
    "." + basename(destination) + "." + randomUUID(),
  );
  const fd = openSync(temp, "wx", 0o600);
  try {
    try {
      writeFileSync(fd, applyEdits(text, edits));
    } finally {
      closeSync(fd);
    }
    chmodSync(temp, before.mode);
    const current = snapshot(before.file);
    if (
      current.destination !== before.destination ||
      current.text !== before.text ||
      current.mode !== before.mode
    )
      throw new Error(
        "Client configuration changed during setup. Retry the command.",
      );
    if (before.destination) renameSync(temp, destination);
    else linkSync(temp, destination);
  } finally {
    try {
      unlinkSync(temp);
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
}
