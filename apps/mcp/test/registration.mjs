// Exercise the installed executable using only synthetic user configurations.
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
const exec = promisify(execFile);

export async function registrationAcceptance(bin, scratch, bundle) {
  const home = path.join(scratch, "registration home");
  const tools = path.join(home, "bin");
  await mkdir(tools, { recursive: true });
  const environment = {
    HOME: home,
    PATH: [tools, path.dirname(process.execPath), "/usr/bin", "/bin"].join(":"),
    XDG_CONFIG_HOME: path.join(home, "config"),
    CODEX_HOME: path.join(home, ".codex"),
    CLAUDE_CONFIG_DIR: path.join(home, "claude user"),
  };
  const name = "superbee-experimental";
  const selector = ["--dir", bundle, "--actor", "human:tester"];
  const run = (args, extra = {}, wantError) => {
    const result = spawnSync(bin, args, {
      encoding: "utf8",
      env: { ...environment, ...extra },
      cwd: home,
    });
    if (wantError) {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, wantError);
      assert.equal(result.stdout, "");
      return;
    }
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const claudeDir = environment.CLAUDE_CONFIG_DIR;
  await mkdir(claudeDir);
  const claudeFile = path.join(claudeDir, ".claude.json");
  // The native client is the writer for Claude Code. Verify the exact user-scope argument contract.
  await writeFile(
    path.join(tools, "claude"),
    `#!${process.execPath}
import fs from "node:fs";
import assert from "node:assert/strict";
const [verb, op, ...args] = process.argv.slice(2);
assert.equal(verb,"mcp");
const file=process.env.CLAUDE_CONFIG_DIR+"/.claude.json";
const root=JSON.parse(fs.readFileSync(file));
if(op==="add"){
  assert.deepEqual(args.slice(0,6),["--scope","user","--transport","stdio","${name}","--"]);
  root.mcpServers["${name}"]={type:"stdio",command:args[6],args:args.slice(7),env:{}};
}else{
  assert.equal(op,"remove");
  assert.deepEqual(args,["--scope","user","${name}"]);
  delete root.mcpServers["${name}"];
}
fs.writeFileSync(file,JSON.stringify(root));
`,
    { mode: 0o755 },
  );
  const foreign = { command: "/bundled/superbee", args: ["mcp"] };
  const standard = path.join(environment.XDG_CONFIG_HOME, "opencode");
  const desktopDir = path.join(home, "Library/Application Support/Claude");
  for (const dir of [standard, desktopDir])
    await mkdir(dir, { recursive: true });
  const desktopShim = path.join(scratch, "simulate-desktop.cjs");
  await writeFile(
    desktopShim,
    'Object.defineProperty(process,"platform",{value:"darwin"});',
  );
  for (const [host, file, initial, extra] of [
    ["claude-code", claudeFile, { mcpServers: { superbee: foreign } }, {}],
    [
      "claude-desktop",
      path.join(desktopDir, "claude_desktop_config.json"),
      { mcpServers: { superbee: foreign } },
      { NODE_OPTIONS: "--require=" + desktopShim },
    ],
    [
      "opencode",
      path.join(standard, "opencode.jsonc"),
      { mcp: { superbee: foreign } },
      {},
    ],
    [
      "opencode",
      path.join(home, "custom.jsonc"),
      { mcp: { servers: { superbee: foreign } } },
      { OPENCODE_CONFIG: path.join(home, "custom.jsonc") },
    ],
  ]) {
    const nativeJson = host !== "opencode";
    const text = JSON.stringify(initial, null, 2);
    await writeFile(
      file,
      nativeJson ? text : "// retained client settings\n" + text,
    );
    const cfg = () => readFile(file, "utf8");
    const parse = (t) => JSON.parse(t.replace(/^\/\/[^\n]*\n/, ""));
    const entries = (r) => r.mcpServers ?? r.mcp.servers ?? r.mcp;
    assert.equal(run(["status", "--host", host], extra).state, "absent");
    assert.equal(
      run(["install", "--host", host, ...selector], extra).changed,
      true,
    );
    const installed = await cfg();
    const entry = entries(parse(installed))[name];
    assert.ok(entry);
    assert.deepEqual(entries(parse(installed)).superbee, foreign);
    assert.equal(
      run(["install", "--host", host, ...selector], extra).changed,
      false,
    );
    run(
      ["install", "--host", host, ...selector.slice(0, -1), "human:other"],
      extra,
      /Uninstall the existing/,
    );
    assert.equal(await cfg(), installed);
    assert.equal(run(["status", "--host", host], extra).state, "installed");
    for (const conflict of [
      null,
      { url: "https://example.invalid" },
      { ...entry, extra: true },
    ]) {
      const changed = parse(installed);
      entries(changed)[name] = conflict;
      const bytes = JSON.stringify(changed);
      await writeFile(file, bytes);
      assert.equal(run(["status", "--host", host], extra).state, "foreign");
      run(
        ["uninstall", "--host", host],
        extra,
        /different launcher or client settings/,
      );
      run(
        ["install", "--host", host, ...selector],
        extra,
        /different launcher or client settings/,
      );
      assert.equal(await cfg(), bytes);
    }
    await writeFile(file, installed);
    assert.equal(run(["uninstall", "--host", host], extra).changed, true);
    assert.equal(run(["uninstall", "--host", host], extra).changed, false);
    const final = await cfg();
    assert.deepEqual(parse(final), initial);
    if (!nativeJson) assert.ok(final.startsWith("// retained client settings"));
  }
  run(
    ["install", "--host", "opencode", ...selector, "--workspace", "other"],
    {},
    /superbee-mcp install/,
  );
  run(
    ["install", "--host", "codex", "--host", "opencode", ...selector],
    {},
    /Repeated --host/,
  );
  run(
    ["uninstall", "--host", "opencode"],
    { OPENCODE_CONFIG_CONTENT: "{}" },
    /inline configuration/,
  );
  const codexFile = path.join(environment.CODEX_HOME, "config.toml");
  await mkdir(environment.CODEX_HOME);
  const bundled = '[mcp_servers.superbee]\ncommand = "bundled"\n';
  await writeFile(codexFile, bundled);
  await writeFile(
    path.join(tools, "codex"),
    `#!${process.execPath}
import fs from "node:fs";
import assert from "node:assert/strict";
const [verb,op,...args]=process.argv.slice(2);
assert.equal(verb,"mcp");
const file=process.env.CODEX_HOME+"/config.toml";
const text=fs.readFileSync(file,"utf8");
const marker="[mcp_servers.superbee-experimental]"; const i=text.indexOf(marker);
if(op==="add"){
  assert.deepEqual(args.slice(0,2),["superbee-experimental","--"]);
  fs.appendFileSync(file,marker+"\\ncommand = "+JSON.stringify(args[2])+"\\nargs = "+JSON.stringify(args.slice(3))+"\\n");
}else if(op==="remove"){
  assert.deepEqual(args,["superbee-experimental"]); fs.writeFileSync(file,text.slice(0,i));
}else{
  assert.equal(op,"list"); assert.deepEqual(args,["--json"]);
  const lines=text.slice(i).split("\\n");
  console.log(JSON.stringify(i<0?[]:[{name:"superbee-experimental",enabled:true,transport:{type:"stdio",command:JSON.parse(lines[1].slice(10)),args:JSON.parse(lines[2].slice(7))}}]));
}
`,
    { mode: 0o755 },
  );
  assert.equal(run(["install", "--host", "codex", ...selector]).changed, true);
  const cleanCodex = await readFile(codexFile, "utf8");
  await writeFile(
    codexFile,
    cleanCodex + 'enabled_tools = ["show_document"]\n',
  );
  run(["uninstall", "--host", "codex"], {}, /different launcher/);
  assert.equal(
    await readFile(codexFile, "utf8"),
    cleanCodex + 'enabled_tools = ["show_document"]\n',
  );
  await writeFile(codexFile, cleanCodex);
  assert.equal(run(["install", "--host", "codex", ...selector]).changed, false);
  assert.equal(run(["uninstall", "--host", "codex"]).changed, true);
  assert.equal(await readFile(codexFile, "utf8"), bundled);
  const override = path.join(home, "custom.jsonc");
  const v2Source = await readFile(override, "utf8");
  await writeFile(path.join(tools, "opencode"), "#!/bin/sh\necho 1.5.0\n", {
    mode: 0o755,
  });
  run(
    ["install", "--host", "opencode", ...selector],
    { OPENCODE_CONFIG: override },
    /v1 cannot load a v2/,
  );
  assert.equal(await readFile(override, "utf8"), v2Source);
  const manualClaude = { command: bin, args: selector };
  const writeClaude = (entry) =>
    writeFile(
      claudeFile,
      JSON.stringify({ mcpServers: { superbee: foreign, [name]: entry } }),
    );
  await writeClaude({ ...manualClaude, custom: true });
  run(["uninstall", "--host", "claude-code"], {}, /different launcher/);
  await writeClaude(manualClaude);
  assert.equal(run(["status", "--host", "claude-code"]).state, "installed");
  assert.equal(run(["uninstall", "--host", "claude-code"]).changed, true);
  assert.deepEqual(JSON.parse(await readFile(claudeFile, "utf8")).mcpServers, {
    superbee: foreign,
  });
  // Both standard config files contribute to a single client namespace.
  const candidates = ["opencode.json", "opencode.jsonc"].map((file) =>
    path.join(standard, file),
  );
  for (const file of candidates) await writeFile(file, '{"mcp":{}}');
  const outcomes = await Promise.allSettled(
    candidates.map((file) =>
      exec(bin, ["install", "--host", "opencode", ...selector], {
        cwd: home,
        env: { ...environment, OPENCODE_CONFIG: file },
      }),
    ),
  );
  assert.ok(outcomes.some((result) => result.status === "fulfilled"));
  const sources = await Promise.all(
    candidates.map(async (file) => JSON.parse(await readFile(file, "utf8"))),
  );
  assert.equal(
    sources.filter((source) => Object.hasOwn(source.mcp, name)).length,
    1,
  );
  assert.equal(run(["uninstall", "--host", "opencode"]).changed, true);
  // Preserve a manually installed entry from the documented initial preview.
  const legacyFile = path.join(standard, "opencode.jsonc");
  await writeFile(
    legacyFile,
    JSON.stringify({
      mcp: {
        [name]: { type: "local", command: [bin, ...selector], enabled: true },
      },
    }),
  );
  assert.equal(run(["uninstall", "--host", "opencode"]).changed, true);
  await writeFile(legacyFile, '{"mcp":{},"mcp":{}}');
  run(["install", "--host", "opencode", ...selector], {}, /Duplicate key/);
  assert.equal(await readFile(legacyFile, "utf8"), '{"mcp":{},"mcp":{}}');
}
