// Load the finished extension using the official MCPB configuration resolver.
// The server runs from the extracted bundle without npm or a sibling checkout.
import assert from "node:assert/strict";
import {
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
  assert.equal(await resolve({ actor: "human:desktop-test" }), undefined);
  const config = await resolve({ workspace, actor: "human:desktop-test" });
  assert.deepEqual(config, {
    command: "node",
    args: [
      path.join(extensionPath, manifest.server.entry_point),
      workspace,
      "human:desktop-test",
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
  const resolved = await client.callTool({
    name: "resolve_document",
    arguments: { claim },
  });
  assert.match(
    resolved.structuredContent.document.html,
    /Visible in <strong>Superbee<\/strong>/,
  );
  await client.close();
  await rm(extensionPath, { recursive: true });
  assert.equal(
    await readFile(path.join(workspace, "tasks/sample.md"), "utf8"),
    document,
  );
  console.log(
    "The packaged extension opened the selected document over stdio.",
  );
} finally {
  await client.close();
  await rm(scratch, { recursive: true, force: true });
}
