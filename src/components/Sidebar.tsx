import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORIES_BY_ID, GROUPS, TOOLS, type Tool } from "../../shared/catalog";
import { CUSTOM_NAME_MAX } from "../../shared/custom";
import { AddByNameForm } from "./AddByNameForm";
import { OtherPanel } from "./OtherPanel";
import { OtherTile, ToolTile } from "./ToolTile";

type Props = {
  open: boolean;
  categoryId: string;
  onSelectCategory: (id: string) => void;
  onAddTool: (toolId: string) => void;
  onAddCustom: (names: string, categoryId: string) => string | null;
  onCanvas: Set<string>;
  onRemoveTool: (toolId: string) => void;
};

const OTHER_ID = "other";

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

const ROW =
  "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors lg:w-full lg:rounded-md lg:border-transparent lg:px-2 lg:py-1 lg:text-left";
const ROW_IDLE =
  "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 lg:bg-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:dark:bg-transparent";

export function Sidebar({ open, categoryId, onSelectCategory, onAddTool, onAddCustom, onCanvas, onRemoveTool }: Props) {
  const [query, setQuery] = useState("");
  const [prefill, setPrefill] = useState({ text: "", nonce: 0 });
  // Which category's inline "Other" box is open (only one at a time).
  const [otherBoxFor, setOtherBoxFor] = useState<string | null>(null);

  const isOther = categoryId === OTHER_ID;
  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]!;
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchTools(query), [query]);
  const tools = searching ? results : isOther ? [] : TOOLS.filter((t) => t.categoryId === category.id);
  const otherBoxOpen = !searching && !isOther && otherBoxFor === category.id;

  const addFromSearch = () => {
    setPrefill((p) => ({ text: query.trim().slice(0, CUSTOM_NAME_MAX), nonce: p.nonce + 1 }));
    setQuery("");
    onSelectCategory(OTHER_ID);
  };

  return (
    <aside
      inert={!open}
      aria-hidden={!open}
      className={`flex min-h-0 flex-col overflow-hidden border-b border-slate-200 bg-white lg:shrink-0 lg:border-b-0 lg:transition-[width] lg:duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        open ? "lg:w-[400px] lg:border-r" : "lg:w-0 lg:border-r-0"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col lg:w-[400px]">
      <div className="shrink-0 border-b border-slate-200 p-3 dark:border-slate-800">
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

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Categories"
          className="flex max-h-[36vh] shrink-0 flex-col border-b border-slate-200 lg:max-h-none lg:w-[184px] lg:border-r lg:border-b-0 dark:border-slate-800"
        >
          <div className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            <h2 className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              1. Category
            </h2>
            {GROUPS.map((group) => (
              <div key={group.id}>
                <div className="mb-1 px-1 text-[11px] font-medium text-slate-400">{group.label}</div>
                <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
                  {CATEGORIES.filter((c) => c.groupId === group.id).map((c) => {
                    const active = !searching && !isOther && c.id === category.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setQuery("");
                          onSelectCategory(c.id);
                        }}
                        className={`${ROW} ${active ? "text-white" : ROW_IDLE}`}
                        style={active ? { background: c.color, borderColor: c.color } : undefined}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: active ? "#fff" : c.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-slate-200 p-2.5 dark:border-slate-800">
            <div className="mb-1 px-1 text-[11px] font-medium text-slate-400">Not listed?</div>
            <button
              type="button"
              aria-pressed={!searching && isOther}
              onClick={() => {
                setQuery("");
                onSelectCategory(OTHER_ID);
              }}
              className={`${ROW} ${
                !searching && isOther ? "border-slate-700 bg-slate-700 text-white" : ROW_IDLE
              }`}
            >
              <span className="grid size-2 shrink-0 place-items-center text-[13px] leading-none" aria-hidden="true">
                +
              </span>
              <span className="truncate">Other</span>
            </button>
          </div>
        </nav>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {isOther && !searching ? (
            <OtherPanel
              key={prefill.nonce}
              initialText={prefill.text}
              onCanvas={onCanvas}
              onAddCustom={onAddCustom}
              onAddTool={onAddTool}
              onRemoveTool={onRemoveTool}
            />
          ) : (
            <>
              <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {searching ? "Search results" : "2. Drag onto the canvas"}
              </h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400" role="status">
                {searching
                  ? `${results.length} ${results.length === 1 ? "tool matches" : "tools match"} "${query.trim()}".`
                  : `${category.label}: ${tools.length} tools. Drag to the canvas, or click to add.`}
              </p>

              {(tools.length > 0 || !searching) && (
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                  {tools.map((tool) => (
                    <ToolTile
                      key={tool.id}
                      tool={tool}
                      added={onCanvas.has(tool.id)}
                      showCategory={searching}
                      onAdd={() => onAddTool(tool.id)}
                      onRemove={() => onRemoveTool(tool.id)}
                    />
                  ))}
                  {!searching && (
                    <OtherTile
                      open={otherBoxOpen}
                      onClick={() => setOtherBoxFor(otherBoxOpen ? null : category.id)}
                    />
                  )}
                </div>
              )}

              {otherBoxOpen && (
                <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <div className="mb-0.5 flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Add {category.label} tools
                    </h3>
                    <button
                      type="button"
                      onClick={() => setOtherBoxFor(null)}
                      className="-mt-0.5 -mr-1 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                      Close ✕
                    </button>
                  </div>
                  <p className="mb-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Not in the list? Type the names below. The AI treats unfamiliar ones as a typical tool in{" "}
                    {category.label}.
                  </p>
                  <AddByNameForm
                    key={category.id}
                    fixedCategoryId={category.id}
                    autoFocus
                    onAdd={onAddCustom}
                    onClose={() => setOtherBoxFor(null)}
                  />
                </div>
              )}

              {searching && (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-3 text-center dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {results.length === 0 ? "No tools found." : "Not the one you meant?"}
                  </p>
                  <button
                    type="button"
                    onClick={addFromSearch}
                    className="mt-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Add "{query.trim().slice(0, CUSTOM_NAME_MAX)}" as your own tool
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </aside>
  );
}
