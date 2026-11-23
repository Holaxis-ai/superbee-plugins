import { createHash } from "node:crypto";
import type {
  ActiveView,
  ViewWorkspace,
} from "@superbee/cli/view-workspace/v1";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import type {
  DurableViewLaunchPayload,
  McpViewPayload,
  ShowViewInput,
} from "./contract.js";
import { MCP_VIEW_HTML } from "./generated/view-html.generated.js";
import { MCP_DOCUMENT_HTML } from "./generated/document-html.generated.js";
import {
  DOCUMENT_PRESENTATION_SCHEMA_VERSION,
  type DocumentPresentationPayload,
} from "./document-contract.js";
import { randomBytes } from "node:crypto";
import {
  PendingClaimRegistry,
  PendingLaunchRegistry,
} from "./pending-launches.js";
import { McpServer } from "@modelcontextprotocol/server";
import { registerSearchTool } from "./search.js";
const resourceDigest = (html: string) =>
  createHash("sha256").update(html).digest("hex");
export const MCP_VIEW_RESOURCE_URI = `ui://agentstate/view-host/v1/${resourceDigest(MCP_VIEW_HTML)}.html`;
export const MCP_DOCUMENT_RESOURCE_URI = `ui://superbee/document-reader/v1/${resourceDigest(MCP_DOCUMENT_HTML)}.html`;
export const SHOW_VIEW_TOOL_NAME = "show_view";
export const SHOW_DOCUMENT_TOOL_NAME = "show_document";
export const RESOLVE_DOCUMENT_TOOL_NAME = "resolve_document";
export const LIST_VIEWS_TOOL_NAME = "list_views";
export const PREPARE_VIEW_ACTION_TOOL_NAME = "prepare_view_action";
export const FINISH_VIEW_ACTION_TOOL_NAME = "finish_view_action";
export const AUTHORIZE_DURABLE_VIEW_TOOL_NAME = "authorize_durable_view";
export const DURABLE_VIEW_BRIDGE_TOOL_NAME = "durable_view_bridge";
export const POLL_DURABLE_VIEW_TOOL_NAME = "poll_durable_view";
export const CLOSE_DURABLE_VIEW_TOOL_NAME = "close_durable_view";
export const RESUME_DURABLE_VIEW_TOOL_NAME = "resume_durable_view";
export const RESOLVE_LAUNCH_TOOL_NAME = "resolve_launch";
export const SAVE_TRANSIENT_VIEW_TOOL_NAME = "save_transient_view";
const MAX_NAVIGATION_OPERATIONS = 256;
type ActiveViewNavigation =
  | { status: "opened"; view: DurableViewLaunchPayload }
  | { status: "failed"; message: string };

function boundedNavigationMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500) || "the target View could not be opened";
}

/**
 * Claim marker carried in model-visible tool TEXT — the channel Claude Desktop preserves when it
 * strips structuredContent (probe-established). Model-visible by construction; conveys no model
 * authority: resolve_launch is app-only, same-connection, bounded, one-shot, exact-match-only.
 */
export function formatClaimMarker(claimId: string): string {
  return `[agentstate-claim:v1:${claimId}]`;
}

function mintClaimId(): string {
  return randomBytes(16).toString("base64url");
}
const listViewsInputSchema = z
  .object({
    cursor: z.string().trim().min(1).max(1024).optional(),
  })
  .strict();

const showDocumentInputSchema = z
  .object({ docId: z.string().trim().min(1).max(1024) })
  .strict();

const showDocumentOutputSchema = z.object({
  schemaVersion: z.literal(DOCUMENT_PRESENTATION_SCHEMA_VERSION),
  document: z.object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
    type: z.string().optional(),
    html: z.string(),
    bounded: z.boolean(),
  }),
});

function displayScalar(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const listViewsOutputSchema = z.object({
  views: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      access: z.enum(["bundle-read", "bundle-propose"]),
      presentation: z.enum(["workspace", "inline", "adaptive"]).optional(),
      timestamp: z.string().optional(),
    }),
  ),
  shown: z.number().int().nonnegative(),
  registeredTotal: z.number().int().nonnegative(),
  excluded: z.number().int().nonnegative(),
  invalidRegistrations: z.number().int().nonnegative(),
  pageUnavailableEntries: z.number().int().nonnegative(),
  skippedDocuments: z.number().int().nonnegative(),
  examined: z.number().int().nonnegative(),
  truncated: z.boolean(),
  nextCursor: z.string().optional(),
});

