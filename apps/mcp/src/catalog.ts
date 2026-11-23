import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer, CallToolResult } from "@modelcontextprotocol/server";
import { stripHostText } from "@superbee/core";
import {
  MAX_WORKSPACE_CATALOG_PAGE,
  WORKSPACE_HOMES,
  type ViewWorkspaceCatalog,
  type WorkspaceSummary,
} from "@superbee/cli/view-workspace/v1";
import { z } from "zod";
import { registerOperationTools } from "./operations.js";

const WORKSPACE_ID_PATTERN = /^bnd_[0-9a-f]{32}$/;
const WORKSPACE_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

const workspaceSummarySchema = z
  .object({
    id: z.string().regex(WORKSPACE_ID_PATTERN),
    label: z
      .string()
      .regex(WORKSPACE_LABEL_PATTERN)
      .refine((value) => !value.startsWith("bnd_")),
    displayName: z.string().trim().min(1).max(200).optional(),
    available: z.boolean(),
    home: z.enum(WORKSPACE_HOMES).optional(),
  })
  .strict();

/** Text from the host's side of a listing, as `stripHostText` makes it safe to show; empty is refused. */
const hostText = (max: number) =>
  z
    .string()
    .transform((value) => stripHostText(value, max))
    .pipe(z.string().min(1));
/** Text that must already be plain (an id, a command): refused, never cut or rewritten, when it is not. */
const plainText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => stripHostText(value, max) === value);

const reachableWorkspaceSchema = z
  .object({
    id: plainText(256),
    name: hostText(200),
    home: z.enum(WORKSPACE_HOMES),
    location: hostText(200),
    command: plainText(400),
  })
  .strict();

/** At most this many reachable workspaces with no folder here, and notes, are listed. */
export const MAX_REACHABLE_WORKSPACES = 50;
const MAX_REACHABLE_NOTES = 10;

const listWorkspacesOutputSchema = z.object({
  workspaces: z.array(workspaceSummarySchema),
  shown: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
  reachable: z
    .array(reachableWorkspaceSchema)
    .max(MAX_REACHABLE_WORKSPACES)
    .optional(),
  reachable_notes: z.array(z.string()).max(MAX_REACHABLE_NOTES).optional(),
});

function normalizeWorkspaceSummaries(
  listed: readonly WorkspaceSummary[],
): WorkspaceSummary[] {
  const workspaces = listed
    .map((entry) => {
      const parsed = workspaceSummarySchema.parse(entry);
      if (parsed.displayName && /[\\/]/.test(parsed.displayName)) {
        const { displayName: _omitted, ...safe } = parsed;
        return safe;
      }
      return parsed;
    })
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label) ||
        left.id.localeCompare(right.id),
    );
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const workspace of workspaces) {
    if (ids.has(workspace.id) || labels.has(workspace.label)) {
      throw new Error("workspace resolver returned ambiguous identities");
    }
    ids.add(workspace.id);
    labels.add(workspace.label);
  }
  return workspaces;
}

export const workspaceSelectorSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (value) =>
      WORKSPACE_ID_PATTERN.test(value) ||
      (WORKSPACE_LABEL_PATTERN.test(value) && !value.startsWith("bnd_")),
    "workspace must be an exact catalog ID or label",
  );

export function registerCatalogTools(
  server: McpServer,
  catalog: ViewWorkspaceCatalog,
) {
  registerOperationTools(server, catalog, workspaceSelectorSchema);
  registerAppTool(
    server,
    "list_workspaces",
    {
      title: "List Superbee workspaces",
      description:
        "List the bounded private catalog of Superbee workspaces available for explicit selection. Results contain only stable IDs, labels, display names, availability, and each workspace's home (local, git, or hosted, all read and written through their folder); they never expose filesystem paths.",
      inputSchema: z.object({}).strict(),
      outputSchema: listWorkspacesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["model"] } },
    },
    async (): Promise<CallToolResult> => {
      try {
        const listed = await catalog.list();
        const workspaces = normalizeWorkspaceSummaries(listed);
        const page = workspaces.slice(0, MAX_WORKSPACE_CATALOG_PAGE);
        // Best effort: a failure here never hides the folders, and a malformed entry is dropped.
        const listing = await catalog.reachable().catch(() => undefined);
        const reachable = (listing?.workspaces ?? [])
          .flatMap((entry) => {
            const parsed = reachableWorkspaceSchema.safeParse(entry);
            return parsed.success ? [parsed.data] : [];
          })
          .slice(0, MAX_REACHABLE_WORKSPACES);
        const notes = (listing?.notes ?? [])
          .map((note) => stripHostText(String(note), 400))
          .filter(Boolean)
          .slice(0, MAX_REACHABLE_NOTES);
        const text =
          workspaces.length === 0
            ? "No Superbee workspaces are registered in this user's private catalog."
            : `Found ${workspaces.length} registered Superbee workspace(s); showing ${page.length}.`;
        return {
          content: [
            {
              type: "text",
              text:
                reachable.length === 0
                  ? text
                  : `${text} ${reachable.length} more can be reached but have no folder here; each names the command that brings it into one (tools cannot open them).`,
            },
          ],
          structuredContent: {
            workspaces: page,
            shown: page.length,
            total: workspaces.length,
            truncated: page.length < workspaces.length,
            ...(reachable.length > 0 ? { reachable } : {}),
            ...(notes.length > 0 ? { reachable_notes: notes } : {}),
          },
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Could not list Superbee workspaces because the private workspace catalog is unavailable or invalid.",
            },
          ],
        };
      }
    },
  );
}
