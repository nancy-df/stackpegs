import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { CATEGORIES_BY_ID } from "../../shared/catalog";
import { getTool } from "../lib/tools";
import { NODE_W } from "../lib/layout";
import { ToolLogo } from "./ToolLogo";

export type ToolFlowNode = Node<{ toolId: string }, "tool">;

export function ToolNode({ id, data, selected }: NodeProps<ToolFlowNode>) {
  const { deleteElements } = useReactFlow();
  const tool = getTool(data.toolId);
  if (!tool) return null;
  const category = CATEGORIES_BY_ID[tool.categoryId];

  return (
    <div className="group relative flex flex-col items-center gap-1.5" style={{ width: NODE_W }}>
      <Handle type="target" position={Position.Top} className="!pointer-events-none !opacity-0" />
      <Handle type="source" position={Position.Top} className="!pointer-events-none !opacity-0" />

      <div
        className={`grid size-[72px] place-items-center rounded-2xl border-2 bg-white shadow-sm transition-shadow ${
          selected ? "shadow-lg ring-4 ring-indigo-500/30" : "group-hover:shadow-md"
        }`}
        style={{ borderColor: category?.color ?? "#94a3b8", borderStyle: tool.placeholder ? "dashed" : "solid" }}
      >
        <ToolLogo tool={tool} className="size-8" />
      </div>

      <div className="text-center leading-tight">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{tool.name}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">{tool.placeholder ? "Placeholder" : category?.label}</div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${tool.name} from canvas`}
        title="Remove"
        onClick={(e) => {
          e.stopPropagation();
          deleteElements({ nodes: [{ id }] });
        }}
        className="nodrag absolute top-[-6px] right-[14px] grid size-5 place-items-center rounded-full bg-slate-800 text-xs leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
