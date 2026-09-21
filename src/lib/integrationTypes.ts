import type { IntegrationType } from "../../shared/schema";

export const TYPE_META: Record<IntegrationType, { label: string; color: string; hint: string }> = {
  native: { label: "Native", color: "#059669", hint: "Built-in or marketplace integration" },
  api: { label: "API", color: "#0284c7", hint: "Connects through documented APIs" },
  "automation-platform": {
    label: "Automation",
    color: "#d97706",
    hint: "Connects through an automation platform such as Zapier or Make",
  },
  webhook: { label: "Webhook", color: "#7c3aed", hint: "Event-driven webhooks" },
  "file-export": { label: "File export", color: "#64748b", hint: "CSV or spreadsheet export and import" },
  "data-pipeline": { label: "Data pipeline", color: "#0d9488", hint: "ETL/ELT sync into or out of a warehouse" },
};
