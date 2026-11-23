import type { ViewWorkspace } from "@superbee/cli/view-workspace/v1";
import type { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";

export const SEARCH_DOCUMENTS_TOOL_NAME = "search_documents";
const requestSchema = z
  .object({
    query: z.string(),
    match: z.enum(["auto", "all", "any"]).optional(),
    type: z.string().optional(),
    tag: z.string().optional(),
    prefix: z.string().optional(),
    limit: z.number().int().optional(),
    cursor: z.string().optional(),
    facets: z.array(z.enum(["type", "tags"])).optional(),
  })
  .strict();

export function registerSearchTool(
  server: McpServer,
  workspace: ViewWorkspace,
): void {
  server.registerTool(
    SEARCH_DOCUMENTS_TOOL_NAME,
    {
      title: "Search Superbee documents",
      description:
        "Search current local document text, including unsent edits. Results use the core search contract; cursors require the same unchanged corpus and filters.",
      inputSchema: requestSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const result = await workspace.search(input);
        const text = JSON.stringify(result);
        return {
          content: [{ type: "text", text }],
          structuredContent: { ...result },
        };
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Could not search the selected workspace.";
        return { isError: true, content: [{ type: "text", text }] };
      }
    },
  );
}
