// Run after the normal app build has generated its two interactive screen resources.
import { packExtension } from "@anthropic-ai/mcpb";
import { build } from "esbuild";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const stage = await mkdtemp(path.join(tmpdir(), "superbee-desktop-build-"));
try {
  await copyFile("desktop/manifest.json", path.join(stage, "manifest.json"));
  await copyFile("../../LICENSE", path.join(stage, "LICENSE"));
  await copyFile("desktop/NOTICE", path.join(stage, "NOTICE"));
  await build({
    entryPoints: ["src/desktop.ts"],
    outfile: path.join(stage, "server.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });
  if (
    !(await packExtension({
      extensionPath: stage,
      outputPath: "out/superbee-experimental.mcpb",
    }))
  )
    throw new Error("Could not pack the Desktop extension.");
} finally {
  await rm(stage, { recursive: true, force: true });
}
