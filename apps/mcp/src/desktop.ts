import { isAbsolute } from "node:path";
import {
  openViewWorkspace,
  createViewWorkspaceCatalog,
  createBundlelessViewHost,
} from "@superbee/cli/view-workspace/v1";
import { desktopClaims } from "./desktop-claims.js";
import { parseDocumentPresentationPayload } from "./document-contract.js";
import { parseRegisteredViewReceipt } from "./registered-view-receipt.js";
import { startMcpStdioServer } from "./server.js";

// Existing Desktop installs keep their selected folder. Catalog access is an explicit setting.
async function main() {
  const [directory, actor, catalog, ...extra] = process.argv.slice(2);
  if (!actor?.trim() || extra.length || !["true", "false"].includes(catalog))
    throw new Error("Enter a Superbee actor and select the workspace mode.");
  if (catalog === "true") {
    await startMcpStdioServer({
      catalog: createViewWorkspaceCatalog({ actor }),
      bundleless: createBundlelessViewHost(),
    }, await desktopClaims(null, actor, "document", parseDocumentPresentationPayload));
    return;
  }
  if (!directory || !isAbsolute(directory))
    throw new Error(
      "Select a Superbee bundle directory and enter an actor in the extension settings.",
    );
  const registeredViews = await desktopClaims(directory, actor, "registered-view", parseRegisteredViewReceipt);
  const workspace = await openViewWorkspace("directory", directory, { actor });
  await startMcpStdioServer(
    workspace,
    await desktopClaims(directory, actor, "document", parseDocumentPresentationPayload),
    registeredViews,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
