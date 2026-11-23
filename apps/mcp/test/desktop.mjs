// Load the finished extension using the official MCPB configuration resolver.
// The server runs from the extracted bundle without npm or a sibling checkout.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getMcpConfigForManifest, unpackExtension } from "@anthropic-ai/mcpb";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const artifact = process.argv[2] ?? "out/superbee-experimental.mcpb";
const scratch = await mkdtemp(path.join(tmpdir(), "superbee-desktop-"));
const extensionPath = path.join(scratch, "Installed Extensions", "Superbee");
const workspace = path.join(scratch, "One & Two");
const home = path.join(scratch, "user");
const client = new Client({ name: "desktop-bundle-test", version: "1" });
const document =
  "---\ntype: Task\ntitle: Desktop sample\n---\nVisible in **Superbee**.\n";
try {
  await mkdir(home);
  await mkdir(path.join(workspace, "tasks"), { recursive: true });
  await writeFile(
    path.join(workspace, "index.md"),
    "---\nokf_version: '0.1'\n---\n# Test\n",
  );
  await writeFile(path.join(workspace, "tasks/sample.md"), document);
  assert.ok(
    await unpackExtension({
      mcpbPath: artifact,
      outputDir: extensionPath,
      silent: true,
    }),
  );
  assert.deepEqual((await readdir(extensionPath)).sort(), [
    "LICENSE",
    "NOTICE",
    "THIRD-PARTY-NOTICES.txt",
    "manifest.json",
    "server.mjs",
  ]);
  const notices = await readFile(
    path.join(extensionPath, "THIRD-PARTY-NOTICES.txt"),
    "utf8",
  );
  for (const notice of [
    "Copyright (c) 2025 Colin McDonnell",
    "@modelcontextprotocol/ext-apps@",
    "react@",
    "pkce-challenge@",
  ])
    assert.ok(notices.includes(notice), "Missing bundled notice: " + notice);
  const manifest = JSON.parse(
    await readFile(path.join(extensionPath, "manifest.json"), "utf8"),
  );
  const resolve = (userConfig) =>
    getMcpConfigForManifest({
      manifest,
      extensionPath,
      userConfig,
      systemDirs: { HOME: home },
      pathSeparator: path.sep,
    });
  assert.equal(await resolve({ workspace }), undefined);

  const missingFolder = await resolve({ actor: "human:desktop-test" });
  const refused = spawnSync(process.execPath, missingFolder.args, {
    cwd: extensionPath,
    env: { HOME: home, PATH: path.dirname(process.execPath) },
    input: "",
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Select a Superbee bundle directory/);

  const config = await resolve({ workspace, actor: "human:desktop-test" });
  assert.deepEqual(config, {
    command: "node",
    args: [
      path.join(extensionPath, manifest.server.entry_point),
      workspace,
      "human:desktop-test",
      "false",
    ],
  });
  await client.connect(
    new StdioClientTransport({
      ...config,
      cwd: extensionPath,
      env: {
        PATH: path.dirname(process.execPath),
        HOME: home,
        USERPROFILE: home,
      },
      stderr: "inherit",
    }),
  );
  assert.ok(
    (await client.listTools()).tools.some(
      (tool) => tool.name === "show_document",
    ),
  );
  const shown = await client.callTool({
    name: "show_document",
    arguments: { docId: "tasks/sample" },
  });
  assert.ok(!shown.isError, JSON.stringify(shown.content));
  const claim = shown.content[0].text.match(
    /\[agentstate-claim:v1:([\w-]+)\]/,
  )[1];
  // Desktop can route the model invocation and the iframe's tool call to separate processes.
  // Retain the exact shown revision even if the document changes before its reader appears.
  const changed = document.replace("Visible in **Superbee**.", "Edited after the receipt.");
  await writeFile(path.join(workspace, "tasks/sample.md"), changed);
  async function withReader(installation, folder, actor, run) {
    const reader = new Client({ name: "desktop-reader-test", version: "1" });
    try {
      await reader.connect(new StdioClientTransport({
        command: process.execPath,
        args: [path.join(installation, manifest.server.entry_point), folder, actor, "false"],
        cwd: installation,
        env: { HOME: home, USERPROFILE: home, PATH: path.dirname(process.execPath) },
      }));
      return await run(reader);
    } finally {
      await reader.close();
    }
  }
  const redeem = (reader, claim) => reader.callTool({ name: "resolve_document", arguments: { claim } });
  const readOn = (install, folder, actor) => withReader(install, folder, actor, reader => redeem(reader, claim));
  const secondFolder = path.join(scratch, "Other workspace");
  const secondInstall = path.join(scratch, "Other install");
  await cp(workspace, secondFolder, { recursive: true });
  await cp(extensionPath, secondInstall, { recursive: true });
  for (const [install, folder, actor] of [
    [extensionPath, workspace, "human:another-person"],
    [extensionPath, secondFolder, "human:desktop-test"],
    [secondInstall, workspace, "human:desktop-test"],
  ]) {
    const refused = await readOn(install, folder, actor);
    assert.equal(refused.isError, true);
    assert.match(refused.content[0].text, /Unknown, expired, or already-redeemed/);
  }
  // Fill and overflow a second registration while the first reader's receipt is pending.
  await withReader(extensionPath, secondFolder, "human:desktop-test", async other => {
    const receipts = [];
    for (let index = 0; index < 17; index++) {
      const result = await other.callTool({ name: "show_document", arguments: { docId: "tasks/sample" } });
      assert.ok(!result.isError);
      receipts.push(result.content[0].text.match(/\[agentstate-claim:v1:([\w-]+)\]/)[1]);
    }
    assert.equal((await redeem(other, receipts.shift())).isError, true);
    for (const pending of receipts) assert.ok((await redeem(other, pending)).structuredContent.document);
  });
  const read = () => readOn(extensionPath, workspace, "human:desktop-test");
  const results = await Promise.all([read(), read()]);
  assert.equal(results.filter(result => result.isError).length, 1);
  const resolved = results.find(result => !result.isError);
  assert.match(resolved.structuredContent.document.html, /Visible in <strong>Superbee<\/strong>/);
  assert.ok(shown.content[0].text.includes(resolved.structuredContent.document.version));
  assert.equal((await read()).isError, true);
  await client.close();
  const catalogConfig = await resolve({
    actor: "human:desktop-test",
    catalog: true,
  });
  const catalogClient = new Client({
    name: "desktop-catalog-test",
    version: "1",
  });
  try {
    await catalogClient.connect(
      new StdioClientTransport({
        ...catalogConfig,
        cwd: extensionPath,
        env: { HOME: home, PATH: path.dirname(process.execPath) },
      }),
    );
    const listed = await catalogClient.callTool({
      name: "list_workspaces",
      arguments: {},
    });
    assert.deepEqual(listed.structuredContent.workspaces, []);
  } finally {
    await catalogClient.close();
  }
  await rm(extensionPath, { recursive: true });
  assert.equal(
    await readFile(path.join(workspace, "tasks/sample.md"), "utf8"),
    changed,
  );
  console.log(
    "The packaged Desktop extension displayed the selected revision across stdio processes.",
  );
} finally {
  await client.close();
  await rm(scratch, { recursive: true, force: true });
}
