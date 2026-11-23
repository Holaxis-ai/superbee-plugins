// Run from the built apps/mcp directory with a packed CLI library and an executable
// containing the bundled reference MCP. Neither server loads source from a sibling checkout.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import {
  history,
  hostedWorkspace,
  startHostedFixture,
} from "./fixtures/catalog-host.mjs";

const run = promisify(execFile);
const [cliTgz, referenceBin] = process.argv.slice(2);
if (
  process.argv.length !== 4 ||
  !path.isAbsolute(cliTgz) ||
  !path.isAbsolute(referenceBin)
) {
  throw new Error(
    "usage: node test/catalog-parity.mjs /absolute/cli-library.tgz /absolute/oss-superbee-cli-executable",
  );
}

const docId = "tasks/shared";
const viewId = "views-registry/editor";
const actor = "process:catalog-test";
const scratch = await mkdtemp(path.join(tmpdir(), "sb-plugin-catalog-"));

async function fixtureBundle(folder, label) {
  const files = {
    "index.md": "---\nokf_version: '0.1'\n---\n# Catalog fixture\n",
    "conventions/task.md":
      "---\ntype: Convention\ntitle: Task\ngoverns: Task\npath: tasks/\nfields:\n  required: [title, status]\n  values:\n    status: [todo, done]\n---\n",
    [docId + ".md"]:
      `---\ntype: Task\ntitle: ${label}\nstatus: todo\n---\nUnique ${label} text.\n`,
    [viewId + ".md"]:
      "---\ntype: View\ntitle: Editor\nentry: views/editor.html\naccess: bundle-propose\n---\n",
    "views/editor.html": "<!doctype html><title>Fixture editor</title>",
  };
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(folder, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
}

async function withClient(command, args, env, exercise) {
  const client = new Client({ name: "parity-fixture", version: "1" });
  try {
    await client.connect(
      new StdioClientTransport({
        command,
        args,
        cwd: scratch,
        env,
        stderr: "inherit",
      }),
    );
    const call = (name, args = {}) =>
      client.callTool({ name, arguments: args });
    const tool = async (name, args) => {
      const reply = await call(name, args);
      assert.ok(!reply.isError, name + ": " + JSON.stringify(reply.content));
      return reply;
    };
    const refused = async (name, args, message) => {
      const reply = await call(name, args);
      assert.equal(reply.isError, true, name + " must refuse");
      assert.match(reply.content[0].text, message);
      return reply.content[0].text;
    };
    return await exercise({ client, tool, refused });
  } finally {
    await client.close();
  }
}

async function surface(client, count) {
  const { tools } = await client.listTools();
  assert.equal(tools.length, count);
  const { resources } = await client.listResources();
  assert.equal(resources.length, 2);
  const resourceIds = new Map();
  for (const { uri, mimeType } of resources) {
    const [{ text }] = (await client.readResource({ uri })).contents;
    const digest = createHash("sha256").update(text).digest("hex");
    assert.ok(uri.endsWith(`/${digest}.html`), uri);
    resourceIds.set(uri, {
      base: uri.slice(0, -(digest.length + 5)),
      mimeType,
    });
  }
  return Object.fromEntries(
    tools.map((t) => {
      const resource = t._meta?.ui?.resourceUri;
      if (resource) assert.ok(resourceIds.has(resource), t.name);
      return [
        t.name,
        {
          input: t.inputSchema,
          output: t.outputSchema,
          annotations: t.annotations,
          visibility: t._meta?.ui?.visibility,
          resource: resourceIds.get(resource),
        },
      ];
    }),
  );
}

async function showDocument(tool, workspace) {
  const reply = await tool("show_document", {
    ...(workspace && { workspace }),
    docId,
  });
  const claim = reply.content[0].text.match(
    /\[agentstate-claim:v1:([\w-]+)\]/,
  )?.[1];
  assert.ok(claim, "document claim");
  return (await tool("resolve_document", { claim })).structuredContent.document;
}

async function catalogJourney({ tool, refused }, folders) {
  const page = (await tool("list_workspaces")).structuredContent;
  assert.deepEqual(
    page.workspaces.map((w) => [w.label, w.available, w.home]).sort(),
    [
      ["alpha", true, "local"],
      ["beta", true, "local"],
      [hostedWorkspace, true, "hosted"],
    ],
  );
  assert.equal(page.truncated, false);
  assert.deepEqual(
    page.reachable.map((entry) => [entry.id, entry.home]),
    [["ro.a", "hosted"]],
  );
  assert.match(page.reachable[0].command, /checkout ro\.a --host /);
  await refused(
    "show_document",
    { workspace: "ro.a", docId },
    /Could not open.*workspace/,
  );
  const [alpha, beta] = page.workspaces.filter((w) => w.home === "local");
  assert.notEqual(alpha.id, beta.id);
  for (const entry of [alpha, beta]) {
    const own = await showDocument(tool, entry.id);
    assert.ok(own.html.includes("Unique " + entry.label + " text"));
    const found = (
      await tool("search_documents", {
        workspace: entry.label,
        query: entry.label,
      })
    ).structuredContent;
    assert.deepEqual(
      found.hits.map((h) => h.id),
      [docId],
    );
    const other = entry.label === "alpha" ? "beta" : "alpha";
    assert.equal(
      (await tool("search_documents", { workspace: entry.id, query: other }))
        .structuredContent.total,
      0,
    );
  }
  await refused("show_document", { docId }, /workspace|required/i);
  await refused(
    "search_documents",
    { workspace: "missing", query: "alpha" },
    /workspace/i,
  );

  const shown = await tool("show_view", { workspace: "alpha", viewId });
  const { launchId } = shown.structuredContent.launch;
  await tool("authorize_durable_view", { launchId });
  const original = await showDocument(tool, "alpha");
  const prepared = (
    await tool("prepare_view_action", {
      launchId,
      requestId: "pinned",
      action: {
        kind: "document.set-field",
        docId,
        field: "status",
        value: "done",
        expectedVersion: original.version,
      },
    })
  ).structuredContent.result;
  assert.equal(prepared.confirmation.before, "todo");
  const other = await showDocument(tool, "beta");
  assert.match(other.html, /Unique beta text/);
  const beforeBeta = await readFile(
    path.join(folders.beta, docId + ".md"),
    "utf8",
  );
  const pinned = (
    await tool("durable_view_bridge", {
      launchId,
      request: { bridge: "v0", type: "render-document", id: "pinned", docId },
    })
  ).structuredContent.outcome.reply;
  assert.equal(pinned.result.html, original.html);
  assert.equal(
    (
      await tool("finish_view_action", {
        launchId,
        approvalToken: prepared.approvalToken,
        decision: "commit",
      })
    ).structuredContent.result.status,
    "committed",
  );
  assert.match(
    await readFile(path.join(folders.alpha, docId + ".md"), "utf8"),
    /^status: done$/m,
  );
  assert.equal(
    await readFile(path.join(folders.beta, docId + ".md"), "utf8"),
    beforeBeta,
  );
  await tool("close_durable_view", { launchId });
}

async function bundleless({ tool, refused }) {
  const input = {
    mode: "transient",
    title: "No workspace",
    html: "<!doctype html><title>No workspace</title>",
  };
  await refused("show_view", input, /workspace/i);
  const { launch } = (await tool("show_view", { ...input, access: "none" }))
    .structuredContent;
  assert.equal(launch.access, "none");
  assert.deepEqual(launch.authorization, { authorized: true, required: false });
  const hello = async (launchId) =>
    (
      await tool("durable_view_bridge", {
        launchId,
        request: { bridge: "v0", type: "hello", id: "none" },
      })
    ).structuredContent.outcome.reply;
  assert.equal((await hello(launch.launchId)).error.code, "FORBIDDEN");
  await refused(
    "save_transient_view",
    { launchId: launch.launchId, viewId },
    /bundleless transient View cannot be saved/i,
  );
  const resumed = (
    await tool("resume_durable_view", { launchId: launch.launchId })
  ).structuredContent.view.launch;
  assert.notEqual(resumed.launchId, launch.launchId);
  assert.equal(resumed.access, "none");
  assert.equal((await hello(resumed.launchId)).error.code, "FORBIDDEN");
  await tool("close_durable_view", { launchId: resumed.launchId });
  await refused(
    "durable_view_bridge",
    {
      launchId: resumed.launchId,
      request: { bridge: "v0", type: "hello", id: "closed" },
    },
    /unknown or expired/,
  );
}

async function operations({ tool, refused }, host) {
  const list = async (workspace) =>
    (await tool("list_operations", { workspace })).structuredContent;
  assert.deepEqual((await list("alpha")).operations, []);
  await refused("list_operations", { workspace: "missing" }, /NOT_FOUND/);
  await refused(
    "run_operation",
    { workspace: "alpha", operationId: history },
    /has no host operations/,
  );
  const listed = await list(hostedWorkspace);
  assert.deepEqual(
    listed.operations.map((op) => op.operationId),
    [history],
  );
  assert.equal(
    Object.hasOwn(listed.operations[0].inputJsonSchema.properties, "bundleId"),
    false,
  );
  assert.match(listed.notes.join("\n"), /folder answers it/);
  host.requests.length = 0;
  const runHistory = {
    workspace: hostedWorkspace,
    operationId: history,
    input: { documentId: "notes/via" },
  };
  const value = (await tool("run_operation", runHistory)).structuredContent;
  assert.equal(value.result.documentId, "notes/via");
  assert.equal(value.result.total, 2);
  assert.deepEqual(
    host.requests.map((r) => r.route),
    ["/sync/v1/whoami", "/sync/v1/run"],
  );
  assert.deepEqual(host.requests[1].body, {
    bundleId: hostedWorkspace,
    operationId: history,
    input: { documentId: "notes/via", bundleId: hostedWorkspace },
  });
  host.requests.length = 0;
  await refused(
    "run_operation",
    { ...runHistory, operationId: "documents.read.v1" },
    /answers documents.read.v1 from its folder/,
  );
  await refused(
    "run_operation",
    { ...runHistory, input: { bundleId: "other" } },
    /invalid_input.*another bundle/,
  );
  assert.deepEqual(host.requests, []);
  await refused(
    "run_operation",
    { ...runHistory, operationId: "documents.missing.v1" },
    /unknown_operation/,
  );
  host.setOperationsAvailable(false);
  try {
    await refused(
      "list_operations",
      { workspace: hostedWorkspace },
      /NOT_IMPLEMENTED.*does not offer operations/,
    );
    await refused(
      "run_operation",
      runHistory,
      /NOT_IMPLEMENTED.*does not offer operations/,
    );
  } finally {
    host.setOperationsAvailable(true);
  }
  return { listed, value };
}

async function exercise(command, prefix, dir, host) {
  const home = path.join(dir, "home");
  await mkdir(home, { recursive: true });
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    USERPROFILE: home,
    SUPERBEE_NO_AUTOPULL: "1",
    SUPERBEE_NO_UPDATE_CHECK: "1",
    ...host.env,
  };
  const folders = {
    alpha: path.join(dir, "alpha"),
    beta: path.join(dir, "beta"),
  };
  for (const [label, folder] of Object.entries(folders)) {
    await fixtureBundle(folder, label);
    await run(referenceBin, ["catalog", "add", label, "--dir", folder], {
      env,
      cwd: dir,
    });
  }
  await run(
    referenceBin,
    [
      "checkout",
      hostedWorkspace,
      "--host",
      host.origin,
      "--dir",
      path.join(dir, "checkout"),
      "--json",
    ],
    { env, cwd: dir },
  );
  const fixed = await withClient(
    command,
    [...prefix, "--dir", folders.alpha, "--actor", actor],
    env,
    async ({ client, tool }) => {
      assert.match((await showDocument(tool)).html, /Unique alpha text/);
      return surface(client, 14);
    },
  );
  const catalog = await withClient(
    command,
    [...prefix, "--actor", actor],
    env,
    async (session) => {
      const tools = await surface(session.client, 17);
      await catalogJourney(session, folders);
      await bundleless(session);
      return { tools, operations: await operations(session, host) };
    },
  );
  const signedOut = { ...env, SUPERBEE_CREDENTIAL_STORE: "file" };
  delete signedOut.SUPERBEE_ACCESS_TOKEN;
  host.requests.length = 0;
  await withClient(command, prefix, signedOut, async ({ tool, refused }) => {
    const listing = (await tool("list_workspaces")).structuredContent;
    assert.equal(listing.reachable, undefined);
    for (const [name, args] of [
      ["list_operations", { workspace: hostedWorkspace }],
      ["run_operation", { workspace: hostedWorkspace, operationId: history }],
    ]) {
      const message = await refused(name, args, /confirm the code ABCD-EFGH/);
      assert.ok(
        message.includes(host.origin + "/activate?user_code=ABCD-EFGH"),
      );
      assert.ok(message.includes(`call ${name} again`));
    }
  });
  assert.deepEqual(
    host.requests,
    [],
    "a signed-out caller must not run hosted operations",
  );
  return { fixed, catalog };
}

