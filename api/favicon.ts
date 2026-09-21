import { getFavicon } from "../server/favicon.js";

export async function GET(request: Request): Promise<Response> {
  const tool = new URL(request.url).searchParams.get("tool");
  const result = await getFavicon(tool);
  if (result.status !== 200) return Response.json({ error: result.error }, { status: result.status });
  return new Response(result.body, {
    headers: { "content-type": result.contentType, "cache-control": "public, max-age=86400" },
  });
}
