// The provider owns byte admission, approval, subscriptions and action confirmation. The
// receipt describes an invocation for a second process, without transferring a live launch.
import type { ActiveView, ViewWorkspace } from "@superbee/cli/view-workspace/v1";
import { z } from "zod";

const receiptSchema = z.object({
  viewId: z.string(), title: z.string(), entry: z.string(), registryVersion: z.string(),
  contentVersion: z.string(), contentType: z.string(), access: z.enum(["bundle-read", "bundle-propose"]),
}).strict();
export type RegisteredViewReceipt = z.infer<typeof receiptSchema>;
export function parseRegisteredViewReceipt(value: unknown): RegisteredViewReceipt | null {
  return receiptSchema.safeParse(value).data ?? null;
}

function changed(): Error {
  return new Error("The registered View changed before the reader opened it. Reopen the View to inspect its current source and access.");
}

export async function captureRegisteredView(workspace: ViewWorkspace, viewId: string): Promise<RegisteredViewReceipt> {
  const before = await workspace.document(viewId);
  const view = await workspace.open({ viewId });
  try {
    if (view.registration?.id !== viewId || view.access === "none" ||
        (await workspace.document(viewId)).version !== before.version) throw changed();
    return {
      viewId, title: view.title, entry: view.registration.entry, registryVersion: before.version,
      contentVersion: view.contentVersion, contentType: view.contentType, access: view.access,
    };
  } finally {
    workspace.close(view.id);
  }
}

export async function openCapturedView(workspace: ViewWorkspace, receipt: RegisteredViewReceipt): Promise<ActiveView> {
  const { viewId } = receipt;
  if ((await workspace.document(viewId)).version !== receipt.registryVersion) throw changed();
  const view = await workspace.open({ viewId });
  try {
    if (view.registration?.id !== viewId || view.registration.entry !== receipt.entry ||
        view.title !== receipt.title || view.access !== receipt.access || view.contentType !== receipt.contentType ||
        view.contentVersion !== receipt.contentVersion ||
        (await workspace.document(viewId)).version !== receipt.registryVersion) throw changed();
    return view;
  } catch (error) {
    workspace.close(view.id);
    throw error;
  }
}
