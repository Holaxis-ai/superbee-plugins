export const FRAME_SIZE_MESSAGE_TYPE = "agentstate.frame-size.v1";
export const DEFAULT_MAX_FRAME_HEIGHT = 4_096;

export interface FrameSizingSession {
  launchId: string;
  epoch: number;
  nonce: string;
}

export type FrameSizeMessageResult =
  | { kind: "other" }
  | { kind: "invalid" }
  | { kind: "accepted"; height: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeScriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function scriptTag(script: string, nonce?: string): string {
  const nonceAttribute = nonce ? ` nonce="${nonce}"` : "";
  return `<script${nonceAttribute}>${script.replaceAll("</script", "<\\/script")}</script>`;
}

export function createFrameSizingSession(
  launchId: string,
  epoch: number,
  nonce = crypto.randomUUID().replaceAll("-", ""),
): FrameSizingSession {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) {
    throw new Error("Frame sizing nonce must be a 16–128 character base64url token.");
  }
  return { launchId, epoch, nonce };
}

/**
 * Mirrors intrinsic-height measurement for the opaque nested frame. The trusted outer shell
 * remains the only MCP-facing sizing authority.
 */
export function frameSizingScript(session: FrameSizingSession): string {
  const identity = safeScriptJson({
    type: FRAME_SIZE_MESSAGE_TYPE,
    launchId: session.launchId,
    epoch: session.epoch,
    nonce: session.nonce,
  });
  return `(()=>{"use strict";const identity=${identity};let scheduled=false;let lastHeight=0;const requestFrame=typeof window.requestAnimationFrame==="function"?window.requestAnimationFrame.bind(window):(callback)=>window.setTimeout(callback,0);const measure=()=>{scheduled=false;const html=document.documentElement;const body=document.body;const rootScrollHeight=html.scrollHeight;const height=Math.ceil(Math.max(rootScrollHeight===html.clientHeight?0:rootScrollHeight,body?.scrollHeight??0,html.getBoundingClientRect().height,body?.getBoundingClientRect().height??0));if(!Number.isFinite(height)||height<=0||height===lastHeight)return;lastHeight=height;window.parent.postMessage({...identity,height},"*")};const schedule=()=>{if(scheduled)return;scheduled=true;requestFrame(measure)};schedule();if(typeof ResizeObserver==="function"){const observer=new ResizeObserver(schedule);observer.observe(document.documentElement);if(document.body)observer.observe(document.body)}if(typeof MutationObserver==="function"){const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{attributes:true,characterData:true,childList:true,subtree:true})}window.addEventListener("resize",schedule);document.fonts?.ready?.then(schedule,()=>{})})();`;
}

export function frameSizingScriptTag(
  session: FrameSizingSession,
  options: { nonce?: string } = {},
): string {
  return scriptTag(frameSizingScript(session), options.nonce);
}

export function appendFrameSizingScript(
  html: string,
  session: FrameSizingSession,
): string {
  const injected = frameSizingScriptTag(session);
  const closingBody = html.toLowerCase().lastIndexOf("</body>");
  if (closingBody < 0) return `${html}${injected}`;
  return `${html.slice(0, closingBody)}${injected}${html.slice(closingBody)}`;
}

export function readFrameSizeMessage(
  value: unknown,
  session: FrameSizingSession,
): FrameSizeMessageResult {
  if (!isRecord(value) || value.type !== FRAME_SIZE_MESSAGE_TYPE) {
    return { kind: "other" };
  }
  if (
    value.launchId !== session.launchId ||
    value.epoch !== session.epoch ||
    value.nonce !== session.nonce ||
    typeof value.height !== "number" ||
    !Number.isFinite(value.height) ||
    value.height <= 0
  ) {
    return { kind: "invalid" };
  }
  return { kind: "accepted", height: Math.ceil(value.height) };
}

export function readFrameSizeEvent(
  value: unknown,
  source: unknown,
  expectedSource: unknown,
  session: FrameSizingSession,
  currentEpoch: number,
): FrameSizeMessageResult {
  const message = readFrameSizeMessage(value, session);
  if (message.kind === "other") return message;
  return source === expectedSource && session.epoch === currentEpoch
    ? message
    : { kind: "invalid" };
}

export function measureShellChromeHeight(
  shellHeight: number,
  frameHeight: number,
): number {
  if (
    !Number.isFinite(shellHeight) ||
    !Number.isFinite(frameHeight) ||
    shellHeight <= 0 ||
    frameHeight < 0
  ) {
    return 0;
  }
  return Math.max(0, Math.ceil(shellHeight - frameHeight));
}

export function hasFixedHostHeight(
  dimensions:
    | { height: number; maxHeight?: never }
    | { height?: never; maxHeight?: number }
    | undefined,
): boolean {
  return dimensions !== undefined && "height" in dimensions;
}

export function flexibleHostHeightLimit(
  dimensions:
    | { height: number; maxHeight?: never }
    | { height?: never; maxHeight?: number }
    | undefined,
): number | undefined {
  return dimensions && "maxHeight" in dimensions
    ? dimensions.maxHeight
    : undefined;
}

export function clampFrameHeight(
  requestedHeight: number,
  options: {
    hostHeightLimit?: number;
    shellChromeHeight?: number;
  } = {},
): number {
  const hostLimit =
    typeof options.hostHeightLimit === "number" &&
    Number.isFinite(options.hostHeightLimit) &&
    options.hostHeightLimit > 0
      ? Math.floor(options.hostHeightLimit)
      : DEFAULT_MAX_FRAME_HEIGHT;
  const chrome =
    typeof options.shellChromeHeight === "number" &&
    Number.isFinite(options.shellChromeHeight) &&
    options.shellChromeHeight > 0
      ? Math.ceil(options.shellChromeHeight)
      : 0;
  const available = Math.max(
    1,
    Math.min(DEFAULT_MAX_FRAME_HEIGHT, hostLimit) - chrome,
  );
  return Math.max(1, Math.min(Math.ceil(requestedHeight), available));
}
