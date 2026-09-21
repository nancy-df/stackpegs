import { useState, type FormEvent } from "react";
import { CATEGORIES, GROUPS, OTHER_CATEGORY } from "../../shared/catalog";
import { CUSTOM_NAME_MAX, placeholderToolId } from "../../shared/custom";
import { getTool } from "../lib/tools";
import { ToolTile } from "./ToolTile";

type Props = {
  initialName: string;
  onCanvas: Set<string>;
  onAddCustom: (name: string, categoryId: string) => string | null;
  onAddTool: (toolId: string) => void;
};

export function OtherPanel({ initialName, onCanvas, onAddCustom, onAddTool }: Props) {
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState(OTHER_CATEGORY.id);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = onAddCustom(name, categoryId);
    setError(problem);
    if (!problem) setName("");
  };

  const field =
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        2. Add your own tool
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Tool not listed? Add it by name. If the AI doesn't know it, it will treat it as a typical tool of the
        type you pick.
      </p>

      <form onSubmit={submit} className="space-y-2.5" noValidate>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Tool name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={CUSTOM_NAME_MAX}
            placeholder="e.g. Acme Timer"
            autoComplete="off"
            spellCheck={false}
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">What kind of tool is it?</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
            <option value={OTHER_CATEGORY.id}>Other / not sure</option>
            {GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {CATEGORIES.filter((c) => c.groupId === group.id).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
        >
          Add to canvas
        </button>
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Or use a placeholder
        </h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Not sure which tool you use? Drop in a generic one to see how that kind of tool usually connects.
        </p>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
          {CATEGORIES.map((c) => {
            const id = placeholderToolId(c.id);
            const tool = getTool(id);
            if (!tool) return null;
            return (
              <ToolTile
                key={id}
                tool={tool}
                added={onCanvas.has(id)}
                showCategory={false}
                onAdd={() => onAddTool(id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
