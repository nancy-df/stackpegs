import { CATEGORIES_BY_ID, type Tool } from "../../shared/catalog";
import { ToolLogo } from "./ToolLogo";

export const DRAG_MIME = "application/x-stackpegs-tool";

type Props = {
  tool: Tool;
  added: boolean;
  showCategory: boolean;
  onAdd: () => void;
};

export function ToolTile({ tool, added, showCategory, onAdd }: Props) {
  return (
    <button
      type="button"
      draggable
      title={tool.description}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, tool.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onAdd}
      className={`group relative flex cursor-grab flex-col items-center gap-1.5 rounded-xl border bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing dark:border-slate-700 ${
        tool.placeholder ? "border-dashed border-slate-300" : "border-slate-200"
      }`}
    >
      <ToolLogo tool={tool} className="size-9" />
      <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-700">{tool.name}</span>
      {showCategory && (
        <span className="line-clamp-1 text-[10px] leading-tight text-slate-400">
          {CATEGORIES_BY_ID[tool.categoryId]?.label}
        </span>
      )}
      {added && (
        <span
          className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] text-white"
          aria-label="On canvas"
        >
          ✓
        </span>
      )}
    </button>
  );
}
