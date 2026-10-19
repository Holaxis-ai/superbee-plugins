import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function createWorkspace() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "package-verification-")));
  return { root, close: () => rm(root, { recursive: true, force: true }) };
}

// Only explicit values cross the boundary. Consumers own product flags and fixture credentials.
export function isolatedEnvironment({ home, values = {} }) {
  assert.equal(typeof home, "string");
  const environment = Object.create(null);
  Object.assign(environment, { HOME: home, USERPROFILE: home, TMPDIR: home, XDG_CONFIG_HOME: home,
    XDG_STATE_HOME: home, LOCALAPPDATA: home, CI: "1" });
  for (const [name, value] of Object.entries(values)) {
    assert.match(name, /^[A-Za-z_][A-Za-z0-9_]*$/);
    assert.equal(typeof value, "string");
    assert.ok(!/^(?:NODE_OPTIONS|NODE_PATH)$/i.test(name), "inherited Node injection is not admitted");
    environment[name] = value;
  }
  return environment;
}

export async function runProcess(command, args, { cwd, env, expected = 0, timeout = 30_000, maxBuffer = 2 * 1024 * 1024 } = {}) {
  assert.ok(cwd && env, "isolated subprocess requires explicit cwd and environment");
  assert.ok(Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 120_000);
  assert.ok(Number.isSafeInteger(maxBuffer) && maxBuffer > 0 && maxBuffer <= 20 * 1024 * 1024);
  let result;
  try {
    result = await exec(command, args, { cwd, env, timeout, maxBuffer });
    if (expected !== 0) throw new Error("unexpected subprocess success");
  }
  catch (error) {
    if (typeof error.code !== "number" || error.signal || error.killed || error.code !== expected) {
      throw new Error("Isolated package subprocess failed; inspect its consumer assertions locally.");
    }
    result = { stdout: error.stdout, stderr: error.stderr };
  }
  assert.ok(expected === 0 || result, "subprocess did not complete");
  return result;
}
