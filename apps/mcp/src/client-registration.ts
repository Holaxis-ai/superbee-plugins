import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { parse as parseToml } from "smol-toml";
import {
  configObject,
  patchConfig,
  record,
  snapshot,
  type Snapshot,
} from "./client-config.js";

const name = "superbee-experimental";
export const clientUsage = `superbee-mcp install --host <host> [--dir <directory> | --workspace <catalog label or ID>] --actor <identity>
superbee-mcp status --host <host>
superbee-mcp uninstall --host <host>
Hosts: codex, claude-code, claude-desktop (macOS), opencode`;

type Host = "codex" | "claude-code" | "claude-desktop" | "opencode";
type Operation = "install" | "uninstall" | "status";
type Launch = { command: string; args: string[] };
const executable = fileURLToPath(import.meta.url);
const node = process.execPath;

function codexLaunch(): Launch {
  if (process.platform !== "win32") return { command: "codex", args: [] };
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    const native = path.join(directory, "codex.exe");
    if (existsSync(native)) return { command: native, args: [] };
    const shim = path.join(directory, "codex.cmd");
    if (!existsSync(shim)) continue;
    // npm places the global shim at the prefix and the local shim under node_modules/.bin.
    const modules = path.basename(directory).toLowerCase() === ".bin"
      ? path.dirname(directory)
      : path.join(directory, "node_modules");
    const launcher = path.join(modules, "@openai", "codex", "bin", "codex.js");
    // Verify the npm-generated wrapper before going straight to its JavaScript entry.
    const target = "%dp0%\\" + path.relative(directory, launcher);
    const expected = String.raw`@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0
IF EXIST "%dp0%\node.exe" (
  SET "_prog=%dp0%\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "${target}" %*`;
    const normalize = (text: string) => text.split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter(Boolean).join("\n");
    if (!existsSync(launcher) || normalize(readFileSync(shim, "utf8")) !== normalize(expected)) {
      throw new Error("The Codex command is a custom wrapper. Put the official Codex executable or npm installation on PATH.");
    }
    const siblingNode = path.join(directory, "node.exe");
    return { command: existsSync(siblingNode) ? siblingNode : node, args: [launcher] };
  }
  throw new Error("Install Codex and put its native executable or npm launcher on PATH.");
}

function native(command: string, args: string[]) {
  const launch = command === "codex" ? codexLaunch() : { command, args: [] };
  try {
    return execFileSync(launch.command, [...launch.args, ...args], {
      cwd: homedir(),
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      `Could not run ${command} ${args.slice(0, 2).join(" ")}. Check the client installation and its user configuration.`,
    );
  }
}

function table(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!record(value)) throw new Error("Invalid MCP configuration table.");
  return value;
}

function absolute(file: string) {
  if (!path.isAbsolute(file))
    throw new Error("Client config overrides must be absolute paths.");
  return file;
}

