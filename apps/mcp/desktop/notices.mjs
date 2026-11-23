import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// Prebundled Superbee artifacts already include their dependencies' code. Retain the
// pinned producer's notice inventory, then supplement it with the app's actual inputs.
export function bundledPackages(metafile) {
  const roots = new Set();
  for (const output of Object.values(metafile.outputs)) {
    for (const [input, contribution] of Object.entries(output.inputs)) {
      const root = input.match(
        /^(.*\bnode_modules\/(?:@[^/]+\/)?[^/]+)\//,
      )?.[1];
      if (root && contribution.bytesInOutput > 0) roots.add(root);
    }
  }
  return [...roots];
}

export async function desktopNotices(roots) {
  let text = await readFile("node_modules/superbee/dist/THIRD-PARTY-NOTICES.txt", "utf8");
  for (const root of [...new Set(roots)].sort()) {
    const { name, version } = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    );
    const id = name + "@" + version;
    if (
      ["@superbee/cli", "@superbee/core", "@superbee/view-host"].includes(
        name,
      ) ||
      text.includes("\n" + id + "\n")
    )
      continue;
    const files = (await readdir(root))
      .filter((file) =>
        /^(license|licence|copying|notice)([.-].*)?$/i.test(file),
      )
      .sort();
    if (!files.length) throw new Error("Missing third-party notices for " + id);
    text += "\n" + id + "\n";
    for (const file of files)
      text += "\n" + (await readFile(path.join(root, file), "utf8")) + "\n";
  }
  return text;
}