function encodeViewCursor(afterId: string): string {
  return Buffer.from(JSON.stringify({ v: 1, afterId }), "utf8").toString(
    "base64url",
  );
}

function decodeViewCursor(cursor: string | undefined): string | undefined {
  if (cursor === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new Error("cursor is not a valid Superbee View catalog cursor");
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "afterId,v" ||
    (value as { v?: unknown }).v !== 1 ||
    typeof (value as { afterId?: unknown }).afterId !== "string"
  ) {
    throw new Error("cursor is not a valid Superbee View catalog cursor");
  }
  return (value as { afterId: string }).afterId;
}

const durableInputSchema = z
  .object({
    viewId: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .describe(
        "Exact ID of an existing registered bundle View to run unchanged through the standard active bridge.",
      ),
  })
  .strict();

const transientInputSchema = z
  .object({
    mode: z.literal("transient"),
    title: z.string().trim().min(1).max(120),
    html: z.string().min(1),
    access: z.enum(["bundle-read", "bundle-propose"]).optional(),
  })
  .strict();

const inputSchema = z
  .object({
    mode: z.literal("transient").optional(),
    viewId: durableInputSchema.shape.viewId.optional(),
    title: transientInputSchema.shape.title.optional(),
    html: transientInputSchema.shape.html.optional(),
    access: transientInputSchema.shape.access,
  })
  .strict()
  .describe(
    "Pass exactly viewId for a registered View, or mode:transient plus title/html and optional access for an active process-local View.",
  );

const durableOutputSchema = z.object({
  schemaVersion: z.literal("agentstate.durable-view-launch.v1"),
  title: z.string(),
  source: z.object({
    viewId: z.string(),
    entry: z.string(),
    html: z.string(),
    contentType: z.string(),
    contentVersion: z.string(),
  }),
  launch: z.object({
    launchId: z.string(),
    access: z.enum(["none", "bundle-read", "bundle-propose"]),
    authorization: z.object({
      required: z.boolean(),
      authorized: z.boolean(),
    }),
  }),
});

const transientOutputSchema = z.object({
  schemaVersion: z.literal("agentstate.transient-view-launch.v1"),
  title: z.string(),
  source: z.object({
    kind: z.literal("transient"),
    html: z.string(),
    contentType: z.string(),
    contentVersion: z.string(),
  }),
  launch: durableOutputSchema.shape.launch,
});

const saveTransientViewInputSchema = z
  .object({
    launchId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .describe("Exact transient launchId returned by show_view."),
    viewId: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .describe(
        "New durable registration id under views-registry/; its views/...html entry is derived.",
      ),
    description: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe("Optional durable catalog description."),
  })
  .strict();

const saveTransientViewOutputSchema = z.object({
  saved: z.object({
    viewId: z.string(),
    entry: z.string(),
    title: z.string(),
    access: z.enum(["none", "bundle-read", "bundle-propose"]),
    sourceVersion: z.string(),
    entryVersion: z.string(),
    registryVersion: z.string(),
    entryCreated: z.boolean(),
    registryCreated: z.boolean(),
  }),
});

const outputSchema = z.object({
  schemaVersion: z.enum([
    "agentstate.durable-view-launch.v1",
    "agentstate.transient-view-launch.v1",
  ]),
  title: z.string(),
  source: z.union([
    durableOutputSchema.shape.source,
    transientOutputSchema.shape.source,
  ]),
  launch: durableOutputSchema.shape.launch,
});

function parseShowViewInput(input: unknown): ShowViewInput {
  const outer = inputSchema.parse(input);
  if (outer.viewId !== undefined) return durableInputSchema.parse(outer);
  if (outer.mode === "transient") return transientInputSchema.parse(outer);
  throw new Error("pass exactly viewId, or mode:transient plus title and html");
}

