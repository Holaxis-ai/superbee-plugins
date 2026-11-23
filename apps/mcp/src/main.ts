import { parseArgs } from "node:util";
import { startMcpStdioServer } from "./server.js";

import { configure, clientUsage } from "./client-registration.js";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (
    command === "install" ||
    command === "uninstall" ||
    command === "status"
  ) {
    await configure(command, args, openWorkspace);
    return;
  }
  const { values } = parseArgs({
    options: {
      dir: { type: "string" },
      workspace: { type: "string" },
      actor: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      "superbee-mcp (--dir <directory> | --workspace <catalog ID or label>) [--actor <identity>]\n" +
        clientUsage,
    );
    return;
  }
  if ((values.dir === undefined) === (values.workspace === undefined))
    throw new Error("Select exactly one workspace with --dir or --workspace.");
  await startMcpStdioServer(
    await openWorkspace(values.dir, values.workspace, values.actor),
  );
}

async function openWorkspace(dir?: string, workspace?: string, actor?: string) {
  const provider = await import("@superbee/cli/view-workspace/v1").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED" ||
        error.code === "ERR_MODULE_NOT_FOUND"
      ) {
        throw new Error(
          "Install the compatible @superbee/cli tarball with the view-workspace/v1 export alongside superbee-mcp.",
        );
      }
      throw error;
    },
  );
  return dir !== undefined
    ? provider.openViewWorkspace("directory", dir, { actor })
    : provider.openViewWorkspace("catalog", workspace!, { actor });
}
main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
