import { build } from "esbuild";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("src/generated", { recursive: true });
for (const [name, marker, symbol] of [
  ["view", "<!-- ASLITE_MCP_APP_SCRIPT -->", "MCP_VIEW_HTML"],
  ["document", "<!-- SUPERBEE_DOCUMENT_APP_SCRIPT -->", "MCP_DOCUMENT_HTML"],
]) {
  const template = await readFile(`src/${name}.html`, "utf8");
  const result = await build({
    entryPoints: [`src/${name}.ts`],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
    minify: true,
    write: false,
  });
  const script = result.outputFiles[0].text.replaceAll(
    "</script",
    "<\\/script",
  );
  if (!template.includes(marker))
    throw new Error(`Missing script placeholder for ${name}`);
  const html = template.replace(marker, () => `<script>${script}</script>`);
  await writeFile(
    `src/generated/${name}-html.generated.ts`,
    `export const ${symbol} = ${JSON.stringify(html)};\n`,
  );
}
const outfile = "dist/superbee-mcp.mjs";
await build({
  entryPoints: ["src/main.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["@superbee/cli/*"],
  alias: { "jsonc-parser": "jsonc-parser/lib/esm/main.js" },
  banner: {
    js: "#!/usr/bin/env node\nimport {createRequire as makeRequire} from 'node:module'; const require=makeRequire(import.meta.url);",
  },
});
await chmod(outfile, 0o755);
