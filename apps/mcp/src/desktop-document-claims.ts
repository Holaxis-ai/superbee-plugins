// Claude Desktop can use different stdio servers for the model call and the reader iframe.
// Keep the render key solely in the tool receipt. Only the encrypted, already-rendered snapshot
// enters the user's temporary directory, so a later edit cannot change what that receipt shows.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withFilesystemMutationLock } from "@superbee/core";
import { parseDocumentPresentationPayload } from "./document-contract.js";
import type { DocumentClaims } from "./server.js";

const TTL_MS = 10 * 60_000;
const LIMIT = 16;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function identity(location: string) {
  const canonical = await realpath(location);
  const info = await stat(canonical, { bigint: true });
  return [canonical, String(info.dev), String(info.ino)];
}

export async function desktopDocumentClaims(directory: string | null, actor: string): Promise<DocumentClaims> {
  const uid = process.getuid!(); // The Desktop extension is distributed for macOS.
  const entry = fileURLToPath(import.meta.url);
  const build = await stat(entry, { bigint: true });
  const home = await identity(homedir());
  const selection = directory === null ? ["catalog"] : ["directory", ...await identity(directory)];
  const scope = digest(JSON.stringify([
    await identity(entry), String(build.size), String(build.mtimeNs), home, selection, actor,
  ]));
  // /tmp is shared by GUI and model processes even if their TMPDIR settings differ.
  const profile = digest(JSON.stringify(home)).slice(0, 16);
  const root = path.join(await realpath("/tmp"), `superbee-desktop-reader-${uid}-${profile}`);
  const filename = (claim: string) => digest(scope + claim);

  async function locked<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(root, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    const info = await lstat(root);
    if (!info.isDirectory() || info.uid !== uid || (info.mode & 0o077) !== 0)
      throw new Error("The private Desktop reader directory is unavailable.");
    return withFilesystemMutationLock(root, fn);
  }
  return {
    async record(claim, payload) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-128-gcm", Buffer.from(claim, "base64url"), iv);
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"), cipher.final(),
      ]);
      const sealed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
      await locked(async () => {
        const now = Date.now();
        const files = (await readdir(root)).filter(name => /^[a-f0-9]{64}$/.test(name));
        const entries = await Promise.all(files.map(async name => {
          const file = path.join(root, name);
          return { file, written: (await lstat(file)).mtimeMs };
        }));
        entries.sort((a, b) => a.written - b.written);
        const evict = entries.filter((entry, index) =>
          entry.written <= now - TTL_MS || entries.length - index >= LIMIT
        );
        await Promise.all(evict.map(entry => unlink(entry.file)));
        await writeFile(path.join(root, filename(claim)), sealed, {
          flag: "wx", mode: 0o600,
        });
      });
    },
    async consume(claim) {
      if (!/^[A-Za-z0-9_-]{22}$/.test(claim)) return null;
      return locked(async () => {
        const file = path.join(root, filename(claim));
        const info = await lstat(file).catch((error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        if (!info) return null;
        if (!info.isFile() || info.uid !== uid || (info.mode & 0o077) !== 0)
          throw new Error("The private Desktop reader receipt is unavailable.");
        const fresh = info.mtimeMs > Date.now() - TTL_MS;
        const sealed = fresh ? await readFile(file) : null;
        await unlink(file);
        if (!sealed) return null;
        const decipher = createDecipheriv("aes-128-gcm", Buffer.from(claim, "base64url"), sealed.subarray(0, 12));
        decipher.setAuthTag(sealed.subarray(12, 28));
        const plaintext = Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
        const payload = parseDocumentPresentationPayload(JSON.parse(plaintext.toString("utf8")));
        return payload ? { payload } : null;
      });
    },
  };
}
