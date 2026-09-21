import { CATEGORIES, CATEGORIES_BY_ID, TOOLS_BY_ID, type Tool } from "./catalog.js";

export const CUSTOM_NAME_MAX = 40;
export const GUIDANCE_MAX = 300;

// Cleans a visitor's free-text note for the next version of the map: no control characters, single spaces, capped length.
export function normalizeGuidance(raw: string | undefined): string {
  if (!raw) return "";
  const printable = Array.from(raw, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");
  return printable.replace(/\s+/g, " ").trim().slice(0, GUIDANCE_MAX);
}

export type CustomToolInput = { id: string; name: string; categoryId: string };

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .&+\-'/_()]*$/u;

const PLACEHOLDER_NAMES: Record<string, string> = {
  bi: "BI tool",
  warehouse: "Data warehouse tool",
  etl: "ETL / pipeline tool",
  analytics: "Analytics tool",
  crm: "CRM tool",
  marketing: "Marketing / email tool",
  pm: "Project Management tool",
  time: "Time Management tool",
  task: "Task Manager tool",
  comm: "Communication tool",
  "ai-tools": "AI tool",
  automation: "Automation tool",
  support: "Customer Support tool",
  finance: "Accounting / Finance tool",
};

// Splits "A, B, C" (commas, semicolons or new lines) into unique, trimmed names.
export function splitToolNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const name = part.replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

// Returns the cleaned name, or null when it is empty, too long, or has characters we do not allow.
export function normalizeCustomName(raw: string): string | null {
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > CUSTOM_NAME_MAX) return null;
  return NAME_RE.test(name) ? name : null;
}

export function customToolId(name: string, categoryId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CUSTOM_NAME_MAX)
    .replace(/-+$/g, "");
  return `custom:${categoryId}:${slug}`;
}

export const placeholderToolId = (categoryId: string) => `placeholder:${categoryId}`;

export function customTool(name: string, categoryId: string): Tool {
  return {
    id: customToolId(name, categoryId),
    name,
    categoryId,
    iconSlug: "",
    website: "",
    description: "A tool you added yourself.",
    custom: true,
  };
}

export function placeholderTool(id: string): Tool | null {
  if (!id.startsWith("placeholder:")) return null;
  const categoryId = id.slice("placeholder:".length);
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const name = PLACEHOLDER_NAMES[categoryId];
  if (!category || !name) return null;
  return {
    id,
    name,
    categoryId,
    iconSlug: "",
    website: "",
    description: `A generic stand-in for any ${category.label.toLowerCase()} tool you use that is not listed.`,
    placeholder: true,
  };
}

// Resolves a catalog tool, a placeholder, or a validated user-added tool. Anything else is rejected.
export function resolveTool(id: string, custom?: CustomToolInput[]): Tool | null {
  const fromCatalog = TOOLS_BY_ID[id];
  if (fromCatalog) return fromCatalog;
  const placeholder = placeholderTool(id);
  if (placeholder) return placeholder;

  const input = custom?.find((c) => c.id === id);
  if (!input) return null;
  const name = normalizeCustomName(input.name);
  if (!name || !CATEGORIES_BY_ID[input.categoryId]) return null;
  if (customToolId(name, input.categoryId) !== id) return null;
  return customTool(name, input.categoryId);
}
