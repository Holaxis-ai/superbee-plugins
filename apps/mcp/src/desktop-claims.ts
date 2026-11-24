// Claude Desktop can use different stdio servers for model and iframe calls. Only ciphertext
// enters temporary storage. A receipt carries its own key and is bound to the issuing purpose.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, opendir, readFile, realpath, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withFilesystemMutationLock } from "@superbee/core";
import type { ClaimStore } from "./pending-launches.js";

const TTL_MS = 10 * 60_000;
const LIMIT = 16;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function identity(location: string) {
  const canonical = await realpath(location);
  const info = await stat(canonical, { bigint: true });
  return [canonical, String(info.dev), String(info.ino)];
}

export async function desktopClaims<T>(
  directory: string | null, actor: string, purpose: "document" | "registered-view",
  parse: (value: unknown) => T | null,
): Promise<ClaimStore<T>> {
  const uid = process.getuid!(); // The Desktop extension is distributed for macOS.
  const entry = fileURLToPath(import.meta.url);
  const build = await stat(entry, { bigint: true });
  const home = await identity(homedir());
  const selection = directory === null ? ["catalog"] : ["directory", ...await identity(directory)];
  const scope = digest(JSON.stringify([
    await identity(entry), String(build.size), String(build.mtimeNs), home, selection, actor, purpose,
  ]));
  // /tmp is shared by GUI and model processes even if their TMPDIR settings differ.
  const profile = digest(JSON.stringify(home)).slice(0, 16);
  const root = path.join(await realpath("/tmp"), `superbee-desktop-reader-${uid}-${profile}`);
  const prefix = scope + ".";
  const filename = (claim: string) => prefix + digest(claim);

  async function locked<T>(fn: () => Promise<T>): Promise<T> {
    return withFilesystemMutationLock(root, async () => {
      await mkdir(root, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
      const info = await lstat(root);
      if (!info.isDirectory() || info.uid !== uid || (info.mode & 0o077) !== 0)
        throw new Error("The private Desktop reader directory is unavailable.");
      try {
        return await fn();
      } finally {
        // The lock lives outside this directory. Its last consumer can remove the empty
        // directory without racing a writer that is about to publish the next receipt.
        await rmdir(root).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOTEMPTY" && error.code !== "EEXIST") throw error;
        });
      }
    });
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
        const cutoff = Date.now() - TTL_MS;
        const own: { file: string; written: number }[] = [];
        for await (const { name } of await opendir(root)) {
          // Older previews used a single hash. Sweep those after expiry as well.
          if (!/^(?:[a-f0-9]{64}\.)?[a-f0-9]{64}$/.test(name)) continue;
          const file = path.join(root, name);
          const written = (await lstat(file)).mtimeMs;
          if (written <= cutoff) await unlink(file);
          else if (name.startsWith(prefix)) own.push({ file, written });
        }
        own.sort((a, b) => b.written - a.written);
        for (const { file } of own.slice(LIMIT - 1)) await unlink(file);
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
        const payload = parse(JSON.parse(plaintext.toString("utf8")));
        return payload ? { payload } : null;
      });
    },
  };
}
