import { parseArgs } from "node:util";
import { startMcpStdioServer } from "./server.js";

async function main() {
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
      "superbee-mcp (--dir <directory> | --workspace <catalog ID or label>) [--actor <identity>]",
    );
    return;
  }
  if ((values.dir === undefined) === (values.workspace === undefined))
    throw new Error("Select exactly one workspace with --dir or --workspace.");
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
  const workspace =
    values.dir !== undefined
      ? await provider.openViewWorkspace("directory", values.dir, {
          actor: values.actor,
        })
      : await provider.openViewWorkspace("catalog", values.workspace!, {
          actor: values.actor,
        });
  await startMcpStdioServer(workspace);
}
main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