function openCodeRoot() {
  return path.join(
    absolute(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config")),
    "opencode",
  );
}

function openCodeVersion() {
  for (const cmd of ["opencode2", "opencode"]) {
    try {
      const result = native(cmd, ["--version"])
        .trim()
        .match(/^v?(\d+)\./);
      if (result) return Number(result[1]) >= 2 ? 2 : 1;
    } catch {
      /* Try the other supported executable. */
    }
  }
  return undefined;
}

function entryAt(root: Record<string, unknown>, keys: string[]): unknown {
  let object = root;
  for (const key of keys.slice(0, -1)) object = table(object[key]);
  return object[name];
}

interface Target {
  before: Snapshot;
  keys: string[];
  entry: unknown;
}

function inspect(host: Host, creating: boolean): Target {
  const home = homedir();
  const env = process.env;
  if (host === "opencode") {
    if (env.OPENCODE_CONFIG_CONTENT?.trim())
      throw new Error(
        "OpenCode inline configuration is active. Manage that registration explicitly.",
      );
    const dir = openCodeRoot();
    const standard = [
      path.join(dir, "opencode.json"),
      path.join(dir, "opencode.jsonc"),
    ];
    const override = env.OPENCODE_CONFIG
      ? absolute(env.OPENCODE_CONFIG)
      : undefined;
    const sources = [
      ...new Set(override ? [...standard, override] : standard),
    ].map((file) => {
      const before = snapshot(file);
      const root = configObject(before.text ?? "{}", true);
      const mcp = table(root.mcp);
      if (mcp.servers !== undefined && Object.hasOwn(mcp, name))
        throw new Error("Mixed OpenCode MCP declarations.");
      const v2 = mcp.servers !== undefined;
      const keys = v2 ? ["mcp", "servers", name] : ["mcp", name];
      return {
        before,
        keys,
        entry: entryAt(root, keys),
        declared: root.mcp !== undefined,
      };
    });
    const owners = sources.filter((s) => s.entry !== undefined);
    if (owners.length > 1)
      throw new Error(
        "Multiple OpenCode files declare the experimental server.",
      );

    const existing = sources.filter((s) => s.before.text !== undefined);
    if (!owners.length && !override && existing.length > 1 && creating)
      throw new Error("Select an OpenCode config using OPENCODE_CONFIG.");
    const target =
      owners[0] ??
      (override
        ? sources.find((s) => s.before.file === override)!
        : (existing[0] ?? sources[0]));
    if (target.keys.length === 3 && openCodeVersion() === 1)
      throw new Error(
        "OpenCode v1 cannot load a v2 MCP configuration. Check the selected configuration and installed client.",
      );
    if (creating && !target.declared) {
      const version = openCodeVersion();
      if (!version)
        throw new Error(
          "Cannot determine OpenCode version. Install OpenCode or define the MCP table in its configuration.",
        );
      if (version === 2) target.keys = ["mcp", "servers", name];
    }
    return target;
  }
  if (host === "claude-desktop" && process.platform !== "darwin")
    throw new Error("Claude Desktop setup supports macOS.");
  const file =
    host === "codex"
      ? path.join(
          absolute(env.CODEX_HOME || path.join(home, ".codex")),
          "config.toml",
        )
      : host === "claude-code"
        ? path.join(absolute(env.CLAUDE_CONFIG_DIR || home), ".claude.json")
        : path.join(
            home,
            "Library/Application Support/Claude/claude_desktop_config.json",
          );
  const before = snapshot(file);
  if (host === "codex") {
    const keys = ["mcp_servers", name];
    const entry = entryAt(parseToml(before.text ?? ""), keys);
    const listed: unknown = JSON.parse(
      native("codex", ["mcp", "list", "--json"]),
    );
    if (!Array.isArray(listed)) throw new Error("Invalid Codex MCP list.");
    const matches = listed.filter((row) => row?.name === name);
    if (matches.length !== (entry === undefined ? 0 : 1))
      throw new Error(
        "Codex effective registration differs from the user configuration.",
      );
    if (
      entry !== undefined &&
      (!record(entry) ||
        matches[0].enabled !== true ||
        matches[0].transport?.type !== "stdio" ||
        matches[0].transport.command !== entry.command ||
        !isDeepStrictEqual(matches[0].transport.args, entry.args))
    ) {
      return { before, keys, entry: null };
    }
    return { before, keys, entry };
  }
  const keys = ["mcpServers", name];
  return {
    before,
    keys,
    entry: entryAt(configObject(before.text ?? "{}", false), keys),
  };
}

function hostEntry(host: Host, keys: string[], launch: Launch) {
  if (host === "opencode")
    return keys.length === 3
      ? {
          type: "local",
          command: [launch.command, ...launch.args],
          disabled: false,
        }
      : {
          type: "local",
          command: [launch.command, ...launch.args],
          enabled: true,
        };
  if (host === "claude-code") return { type: "stdio", ...launch, env: {} };
  return launch;
}

// Only accept the installed launch and the exact manual shape published with the first preview.
function owned(host: Host, target: Target): Launch | undefined {
  if (!record(target.entry)) return;
  const entry = target.entry;
  const command =
    host === "opencode" && Array.isArray(entry.command)
      ? entry.command[0]
      : entry.command;
  const args =
    host === "opencode" && Array.isArray(entry.command)
      ? entry.command.slice(1)
      : entry.args;
  if (
    typeof command !== "string" ||
    !Array.isArray(args) ||
    !args.every((arg) => typeof arg === "string")
  )
    return;
  const launch = { command, args: args as string[] };
  let flags = launch.args;
  if (command === node && flags[0] === executable) flags = flags.slice(1);
  else {
    const manual = path.resolve(
      path.dirname(executable),
      "../../../.bin/superbee-mcp",
    );
    if (!path.isAbsolute(command) || path.basename(command) !== path.basename(manual)) return;
    try {
      // macOS may spell the same install prefix through /var or /private/var.
      if (
        realpathSync(path.dirname(command)) !== path.dirname(manual) ||
        realpathSync(command) !== executable
      ) return;
    } catch {
      return;
    }
  }
  const actorOnly =
    flags.length === 2 && flags[0] === "--actor" && !!flags[1].trim();
  const selected =
    flags.length === 4 &&
    flags[2] === "--actor" &&
    !!flags[3].trim() &&
    ((flags[0] === "--dir" && path.isAbsolute(flags[1])) ||
      (flags[0] === "--workspace" && !!flags[1].trim()));
  if (!selected && !(actorOnly && command === node)) return;
  const shape =
    host === "claude-code" &&
    command !== node &&
    Object.keys(entry).length === 2
      ? launch
      : hostEntry(host, target.keys, launch);
  if (
    Object.keys(shape).length !== Object.keys(entry).length ||
    !Object.entries(shape).every(([key, v]) =>
      key === "env"
        ? record(entry.env) && Object.keys(entry.env).length === 0
        : isDeepStrictEqual(entry[key], v),
    )
  )
    return;
  return launch;
}

function mutate(
  host: Host,
  operation: Operation,
  target: Target,
  launch?: Launch,
) {
  if (host === "codex" || host === "claude-code") {
    const cmd = host === "codex" ? "codex" : "claude";
    const scope = host === "claude-code" ? ["--scope", "user"] : [];
    if (operation === "uninstall")
      native(cmd, ["mcp", "remove", ...scope, name]);
    else
      native(cmd, [
        "mcp",
        "add",
        ...scope,
        ...(host === "claude-code" ? ["--transport", "stdio"] : []),
        name,
        "--",
        launch!.command,
        ...launch!.args,
      ]);
  } else {
    patchConfig(
      target.before,
      target.keys,
      launch && hostEntry(host, target.keys, launch),
    );
  }
}

export async function configure(
  operation: Operation,
  argv: string[],
  validate: (
    dir?: string,
    workspace?: string,
    actor?: string,
  ) => Promise<unknown>,
) {
  const { values, tokens } = parseArgs({
    args: argv,
    tokens: true,
    options: {
      host: { type: "string" },
      dir: { type: "string" },
      workspace: { type: "string" },
      actor: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name))
      throw new Error(`Repeated --${token.name} option.`);
    seen.add(token.name);
  }
  if (values.help) {
    console.log(clientUsage);
    return;
  }
  const requestedHost = values.host;
  if (
    requestedHost !== "codex" &&
    requestedHost !== "claude-code" &&
    requestedHost !== "claude-desktop" &&
    requestedHost !== "opencode"
  )
    throw new Error(clientUsage);
  const host: Host = requestedHost;
  if (process.platform === "win32" && host !== "codex") {
    throw new Error("Native Windows client registration supports Codex.");
  }
  if (
    !executable.endsWith(
      path.join(path.sep, "node_modules/@superbee/experimental-mcp/dist/superbee-mcp.mjs"),
    ) ||
    executable.split(path.sep).includes("_npx")
  )
    throw new Error(
      "Run the experimental MCP executable from its installed npm prefix.",
    );
  let launch: Launch | undefined;
  if (operation === "install") {
    if (
      (values.dir !== undefined && values.workspace !== undefined) ||
      values.dir?.trim() === "" ||
      values.workspace?.trim() === "" ||
      !values.actor?.trim()
    )
      throw new Error(clientUsage);
    const dir = values.dir !== undefined ? path.resolve(values.dir) : undefined;
    await validate(dir, values.workspace, values.actor);
    launch = {
      command: node,
      args: [
        executable,
        ...(dir
          ? ["--dir", dir]
          : values.workspace
            ? ["--workspace", values.workspace]
            : []),
        "--actor",
        values.actor,
      ],
    };
  } else if (
    [values.actor, values.dir, values.workspace].some((v) => v !== undefined)
  )
    throw new Error(clientUsage);

  function decide(target: Target) {
    const prior = owned(host, target);
    const state =
      target.entry === undefined ? "absent" : prior ? "installed" : "foreign";
    if (operation === "status") return { state, change: false };
    if (state === "foreign")
      throw new Error(
        `The ${name} entry has a different launcher or client settings. Review it in the client.`,
      );
    if (operation === "install" && prior && !isDeepStrictEqual(prior, launch))
      throw new Error(
        "Uninstall the existing experimental registration before changing its workspace, actor or launcher.",
      );
    return { state, change: operation === "install" ? !prior : !!prior };
  }
  const initial = inspect(host, operation === "install");
  const { state: initialState, change } = decide(initial);
  let state = initialState;
  if (change) {
    const file = initial.before.destination ?? initial.before.file;
    // OpenCode combines multiple files into one server namespace. Lock that namespace
    // as well as the destination, which can also be shared by different config roots.
    const locks =
      host === "opencode"
        ? [
            path.join(
              openCodeRoot(),
              ".superbee-experimental-registration.lock",
            ),
            file + ".superbee-experimental.lock",
          ]
        : [file + ".superbee-experimental.lock"];
    const held: string[] = [];
    try {
      for (const lock of locks) {
        mkdirSync(path.dirname(lock), { recursive: true, mode: 0o700 });
        try {
          mkdirSync(lock, { mode: 0o700 });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          throw new Error(
            `Setup is busy. If an earlier setup was interrupted, check that it has exited before removing ${lock}.`,
          );
        }
        held.push(lock);
      }
      const fresh = inspect(host, operation === "install");
      if (
        fresh.before.file !== initial.before.file ||
        fresh.before.destination !== initial.before.destination ||
        !isDeepStrictEqual(fresh.entry, initial.entry)
      )
        throw new Error(
          "Client registration changed during setup. Retry the command.",
        );
      mutate(host, operation, fresh, launch);
      const after = inspect(host, false);
      if (
        operation === "install"
          ? !isDeepStrictEqual(owned(host, after), launch)
          : after.entry !== undefined
      )
        throw new Error(
          "Registration read-back failed. Inspect the client before retrying.",
        );
      state = operation === "install" ? "installed" : "absent";
    } finally {
      for (const lock of held.reverse()) rmdirSync(lock);
    }
  }
  console.log(
    JSON.stringify({
      host,
      name,
      state,
      changed: change,
      restart_required: change,
    }),
  );
}
