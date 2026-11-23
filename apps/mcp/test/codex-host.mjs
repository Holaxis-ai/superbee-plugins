import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createInterface } from "node:readline";

const [prefix, codexScript] = process.argv.slice(2);
assert.ok(prefix, "Pass the prefix containing the installed offline pair.");
const bin = path.resolve(
  prefix,
  "node_modules/@superbee/experimental-mcp/dist/superbee-mcp.mjs",
);
const scratch = await mkdtemp(path.join(tmpdir(), "Superbee Codex proof "));
const bundle = path.join(scratch, "Orchard bundle");
const env = {
  ...process.env,
  CODEX_HOME: path.join(scratch, "Codex profile"),
  SUPERBEE_NO_AUTOPULL: "1",
  SUPERBEE_NO_UPDATE_CHECK: "1",
};
for (const name of ["OPENAI_API_KEY", "CODEX_API_KEY", "OPENAI_BASE_URL"])
  delete env[name];

const command = codexScript ? process.execPath : "codex";
const codexArgs = codexScript ? [path.resolve(codexScript)] : [];
const codex = (args) =>
  execFileSync(command, [...codexArgs, ...args], { env, encoding: "utf8" });
const plugin = (operation, ...args) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [bin, operation, "--host", "codex", ...args],
      { env, encoding: "utf8" },
    ),
  );
const selector = ["--dir", bundle, "--actor", "process:codex-host-test"];
const preview = "superbee-experimental";
const existing = "superbee";

async function session(server, expectedTool, exercise) {
  const child = spawn(
    command,
    [
      ...codexArgs,
      "app-server",
      "--stdio",
      "--disable",
      "plugins",
      "--disable",
      "remote_plugin",
    ],
    {
      env,
      stdio: ["pipe", "pipe", "inherit"],
    },
  );
  const exited = once(child, "exit");
  const lines = createInterface({ input: child.stdout });
  let nextId = 0;
  function request(method, params) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        lines.off("line", receive);
        reject(new Error(`Codex timed out on ${method}`));
      }, 25000);
      function receive(line) {
        const reply = JSON.parse(line);
        if (reply.id !== id) return;
        clearTimeout(timer);
        lines.off("line", receive);
        if (reply.error) reject(new Error(`${method}: ${reply.error.message}`));
        else resolve(reply.result);
      }
      lines.on("line", receive);
      child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }
  try {
    await request("initialize", {
      clientInfo: { name: "superbee-proof", version: "1" },
      capabilities: { experimentalApi: true },
    });
    child.stdin.write('{"method":"initialized"}\n');
    const { thread } = await request("thread/start", {
      cwd: bundle,
      ephemeral: true,
    });
    const inventory = await request("mcpServerStatus/list", {
      threadId: thread.id,
    });
    assert.ok(
      inventory.data.some(
        (row) => row.name === server && row.tools[expectedTool],
      ),
      JSON.stringify(inventory.data.map((row) => row.name)),
    );
    await exercise(async (tool, args) => {
      const result = await request("mcpServer/tool/call", {
        threadId: thread.id,
        server,
        tool,
        arguments: args,
      });
      assert.ok(!result.isError, JSON.stringify(result.content));
      return result;
    });
  } finally {
    child.stdin.end();
    const shutdown = setTimeout(() => child.kill(), 5_000);
    try {
      await exited;
    } finally {
      clearTimeout(shutdown);
      lines.close();
    }
  }
}

