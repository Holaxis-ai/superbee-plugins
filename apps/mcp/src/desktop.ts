import { isAbsolute } from "node:path";
import { openViewWorkspace } from "@superbee/cli/view-workspace/v1";
import { startMcpStdioServer } from "./server.js";

// Desktop supplies these two values from required extension settings.
async function main() {
  const [directory, actor, ...extra] = process.argv.slice(2);
  if (!directory || !isAbsolute(directory) || !actor?.trim() || extra.length)
    throw new Error(
      "Select a Superbee bundle directory and enter an actor in the extension settings.",
    );
  const workspace = await openViewWorkspace("directory", directory, { actor });
  await startMcpStdioServer(workspace);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
