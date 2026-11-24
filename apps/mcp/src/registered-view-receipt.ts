import type { RegisteredViewReceipt } from "@superbee/cli/view-workspace/v1";
import { z } from "zod";

const receiptSchema = z.object({
  workspace: z.string().optional(),
  view: z.object({
    schemaVersion: z.literal("superbee.registered-view-receipt.v1"),
    workingCopy: z.string(),
    viewId: z.string(),
    title: z.string(),
    registryVersion: z.string(),
    contentVersion: z.string(),
    contentType: z.string(),
    access: z.enum(["bundle-read", "bundle-propose"]),
  }).strict() satisfies z.ZodType<RegisteredViewReceipt>,
}).strict();

export type RegisteredViewHandoff = z.infer<typeof receiptSchema>;
export function parseRegisteredViewHandoff(value: unknown): RegisteredViewHandoff | null {
  return receiptSchema.safeParse(value).data ?? null;
}