function activePayload(view: ActiveView): McpViewPayload {
  const source = {
    html: view.html,
    contentType: view.contentType,
    contentVersion: view.contentVersion,
  };
  const launch = {
    launchId: view.id,
    access: view.access,
    authorization: {
      required: view.access !== "none",
      authorized: view.authorized,
    },
  };
  return view.registration
    ? {
        schemaVersion: "agentstate.durable-view-launch.v1",
        title: view.title,
        source: {
          ...source,
          viewId: view.registration.id,
          entry: view.registration.entry,
        },
        launch,
      }
    : {
        schemaVersion: "agentstate.transient-view-launch.v1",
        title: view.title,
        source: { ...source, kind: "transient" },
        launch,
      };
}
function fallbackText(payload: McpViewPayload): string {
  if (payload.schemaVersion === "agentstate.transient-view-launch.v1") {
    return payload.launch.authorization.authorized
      ? `Prepared transient Superbee View "${payload.title}" from its exact process-local bytes.`
      : `Transient Superbee View "${payload.title}" is ready for local approval of its exact process-local bytes before it can read bundle data.`;
  }
  return payload.launch.authorization.authorized
    ? `Prepared registered Superbee View "${payload.title}" (${payload.source.viewId}) from its exact current bundle bytes.`
    : `Registered Superbee View "${payload.title}" (${payload.source.viewId}) is ready for local approval of its exact current bytes before it can read bundle data.`;
}

