import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CATEGORIES_BY_ID, TOOLS_BY_ID } from "../shared/catalog";
import {
  GenerateRequestSchema,
  IntegrationResultSchema,
  type IntegrationEdge,
} from "../shared/schema";

export type HandlerResult = { status: number; body: unknown };

const DEFAULT_MODEL = "claude-opus-5";
const RATE_LIMIT = { max: 20, windowMs: 60_000 };

const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT.max;
}

const SYSTEM_PROMPT = `You are an expert on SaaS tool integrations and data architecture. The user gives you a set of tools placed on a canvas. Produce an integration map: which of these tools connect to each other, how, and what data flows.

Rules:
- Only include a connection when you are reasonably confident it exists in practice: a native integration or marketplace app, a well-known first-party connector, a documented API/webhook pattern, or a standard connection through an automation platform (Zapier, Make, Power Automate, n8n, Workato).
- Do not force connections. Competing tools in the same category (for example Tableau and Power BI) usually have no edge between them. Omit pairs with no meaningful integration.
- Model real pipelines. If the canvas contains an ETL/pipeline tool or a data warehouse, route data through it (CRM -> pipeline -> warehouse -> BI) instead of drawing direct edges that skip it. If an automation platform is on the canvas and is the realistic bridge between two tools, connect each tool to it instead of to each other.
- "source" and "target" must be tool ids exactly as given. For a one-way flow, data moves from source to target. For two-way, order does not matter.
- integrationType: "native" (built-in or marketplace integration), "api" (documented REST/SDK-based integration), "automation-platform" (via a Zapier/Make style connector), "webhook", "file-export" (CSV/spreadsheet export/import), "data-pipeline" (ETL/ELT sync into or out of a warehouse).
- dataFlow: one plain sentence, at most 160 characters, naming the actual data objects (for example "Deals and contacts sync from Salesforce into Snowflake nightly"). useCase: at most 60 characters.
- summary: two sentences at most describing how the whole set works together end to end. If the tools barely connect, say so plainly.
- At most one edge per pair of tools.`;

function buildUserPrompt(toolIds: string[]): string {
  const lines = toolIds.map((id) => {
    const tool = TOOLS_BY_ID[id]!;
    const category = CATEGORIES_BY_ID[tool.categoryId]!.label;
    return `- ${tool.id}: ${tool.name} (${category}) - ${tool.description}`;
  });
  return `Tools on the canvas:\n${lines.join("\n")}\n\nReturn the integration map.`;
}

function cleanEdges(edges: IntegrationEdge[], valid: Set<string>): IntegrationEdge[] {
  const seen = new Set<string>();
  const out: IntegrationEdge[] = [];
  for (const edge of edges) {
    if (!valid.has(edge.source) || !valid.has(edge.target) || edge.source === edge.target) continue;
    const pair = [edge.source, edge.target].sort().join("|");
    if (seen.has(pair)) continue;
    seen.add(pair);
    out.push(edge);
  }
  return out;
}

export async function generateIntegrations(input: unknown, clientKey: string): Promise<HandlerResult> {
  if (rateLimited(clientKey)) {
    return { status: 429, body: { error: "Too many requests. Please wait a moment and try again." } };
  }

  const parsed = GenerateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 400, body: { error: "Provide between 2 and 12 tool ids." } };
  }

  const toolIds = [...new Set(parsed.data.toolIds)];
  const unknown = toolIds.filter((id) => !TOOLS_BY_ID[id]);
  if (unknown.length > 0) {
    return { status: 400, body: { error: `Unknown tool ids: ${unknown.join(", ")}` } };
  }
  if (toolIds.length < 2) {
    return { status: 400, body: { error: "Provide at least 2 distinct tools." } };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: 500,
      body: { error: "The server has no ANTHROPIC_API_KEY configured. Add it to .env and restart." },
    };
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(toolIds) }],
      output_config: {
        effort: "medium",
        format: zodOutputFormat(IntegrationResultSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      return { status: 502, body: { error: "The model declined this request. Try a different set of tools." } };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { status: 502, body: { error: "The model returned an incomplete answer. Please retry." } };
    }

    const result = IntegrationResultSchema.parse(response.parsed_output);
    return {
      status: 200,
      body: {
        summary: result.summary,
        edges: cleanEdges(result.edges, new Set(toolIds)),
        model,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { status: 429, body: { error: "The AI service is busy. Please retry in a moment." } };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: 500, body: { error: "The server's Anthropic API key was rejected." } };
    }
    if (error instanceof Anthropic.NotFoundError) {
      return { status: 500, body: { error: `Model "${model}" was not found. Check ANTHROPIC_MODEL.` } };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return { status: 502, body: { error: "The AI service returned an error. Please retry." } };
    }
    console.error("generateIntegrations failed", error);
    return { status: 500, body: { error: "Unexpected server error." } };
  }
}