try {
  for (const folder of [
    env.CODEX_HOME,
    bundle,
    path.join(bundle, "views-registry"),
    path.join(bundle, "views"),
  ])
    await mkdir(folder, { recursive: true });
  await writeFile(
    path.join(bundle, "index.md"),
    "---\nokf_version: '0.1'\n---\n# Orchard\n",
  );
  await writeFile(
    path.join(bundle, "lanterns.md"),
    "---\ntype: Note\ntitle: Orchard lanterns\n---\nThe orchard lantern glows copper at dusk.\n",
  );
  await writeFile(
    path.join(bundle, "views-registry/lanterns.md"),
    "---\ntype: View\ntitle: Lantern count\nentry: views/lanterns.html\naccess: bundle-read\n---\n",
  );
  await writeFile(
    path.join(bundle, "views/lanterns.html"),
    "<!doctype html><title>Lantern count</title><p>Six copper lanterns are ready.</p>\n",
  );
  const baseline = path.join(scratch, "Pre-existing MCP server.mjs");
  await writeFile(
    baseline,
    String.raw`
    import { createInterface } from "node:readline";
    for await (const line of createInterface({ input: process.stdin })) {
      const request = JSON.parse(line);
      if (request.id === undefined) continue;
      let result = {};
      if (request.method === "initialize") {
        result = { protocolVersion: request.params.protocolVersion,
          capabilities: { tools: {} }, serverInfo: { name: "existing-fixture", version: "1" } };
      } else if (request.method === "resources/list") {
        result = { resources: [] };
      } else if (request.method === "resources/templates/list") {
        result = { resourceTemplates: [] };
      } else if (request.method === "tools/list") {
        result = { tools: [{ name: "existing_status", inputSchema: { type: "object" } }] };
      } else if (request.method === "tools/call" && request.params.name === "existing_status") {
        result = { content: [{ type: "text", text: "existing fixture still responds" }] };
      }
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }) + "\n");
    }
  `,
  );
  codex(["mcp", "add", existing, "--", process.execPath, baseline]);
  const checkExisting = async (call) => {
    const { content } = await call("existing_status", {});
    assert.equal(content[0].text, "existing fixture still responds");
  };
  await session(existing, "existing_status", checkExisting);
  const config = path.join(env.CODEX_HOME, "config.toml");
  const before = await readFile(config, "utf8");
  assert.equal(plugin("status").state, "absent");
  if (process.platform === "win32") {
    const custom = path.join(scratch, "Custom Codex launcher");
    const launcher = path.join(custom, "node_modules/@openai/codex/bin");
    await mkdir(launcher, { recursive: true });
    await writeFile(path.join(launcher, "codex.js"), "");
    await writeFile(path.join(custom, "codex.cmd"), "@echo custom wrapper\r\n");
    assert.throws(
      () =>
        execFileSync(process.execPath, [bin, "status", "--host", "codex"], {
          env: { ...env, PATH: custom + path.delimiter + env.PATH },
          encoding: "utf8",
          stdio: "pipe",
        }),
      (error) => /Codex command is a custom wrapper/.test(error.stderr),
    );
  }
  assert.equal(plugin("install", ...selector).changed, true);
  assert.equal(plugin("install", ...selector).changed, false);
  assert.equal(plugin("status").state, "installed");
  async function openDocument(call) {
    const shown = await call("show_document", { docId: "lanterns" });
    const claim = shown.content[0].text.match(
      /\[agentstate-claim:v1:([\w-]+)\]/,
    )[1];
    const resolved = await call("resolve_document", { claim });
    assert.match(
      resolved.structuredContent.document.html,
      /The orchard lantern glows copper at dusk\./,
    );
  }
  await session(preview, "show_document", async (call) => {
    await openDocument(call);
    const { structuredContent } = await call("show_view", {
      viewId: "views-registry/lanterns",
    });
    assert.match(
      JSON.stringify(structuredContent),
      /Six copper lanterns are ready\./,
    );
  });
  assert.equal(plugin("uninstall").changed, true);
  assert.equal(plugin("status").state, "absent");
  assert.equal(await readFile(config, "utf8"), before);
  await session(existing, "existing_status", checkExisting);
  console.log(
    "Codex loaded the installed provider, opened a document and a View, and reopened the original connection after removal.",
  );
} finally {
  await rm(scratch, { recursive: true, force: true, maxRetries: 4 });
}
