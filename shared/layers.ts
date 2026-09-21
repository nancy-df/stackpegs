import type { Tool } from "./catalog.js";

export type Layer = {
  id: string;
  title: string;
  subtitle: string;
  // Categories placed here by default.
  categoryIds: string[];
  // Tint used for the strip, as a hex color.
  color: string;
  // Shared plumbing (ETL, automation) is drawn as a full-width band.
  band?: boolean;
};

// Top to bottom, in the order data usually flows.
export const LAYERS: Layer[] = [
  {
    id: "sources",
    title: "Sources",
    subtitle: "Where your data starts",
    categoryIds: ["crm", "marketing", "analytics", "support", "finance", "time"],
    color: "#3b82f6",
  },
  {
    id: "integration",
    title: "Integration",
    subtitle: "Collect, connect, orchestrate",
    categoryIds: ["etl", "automation"],
    color: "#f59e0b",
    band: true,
  },
  {
    id: "platform",
    title: "Data Platform",
    subtitle: "Store, transform, model",
    categoryIds: ["warehouse"],
    color: "#0ea5e9",
  },
  {
    id: "analytics",
    title: "Analytics & BI",
    subtitle: "Dashboards and insights",
    categoryIds: ["bi"],
    color: "#f97316",
  },
  {
    id: "ai",
    title: "AI",
    subtitle: "Assistants and agents",
    categoryIds: ["ai-tools"],
    color: "#d946ef",
  },
  {
    id: "action",
    title: "Collaboration & Action",
    subtitle: "Where people act on it",
    categoryIds: ["comm", "pm", "task"],
    color: "#22c55e",
  },
  {
    id: "other",
    title: "Other",
    subtitle: "Tools you added",
    categoryIds: ["other"],
    color: "#64748b",
  },
];

export const LAYERS_BY_ID: Record<string, Layer> = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

const DEFAULT_LAYER_BY_CATEGORY: Record<string, string> = Object.fromEntries(
  LAYERS.flatMap((layer) => layer.categoryIds.map((categoryId) => [categoryId, layer.id])),
);

export function defaultLayerId(tool: Pick<Tool, "categoryId">): string {
  return DEFAULT_LAYER_BY_CATEGORY[tool.categoryId] ?? "other";
}
