import { TOOLS_BY_ID } from "../shared/catalog";

export type FaviconResult =
  | { status: 200; contentType: string; body: ArrayBuffer }
  | { status: 400 | 404 | 502; error: string };

const MAX_BYTES = 200_000;

// Serves a tool's favicon from our own origin so the HTML export can embed it as a data URI.
// Only catalog tool ids are accepted, so the upstream host is never client-controlled.
export async function getFavicon(toolId: string | null): Promise<FaviconResult> {
  if (!toolId) return { status: 400, error: "Missing tool id." };
  const tool = TOOLS_BY_ID[toolId];
  if (!tool) return { status: 404, error: "Unknown tool." };

  const host = new URL(tool.website).hostname;
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${host}&sz=128`, {
      signal: AbortSignal.timeout(5000),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) return { status: 502, error: "Favicon unavailable." };
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return { status: 502, error: "Favicon too large." };
    return { status: 200, contentType, body };
  } catch {
    return { status: 502, error: "Favicon unavailable." };
  }
}
