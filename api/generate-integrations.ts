import { generateIntegrations } from "../server/generate";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await generateIntegrations(body, ip);
  return Response.json(result.body, { status: result.status });
}
