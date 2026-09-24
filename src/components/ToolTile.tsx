import { CATEGORIES_BY_ID, type Tool } from "../../shared/catalog";
import { ToolLogo } from "./ToolLogo";

export const DRAG_MIME = "application/x-stackpegs-tool";

type Props = {
  tool: Tool;
  added: boolean;
  showCategory: boolean;
  onAdd: () => void;
  onRemove?: () => void;
};

export function ToolTile({ tool, added, showCategory, onAdd, onRemove }: Props) {
  return (
    <div
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 ${
        tool.placeholder ? "border-dashed border-slate-300" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        draggable
        title={tool.description}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, tool.id);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={onAdd}
        className="flex w-full cursor-grab flex-col items-center gap-1.5 active:cursor-grabbing"
      >
        <ToolLogo tool={tool} className="size-9" />
        <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-700">{tool.name}</span>
        {showCategory && (
          <span className="line-clamp-1 text-[10px] leading-tight text-slate-400">
            {CATEGORIES_BY_ID[tool.categoryId]?.label}
          </span>
        )}
      </button>
      {added &&
        (onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${tool.name} from canvas`}
            title="Remove from canvas"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] leading-none text-white group-hover:bg-slate-800"
          >
            <span className="group-hover:hidden">✓</span>
            <span className="hidden group-hover:inline">✕</span>
          </button>
        ) : (
          <span
            className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] text-white"
            aria-label="On canvas"
          >
            ✓
          </span>
        ))}
    </div>
  );
}

export function OtherTile({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-2 text-center transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md ${
        open ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-300 dark:border-slate-600"
      }`}
    >
      <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-xl leading-none text-slate-500 dark:bg-slate-800">
        +
      </span>
      <span className="text-[11px] leading-tight font-medium text-slate-700 dark:text-slate-200">Other</span>
      <span className="text-[10px] leading-tight text-slate-400">Add your own</span>
    </button>
  );
}
