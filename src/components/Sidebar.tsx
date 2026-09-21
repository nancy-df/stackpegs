import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORIES_BY_ID, GROUPS, TOOLS, type Tool } from "../../shared/catalog";
import { ToolLogo } from "./ToolLogo";

export const DRAG_MIME = "application/x-stackpegs-tool";

type Props = {
  categoryId: string;
  onSelectCategory: (id: string) => void;
  onAddTool: (toolId: string) => void;
  onCanvas: Set<string>;
};

function searchTools(query: string): Tool[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const scored: { tool: Tool; score: number }[] = [];
  for (const tool of TOOLS) {
    const name = tool.name.toLowerCase();
    const haystack = `${name} ${tool.id} ${CATEGORIES_BY_ID[tool.categoryId]?.label.toLowerCase() ?? ""} ${tool.description.toLowerCase()}`;
    if (!terms.every((t) => haystack.includes(t))) continue;
    const score = terms.every((t) => name.startsWith(t)) ? 0 : terms.every((t) => name.includes(t)) ? 1 : 2;
    scored.push({ tool, score });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.tool);
}

function ToolTile({
  tool,
  added,
  showCategory,
  onAdd,
}: {
  tool: Tool;
  added: boolean;
  showCategory: boolean;
  onAdd: () => void;
}) {
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
      className="group relative flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing dark:border-slate-700"
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

export function Sidebar({ categoryId, onSelectCategory, onAddTool, onCanvas }: Props) {
  const [query, setQuery] = useState("");
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]!;
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchTools(query), [query]);
  const tools = searching ? results : TOOLS.filter((t) => t.categoryId === category.id);

  return (
    <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
        <label className="relative block">
          <span className="sr-only">Search tools</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Search all tools..."
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {searching && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              ×
            </button>
          )}
        </label>
      </div>

      {!searching && (
        <div className="thin-scroll max-h-[36vh] shrink-0 space-y-3 overflow-y-auto border-b border-slate-200 p-4 lg:max-h-[42%] dark:border-slate-800">
          <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            1. Pick a category
          </h2>
          {GROUPS.map((group) => (
            <div key={group.id}>
              <div className="mb-1.5 text-[11px] font-medium text-slate-400">{group.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.filter((c) => c.groupId === group.id).map((c) => {
                  const active = c.id === category.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelectCategory(c.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                      style={active ? { background: c.color, borderColor: c.color } : undefined}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {searching ? "Search results" : "2. Drag onto the canvas"}
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400" role="status">
          {searching
            ? `${results.length} ${results.length === 1 ? "tool matches" : "tools match"} "${query.trim()}". Drag or click to add.`
            : `${category.label}: ${tools.length} popular tools. Click a logo to add it without dragging.`}
        </p>
        {searching && results.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No tools found. Try a different name or category.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {tools.map((tool) => (
              <ToolTile
                key={tool.id}
                tool={tool}
                added={onCanvas.has(tool.id)}
                showCategory={searching}
                onAdd={() => onAddTool(tool.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
