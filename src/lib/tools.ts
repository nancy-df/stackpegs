import { TOOLS_BY_ID, type Tool } from "../../shared/catalog";
import { customTool, customToolId, placeholderTool, type CustomToolInput } from "../../shared/custom";

// Tools the visitor typed in this session. Registered before the node is added, and never renamed.
const registry = new Map<string, Tool>();

export function registerCustomTool(name: string, categoryId: string): Tool {
  const id = customToolId(name, categoryId);
  const existing = registry.get(id);
  if (existing) return existing;
  const tool = customTool(name, categoryId);
  registry.set(id, tool);
  return tool;
}

export function getTool(id: string): Tool | undefined {
  return TOOLS_BY_ID[id] ?? placeholderTool(id) ?? registry.get(id);
}

export function customToolInputs(ids: string[]): CustomToolInput[] {
  return ids.flatMap((id) => {
    const tool = registry.get(id);
    return tool ? [{ id, name: tool.name, categoryId: tool.categoryId }] : [];
  });
}
