import { CATEGORIES } from "../../shared/catalog";
import { placeholderToolId } from "../../shared/custom";
import { getTool } from "../lib/tools";
import { AddByNameForm } from "./AddByNameForm";
import { ToolTile } from "./ToolTile";

type Props = {
  initialText: string;
  onCanvas: Set<string>;
  onAddCustom: (names: string, categoryId: string) => string | null;
  onAddTool: (toolId: string) => void;
};

export function OtherPanel({ initialText, onCanvas, onAddCustom, onAddTool }: Props) {
  return (
    <div>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        2. Add your own tools
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Tool not listed? Type its name. If the AI doesn't know it, it will treat it as a typical tool of the
        kind you pick.
      </p>

      <AddByNameForm initialText={initialText} autoFocus onAdd={onAddCustom} />

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