async function presentDocument(
  workspace: ViewWorkspace,
  docId: string,
  pendingDocuments: PendingClaimRegistry<DocumentPresentationPayload>,
): Promise<CallToolResult> {
  try {
    const result = await workspace.document(docId);
    const title = displayScalar(result.frontmatter.title) ?? result.id;
    const type = displayScalar(result.frontmatter.type);
    const payload: DocumentPresentationPayload = {
      schemaVersion: DOCUMENT_PRESENTATION_SCHEMA_VERSION,
      document: {
        id: result.id,
        version: result.version,
        title,
        ...(type ? { type } : {}),
        html: result.html,
        bounded: result.bounded,
      },
    };
    const claimId = mintClaimId();
    pendingDocuments.record(claimId, payload);
    return {
      content: [
        {
          type: "text",
          text: `Displayed Superbee document "${title}" (${result.id}) at ${result.version}.\n${formatClaimMarker(claimId)}`,
        },
      ],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Could not display Superbee document '${docId}': ${detail.slice(0, 500)}`,
        },
      ],
    };
  }
}

async function listViews(
  workspace: ViewWorkspace,
  cursor: string | undefined,
): Promise<CallToolResult> {
  try {
    const afterId = decodeViewCursor(cursor);
    const catalog = await workspace.listViews(afterId);
    const payload = {
      views: catalog.entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        ...(entry.description ? { description: entry.description } : {}),
        access: entry.access,
        ...(entry.presentation ? { presentation: entry.presentation } : {}),
        ...(entry.timestamp ? { timestamp: entry.timestamp } : {}),
      })),
      shown: catalog.entries.length,
      registeredTotal: catalog.registeredTotal,
      excluded: catalog.excludedAccess,
      invalidRegistrations: catalog.invalidRegistrations,
      pageUnavailableEntries: catalog.pageUnavailableEntries,
      skippedDocuments: catalog.skippedDocuments,
      examined: catalog.examined,
      truncated: catalog.truncated,
      ...(catalog.nextAfterId
        ? { nextCursor: encodeViewCursor(catalog.nextAfterId) }
        : {}),
    };
    return {
      content: [
        {
          type: "text",
          text:
            catalog.registeredTotal === 0
              ? "No registered active Views are available to this MCP host."
              : `Found ${catalog.registeredTotal} registered active View registration(s); showing ${catalog.entries.length} admitted View(s) from ${catalog.examined} examined.`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Could not list Superbee Views: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

function resolveDocumentClaim(
  pendingDocuments: PendingClaimRegistry<DocumentPresentationPayload>,
  claim: string,
): CallToolResult {
  const entry = pendingDocuments.consume(claim);
  if (!entry) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Unknown, expired, or already-redeemed Superbee document claim. Display the document again.",
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text",
        text: `Recovered Superbee document "${entry.payload.document.title}" (${entry.payload.document.id}).`,
      },
    ],
    structuredContent: { ...entry.payload },
  };
}

export function createMcpAppServer(workspace: ViewWorkspace): McpServer {
  const server = new McpServer({
    name: "Superbee Conversational Views",
    version: "0.1.0-experimental.1",
  });
  registerSearchTool(server, workspace);
  const pendingDocuments =
    new PendingClaimRegistry<DocumentPresentationPayload>();
  const pendingLaunches = new PendingLaunchRegistry();
  const navigations = new Map<string, Promise<ActiveViewNavigation>>();
  function navigate(id: string, viewId: string): Promise<ActiveViewNavigation> {
    const prior = navigations.get(id);
    if (prior) return prior;
    if (navigations.size >= MAX_NAVIGATION_OPERATIONS)
      navigations.delete(navigations.keys().next().value!);
    const result = workspace.open({ viewId }).then(
      (view) => ({
        status: "opened" as const,
        view: activePayload(view) as DurableViewLaunchPayload,
      }),
      (error) => ({
        status: "failed" as const,
        message: boundedNavigationMessage(error),
      }),
    );
    navigations.set(id, result);
    return result;
  }
  registerAppTool(
    server,
    SHOW_DOCUMENT_TOOL_NAME,
    {
      title: "Show Superbee document",
      description:
        "Display one authoritative bundle document by exact id in Superbee's fixed Markdown reader. Use this for human review of documents; it does not launch executable View code or require View authorization.",
      inputSchema: showDocumentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: {
          resourceUri: MCP_DOCUMENT_RESOURCE_URI,
          visibility: ["model"],
        },
      },
    },
    async ({ docId }): Promise<CallToolResult> =>
      presentDocument(workspace, docId, pendingDocuments),
  );

  registerAppTool(
    server,
    LIST_VIEWS_TOOL_NAME,
    {
      title: "List registered Superbee Views",
      description:
        "List existing durable bundle Views that this MCP host can invoke by exact id with show_view. Results are deterministic and bounded; use nextCursor to continue.",
      inputSchema: listViewsInputSchema,
      outputSchema: listViewsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["model"] } },
    },
    async (input): Promise<CallToolResult> => {
      const { cursor } = listViewsInputSchema.parse(input);
      return listViews(workspace, cursor);
    },
  );

  registerAppTool(
    server,
    SHOW_VIEW_TOOL_NAME,
    {
      title: "Show Superbee View",
      description:
        "Launch a registered or temporary View in the selected workspace.",
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: MCP_VIEW_RESOURCE_URI, visibility: ["model"] },
      },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const parsed = parseShowViewInput(input);
        const payload = activePayload(
          await workspace.open(
            "viewId" in parsed
              ? parsed
              : { ...parsed, access: parsed.access ?? "bundle-read" },
          ),
        );
        // Claim ticket for hosts whose tool-result notifications strip structuredContent
        // (probe-established for Claude Desktop): the marker rides the preserved text channel
        // and the App redeems it — exact-match, one-shot — via the app-only resolve_launch.
        const claimId = mintClaimId();
        pendingLaunches.record(claimId, payload.launch.launchId);
        return {
          content: [
            {
              type: "text",
              text: `${fallbackText(payload)}\n${formatClaimMarker(claimId)}`,
            },
          ],
          structuredContent: { ...payload },
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Could not render the Superbee View: ${detail}`,
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    server,
    AUTHORIZE_DURABLE_VIEW_TOOL_NAME,
    {
      title: "Authorize active Superbee View",
      description:
        "Record the trusted shell's local decision to trust exact active View bytes with their declared active access, then return the revalidated launch.",
      inputSchema: z.object({ launchId: z.string().min(1).max(128) }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId }): Promise<CallToolResult> => {
      const view = activePayload(await workspace.approve(launchId));
      return {
        content: [
          {
            type: "text",
            text: `Approved exact current bytes for "${view.title}".`,
          },
        ],
        structuredContent: { view },
      };
    },
  );

  registerAppTool(
    server,
    SAVE_TRANSIENT_VIEW_TOOL_NAME,
    {
      title: "Save transient Superbee View",
      description:
        "Save an already locally approved transient active View as a durable registered bundle View without transforming its HTML. Pass only the transient launchId from show_view, a new views-registry/... id, and optional description; the server rereads its own immutable launch bytes and never accepts replacement HTML.",
      inputSchema: saveTransientViewInputSchema,
      outputSchema: saveTransientViewOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["model"] } },
    },
    async (input): Promise<CallToolResult> => {
      try {
        const parsed = saveTransientViewInputSchema.parse(input);
        const saved = await workspace.save(
          parsed.launchId,
          parsed.viewId,
          parsed.description,
        );
        return {
          content: [
            {
              type: "text",
              text: `Saved exact temporary View bytes as '${saved.viewId}'.`,
            },
          ],
          structuredContent: { saved },
        };
      } catch (error) {
        const retained = z
          .object({
            retainedEntry: z
              .object({ key: z.string(), version: z.string() })
              .optional(),
            retainedRegistration: z
              .object({ id: z.string(), version: z.string() })
              .optional(),
          })
          .safeParse(error);
        const entry = retained.data?.retainedEntry;
        const registration = retained.data?.retainedRegistration;
        const detail = error instanceof Error ? error.message : String(error);
        const remainder = [
          entry ? `Entry retained at '${entry.key}' (${entry.version}).` : "",
          registration
            ? `Registration retained at '${registration.id}' (${registration.version}).`
            : "No successful registration was reported.",
        ]
          .filter(Boolean)
          .join(" ");
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Could not save the temporary View: ${detail}. ${remainder}`,
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    server,
    DURABLE_VIEW_BRIDGE_TOOL_NAME,
    {
      title: "Run active Superbee View bridge request",
      description:
        "Forward one bounded data bridge request from the current approved active View. Governed change proposals use the separate trusted confirmation tools.",
      inputSchema: z
        .object({
          launchId: z.string().min(1).max(128),
          request: z.unknown(),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId, request }): Promise<CallToolResult> => {
      const outcome = await workspace.request(launchId, request);
      const navigation =
        outcome.openPageId === undefined
          ? undefined
          : await navigate(launchId, outcome.openPageId);
      return {
        content: [
          {
            type: "text",
            text:
              navigation?.status === "opened"
                ? `Opened registered View "${navigation.view.title}" inside the active MCP View host.`
                : navigation?.status === "failed"
                  ? `Could not open the registered View: ${navigation.message}`
                  : "Processed one active View bridge request.",
          },
        ],
        structuredContent: { outcome, ...(navigation ? { navigation } : {}) },
      };
    },
  );

  registerAppTool(
    server,
    RESUME_DURABLE_VIEW_TOOL_NAME,
    {
      title: "Resume active Superbee View",
      description:
        "Mint a fresh active View launch after the trusted App quarantines an old visible mount. View identity and authorization are derived only from server-owned launch state.",
      inputSchema: z.object({ launchId: z.string().min(1).max(128) }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId }): Promise<CallToolResult> => {
      try {
        const view = activePayload(await workspace.resume(launchId));
        return {
          content: [
            {
              type: "text",
              text: `Minted a fresh current launch for "${view.title}".`,
            },
          ],
          structuredContent: { view },
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Could not resume the registered View: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  registerAppTool(
    server,
    POLL_DURABLE_VIEW_TOOL_NAME,
    {
      title: "Poll active Superbee View changes",
      description:
        "Poll the server-owned subscription baseline for the current active View.",
      inputSchema: z
        .object({
          launchId: z.string().min(1).max(128),
          acknowledgeGeneration: z.string().min(1).max(128).optional(),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId, acknowledgeGeneration }): Promise<CallToolResult> => {
      const poll = await workspace.poll(launchId, acknowledgeGeneration);
      return {
        content: [
          { type: "text", text: `Registered View poll: ${poll.status}.` },
        ],
        structuredContent: { poll },
      };
    },
  );

  registerAppTool(
    server,
    CLOSE_DURABLE_VIEW_TOOL_NAME,
    {
      title: "Close active Superbee View",
      description:
        "Revoke one process-local active View launch and discard its subscription state.",
      inputSchema: z.object({ launchId: z.string().min(1).max(128) }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId }): Promise<CallToolResult> => {
      workspace.close(launchId);
      return {
        content: [
          { type: "text", text: "Closed the registered Superbee View launch." },
        ],
        structuredContent: { closed: true },
      };
    },
  );

  registerAppTool(
    server,
    PREPARE_VIEW_ACTION_TOOL_NAME,
    {
      title: "Prepare Superbee View action",
      description:
        "Prepare one trusted-shell action from the current View for explicit human confirmation.",
      inputSchema: z
        .object({
          launchId: z.string().min(1).max(256),
          requestId: z.string().min(1).max(64),
          action: z.unknown(),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async (input): Promise<CallToolResult> => {
      const { launchId } = input;
      const result = await workspace.prepare(launchId, input.action);
      return {
        content: [
          {
            type: "text",
            text:
              result.status === "prepared"
                ? `Prepared a ${result.confirmation.field} change for human confirmation.`
                : `Superbee action ${result.status}: ${"message" in result && result.message ? result.message : result.status}`,
          },
        ],
        structuredContent: { result },
      };
    },
  );

  registerAppTool(
    server,
    FINISH_VIEW_ACTION_TOOL_NAME,
    {
      title: "Finish Superbee View action",
      description:
        "Commit or cancel an action after the trusted MCP App shell collects the human decision.",
      inputSchema: z.object({
        launchId: z.string().min(1).max(256),
        approvalToken: z.string().min(1).max(256),
        decision: z.enum(["commit", "cancel"]),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ launchId, approvalToken, decision }): Promise<CallToolResult> => {
      const result = await workspace.finish(launchId, approvalToken, decision);
      return {
        content: [
          {
            type: "text",
            text:
              result.status === "committed"
                ? `Committed the confirmed ${result.field ?? "field"} change.`
                : `Superbee action ${result.status}: ${result.message ?? result.status}`,
          },
        ],
        structuredContent: { result },
      };
    },
  );

  registerAppResource(
    server,
    "Superbee Document Reader",
    MCP_DOCUMENT_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description:
        "Fixed Superbee reader for authoritative bundle Markdown documents.",
    },
    async (): Promise<ReadResourceResult> => ({
      contents: [
        {
          uri: MCP_DOCUMENT_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: MCP_DOCUMENT_HTML,
          _meta: {
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: [],
                frameDomains: [],
                baseUriDomains: [],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    }),
  );

  registerAppResource(
    server,
    "Superbee View Host",
    MCP_VIEW_RESOURCE_URI,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description:
        "Fixed trusted shell for invocation-specific Superbee Views.",
    },
    async (): Promise<ReadResourceResult> => ({
      contents: [
        {
          uri: MCP_VIEW_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: MCP_VIEW_HTML,
          _meta: {
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: [],
                // Invocation content stays in a sandboxed opaque-origin child. A blob URL keeps
                // registered source byte-derived and avoids a host-specific frame origin.
                frameDomains: ["blob:"],
                baseUriDomains: [],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    RESOLVE_DOCUMENT_TOOL_NAME,
    {
      title: "Resolve undelivered Superbee document",
      description:
        "Redeem the exact one-shot claim marker from a show_document result whose structured payload the host stripped.",
      inputSchema: z.object({ claim: z.string().min(8).max(256) }),
      outputSchema: showDocumentOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ claim }): Promise<CallToolResult> =>
      resolveDocumentClaim(pendingDocuments, claim),
  );

  registerAppTool(
    server,
    RESOLVE_LAUNCH_TOOL_NAME,
    {
      title: "Resolve undelivered Superbee View launch",
      description:
        "Redeem the exact one-shot claim marker from a show_view result whose structured payload the host stripped. Returns the already-minted payload; unknown or reused claims fail closed.",
      inputSchema: z.object({ claim: z.string().min(8).max(256) }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ claim }): Promise<CallToolResult> => {
      const entry = pendingLaunches.consume(claim);
      if (!entry) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Unknown, expired, or already-redeemed Superbee View claim. Reopen the View.",
            },
          ],
        };
      }
      const view = await workspace.inspect(entry.launchId);
      const payload = view ? activePayload(view) : null;
      if (!payload) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "The pending View launch expired before it could be resolved. Reopen the View.",
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: fallbackText(payload) }],
        structuredContent: { ...payload },
      };
    },
  );

  return server;
}

export async function startMcpStdioServer(
  workspace: ViewWorkspace,
): Promise<void> {
  await createMcpAppServer(workspace).connect(new StdioServerTransport());
}