try {
  const host = await startHostedFixture();
  try {
    const expected = await exercise(
      referenceBin,
      ["mcp"],
      path.join(scratch, "reference"),
      host,
    );
    console.log(
      "Bundled reference passed the fixed-directory and catalog journeys.",
    );
    const { stdout } = await run("npm", [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      scratch,
    ]);
    const install = path.join(scratch, "install");
    await mkdir(install);
    await writeFile(path.join(install, "package.json"), '{"private":true}');
    await run(
      "npm",
      [
        "install",
        "--offline",
        "--cache",
        path.join(scratch, "empty-cache"),
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        cliTgz,
        path.join(scratch, JSON.parse(stdout)[0].filename),
      ],
      { cwd: install },
    );
    const plugin = path.join(install, "node_modules", ".bin", "superbee-mcp");
    const actual = await exercise(
      plugin,
      [],
      path.join(scratch, "plugin"),
      host,
    );
    for (const [mode, pluginTools, bundledTools] of [
      ["fixed", actual.fixed, expected.fixed],
      ["catalog", actual.catalog.tools, expected.catalog.tools],
    ]) {
      assert.deepEqual(
        Object.keys(pluginTools).sort(),
        Object.keys(bundledTools).sort(),
        mode + " tools",
      );
      for (const [name, contract] of Object.entries(bundledTools)) {
        assert.deepEqual(
          pluginTools[name],
          contract,
          `${mode} ${name} tool contract`,
        );
      }
    }
    assert.deepEqual(
      actual.catalog.operations,
      expected.catalog.operations,
      "hosted operation responses",
    );
    console.log(
      "Packed plugin matched the bundled 14 fixed and 17 catalog tool interfaces and passed workspace routing, pinned edits, bundleless launches and hosted operations.",
    );
  } finally {
    await host.close();
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}
