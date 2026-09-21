import { CATEGORIES_BY_ID, TOOLS_BY_ID } from "../../shared/catalog";
import type { IntegrationEdge } from "../../shared/schema";
import type { IntegrationStatus } from "../hooks/useIntegrations";
import { TYPE_META } from "../lib/integrationTypes";
import { ToolLogo } from "./ToolLogo";

export const edgeId = (e: Pick<IntegrationEdge, "source" | "target">) => `${e.source}|${e.target}`;

type Props = {
  toolIds: string[];
  edges: IntegrationEdge[];
  summary: string | null;
  status: IntegrationStatus;
  error: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (toolId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onRetry: () => void;
};

function ToolChip({ toolId }: { toolId: string }) {
  const tool = TOOLS_BY_ID[toolId];
  if (!tool) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-1.5 py-1 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
      <ToolLogo tool={tool} className="size-4" />
      {tool.name}
    </span>
  );
}

function TypeBadge({ type }: { type: IntegrationEdge["integrationType"] }) {
  const meta = TYPE_META[type];
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, borderColor: meta.color }}
      title={meta.hint}
    >
      {meta.label}
    </span>
  );
}

function EdgeRow({ edge, onClick }: { edge: IntegrationEdge; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <ToolChip toolId={edge.source} />
          <span className="text-slate-400">{edge.direction === "two-way" ? "⇄" : "→"}</span>
          <ToolChip toolId={edge.target} />
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">{edge.dataFlow}</p>
          <TypeBadge type={edge.integrationType} />
        </div>
      </button>
    </li>
  );
}

export function DetailPanel(props: Props) {
  const { toolIds, edges, summary, status, error, selectedNodeId, selectedEdgeId } = props;
  const selectedEdge = selectedEdgeId ? edges.find((e) => edgeId(e) === selectedEdgeId) : undefined;
  const selectedTool = selectedNodeId ? TOOLS_BY_ID[selectedNodeId] : undefined;

  let body: React.ReactNode;

  if (selectedEdge) {
    body = (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolChip toolId={selectedEdge.source} />
          <span className="text-slate-400">{selectedEdge.direction === "two-way" ? "⇄" : "→"}</span>
          <ToolChip toolId={selectedEdge.target} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TypeBadge type={selectedEdge.integrationType} />
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {selectedEdge.direction === "two-way" ? "Two-way sync" : "One-way flow"}
          </span>
        </div>
        <Field label="What flows">{selectedEdge.dataFlow}</Field>
        <Field label="Typical use">{selectedEdge.useCase}</Field>
        <Field label="Method">{TYPE_META[selectedEdge.integrationType].hint}</Field>
      </div>
    );
  } else if (selectedTool) {
    const related = edges.filter((e) => e.source === selectedTool.id || e.target === selectedTool.id);
    body = (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl border bg-white">
            <ToolLogo tool={selectedTool} className="size-8" />
          </div>
          <div>
            <div className="font-semibold">{selectedTool.name}</div>
            <div className="text-xs text-slate-500">{CATEGORIES_BY_ID[selectedTool.categoryId]?.label}</div>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{selectedTool.description}</p>
        <a
          href={selectedTool.website}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Visit website
        </a>
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-slate-500 uppercase">Connections on this canvas</h3>
          {related.length === 0 ? (
            <p className="text-xs text-slate-500">
              {status === "loading" ? "Mapping integrations..." : "No connections found with the other tools here."}
            </p>
          ) : (
            <ul className="space-y-2">
              {related.map((e) => (
                <EdgeRow key={edgeId(e)} edge={e} onClick={() => props.onSelectEdge(edgeId(e))} />
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } else if (toolIds.length === 0) {
    body = <Empty title="Your canvas is empty" text="Pick a category, then drag a tool logo onto the canvas." />;
  } else if (toolIds.length === 1) {
    body = <Empty title="Add one more tool" text="Drop a second tool on the canvas to see how the two connect." />;
  } else {
    body = (
      <div className="space-y-4">
        {status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={props.onRetry}
              className="mt-2 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}
        {summary && (
          <div>
            <h3 className="mb-1 text-xs font-semibold text-slate-500 uppercase">How they work together</h3>
            <p className="text-sm text-slate-700 dark:text-slate-200">{summary}</p>
          </div>
        )}
        {status === "loading" && !summary && (
          <p className="text-sm text-slate-500">Mapping integrations between {toolIds.length} tools...</p>
        )}
        {edges.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-slate-500 uppercase">
              Connections ({edges.length})
            </h3>
            <ul className="space-y-2">
              {edges.map((e) => (
                <EdgeRow key={edgeId(e)} edge={e} onClick={() => props.onSelectEdge(edgeId(e))} />
              ))}
            </ul>
          </div>
        )}
        {status === "ready" && edges.length === 0 && (
          <p className="text-sm text-slate-500">No direct integrations were found between these tools.</p>
        )}
      </div>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white lg:w-72 lg:shrink-0 lg:border-t-0 lg:border-l dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {selectedEdge ? "Integration" : selectedTool ? "Tool" : "3. Integration map"}
        </h2>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">{body}</div>
      <p className="border-t border-slate-200 px-4 py-2.5 text-[11px] leading-snug text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Integration details are AI-generated and may be incomplete or wrong. Check each vendor's docs before relying on them.
      </p>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-0.5 text-xs font-semibold text-slate-500 uppercase">{label}</h3>
      <p className="text-sm text-slate-700 dark:text-slate-200">{children}</p>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
