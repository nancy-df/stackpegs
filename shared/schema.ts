import { z } from "zod";
import { MAX_CANVAS_TOOLS } from "./catalog.js";

export const INTEGRATION_TYPES = [
  "native",
  "api",
  "automation-platform",
  "webhook",
  "file-export",
  "data-pipeline",
] as const;

export const IntegrationEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  integrationType: z.enum(INTEGRATION_TYPES),
  direction: z.enum(["one-way", "two-way"]),
  dataFlow: z.string(),
  useCase: z.string(),
});

export const IntegrationResultSchema = z.object({
  summary: z.string(),
  edges: z.array(IntegrationEdgeSchema),
});

export const CustomToolInputSchema = z.object({
  id: z.string().max(90),
  name: z.string().max(80),
  categoryId: z.string().max(30),
});

export const GenerateRequestSchema = z.object({
  toolIds: z.array(z.string().max(90)).min(2).max(MAX_CANVAS_TOOLS),
  customTools: z.array(CustomToolInputSchema).max(MAX_CANVAS_TOOLS).optional(),
  guidance: z.string().max(1000).optional(),
});

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];
export type IntegrationEdge = z.infer<typeof IntegrationEdgeSchema>;
export type IntegrationResult = z.infer<typeof IntegrationResultSchema>;
