// Run from apps/mcp after building. The client communicates with the installed binary over stdio.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  appendFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const [cliTgz, mode] = process.argv.slice(2);
if (!cliTgz || (mode && mode !== "--browser"))
  throw new Error(
    "usage: node test/acceptance.mjs <compatible-cli.tgz> [--browser]",
  );
const cli = path.resolve(cliTgz);
const scratch = await mkdtemp(path.join(tmpdir(), "sb-mcp-plugin-"));
const install = path.join(scratch, "install");
const bundle = path.join(scratch, "bundle");
const home = path.join(scratch, "home");
const docId = "tasks/one";
const viewId = "views-registry/editor";
const target = path.join(bundle, docId + ".md");
const client = new Client({ name: "fixture-mcp-host", version: "1" });
const tool = async (name, args) => {
  const reply = await client.callTool({ name, arguments: args });
  assert.ok(!reply.isError, JSON.stringify(reply.content));
  return reply;
};
const read = () => readFile(target, "utf8");
async function document() {
  const shown = await tool("show_document", { docId });
  const claim = shown.content[0].text.match(
    /\[agentstate-claim:v1:([\w-]+)\]/,
  )[1];
  return (await tool("resolve_document", { claim })).structuredContent.document;
}
try {
  for (const dir of [
    install,
    home,
    "conventions",
    "tasks",
    "views",
    "views-registry",
  ]) {
    await mkdir(path.isAbsolute(dir) ? dir : path.join(bundle, dir), {
      recursive: true,
    });
  }
  const fixture = async (name, text) =>
    writeFile(path.join(bundle, name), text);
  await fixture("index.md", "---\nokf_version: '0.1'\n---\n# Fixture\n");
  await fixture(
    "conventions/task.md",
    "---\ntype: Convention\ntitle: Task\ngoverns: Task\npath: tasks/\nfields:\n  required: [title, status]\n  values:\n    status: [todo, done]\n---\n",
  );
  await fixture(
    "tasks/one.md",
    "---\ntype: Task\ntitle: One\nstatus: todo\n---\nA **formatted** task.\n",
  );
  await fixture(
    viewId + ".md",
    "---\ntype: View\ntitle: Editor\nentry: views/editor.html\naccess: bundle-propose\n---\n",
  );
  await fixture(
    "views/editor.html",
    "<!doctype html><title>Registered editor</title><p>Registered editor</p>",
  );
  const [packed] = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch],
      { encoding: "utf8" },
    ),
  );
  await writeFile(path.join(install, "package.json"), '{"private":true}');
  execFileSync(
    "npm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      cli,
      path.join(scratch, packed.filename),
    ],
    { cwd: install },
  );
  const bin = path.join(install, "node_modules/.bin/superbee-mcp");
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [bin, "--dir", bundle, "--actor", "process:plugin-test"],
      cwd: install,
      env: {
        PATH: process.env.PATH,
        HOME: home,
        USERPROFILE: home,
        SUPERBEE_NO_AUTOPULL: "1",
        SUPERBEE_NO_UPDATE_CHECK: "1",
      },
      stderr: "inherit",
    }),
  );
  const tools = (await client.listTools()).tools;
  const resources = new Map();
  for (const r of (await client.listResources()).resources) {
    const { text } = (await client.readResource({ uri: r.uri })).contents[0];
    assert.ok(r.uri.includes(createHash("sha256").update(text).digest("hex")));
    resources.set(r.uri, text);
  }
  assert.equal(resources.size, 2);
  for (const n of [
    "authorize_durable_view",
    "prepare_view_action",
    "finish_view_action",
    "durable_view_bridge",
  ]) {
    assert.deepEqual(tools.find((t) => t.name === n)._meta.ui.visibility, [
      "app",
    ]);
  }
  const original = await document();
  assert.match(original.html, /<strong>formatted<\/strong>/);
  assert.ok(
    (await tool("list_views", {})).structuredContent.views.some(
      (view) => view.id === viewId,
    ),
  );
  assert.match(
    JSON.stringify(
      (await tool("search_documents", { query: "formatted" }))
        .structuredContent,
    ),
    /tasks\/one/,
  );
  const registered = (await tool("show_view", { viewId })).structuredContent;
  const launchId = registered.launch.launchId;
  const bridge = async (id) =>
    (
      await tool("durable_view_bridge", {
        launchId: id,
        request: { bridge: "v0", type: "render-document", id: "r", docId },
      })
    ).structuredContent.outcome.reply;
  assert.equal((await bridge(launchId)).type, "error");
  await tool("authorize_durable_view", { launchId });
  assert.equal((await bridge(launchId)).result.html, original.html);
  const prepare = async (id, value) =>
    (
      await tool("prepare_view_action", {
        launchId: id,
        requestId: "field",
        action: {
          kind: "document.set-field",
          field: "status",
          docId,
          value,
          expectedVersion: (await document()).version,
        },
      })
    ).structuredContent.result;
  const finish = async (id, result, decision) =>
    (
      await tool("finish_view_action", {
        launchId: id,
        approvalToken: result.approvalToken,
        decision,
      })
    ).structuredContent.result;
  const pending = await prepare(launchId, "done");
  assert.equal(pending.confirmation.before, "todo");
  assert.match(await read(), /^status: todo$/m);
  assert.equal((await finish(launchId, pending, "commit")).status, "committed");
  assert.match(await read(), /^status: done$/m);
  const temporary = (
    await tool("show_view", {
      mode: "transient",
      title: "Temporary editor",
      html: "<!doctype html><title>Temp</title>",
      access: "bundle-propose",
    })
  ).structuredContent;
  const tempId = temporary.launch.launchId;
  await tool("authorize_durable_view", { launchId: tempId });
  assert.equal(
    (await bridge(tempId)).result.document.version,
    (await document()).version,
  );
  const stale = await prepare(tempId, "todo");
  await appendFile(target, "Concurrent edit.\n");
  const newer = await read();
  assert.equal((await finish(tempId, stale, "commit")).status, "conflict");
  assert.equal(await read(), newer);
  const confirmed = await prepare(tempId, "todo");
  assert.equal((await finish(tempId, confirmed, "commit")).status, "committed");
  for (const id of [tempId, launchId]) {
    await tool("close_durable_view", { launchId: id });
    assert.equal((await bridge(id)).type, "error");
  }
  // Add a label with the installed public CLI and open it from a second plugin process.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import {main} from '@superbee/cli'; await main(['catalog','add','proof','--dir',process.argv[1]]);",
      bundle,
    ],
    {
      cwd: install,
      env: {
        PATH: process.env.PATH,
        HOME: home,
        USERPROFILE: home,
        SUPERBEE_NO_AUTOPULL: "1",
        SUPERBEE_NO_UPDATE_CHECK: "1",
      },
    },
  );
  const named = new Client({ name: "catalog-host", version: "1" });
  try {
    await named.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [bin, "--workspace", "proof"],
        cwd: install,
        env: {
          PATH: process.env.PATH,
          HOME: home,
          USERPROFILE: home,
          SUPERBEE_NO_AUTOPULL: "1",
          SUPERBEE_NO_UPDATE_CHECK: "1",
        },
      }),
    );
    const shown = await named.callTool({
      name: "show_document",
      arguments: { docId },
    });
    assert.ok(!shown.isError);
    assert.match(shown.content[0].text, /One/);
  } finally {
    await named.close();
  }
  if (mode === "--browser") {
    const { exerciseScreens } = await import("./screens.mjs");
    await exerciseScreens({
      client,
      tool,
      tools,
      resources,
      docId,
      viewId,
      document,
      read,
    });
  }
  console.log(
    "Passed packed plugin installation, both resources, document, search, registered and temporary Views, confirmed edits, stale refusal and close.",
  );
} finally {
  try {
    await client.close();
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
