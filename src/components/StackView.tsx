import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES_BY_ID } from "../../shared/catalog";
import { INTEGRATION_TYPES, type IntegrationEdge } from "../../shared/schema";
import { TYPE_META } from "../lib/integrationTypes";
import { layoutStack, routeStackEdges } from "../lib/stackLayout";
import { getTool } from "../lib/tools";
import { ToolLogo } from "./ToolLogo";

type Props = {
  toolIds: string[];
  edges: IntegrationEdge[];
  layerOf: (toolId: string) => string;
  selectedToolId: string | null;
  selectedEdgeId: string | null;
  showAll: boolean;
  onSelectTool: (toolId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  onRemoveTool: (toolId: string) => void;
};

const QUIET = "#94a3b8";

export function StackView(props: Props) {
  const { toolIds, edges, layerOf, selectedToolId, selectedEdgeId, showAll } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.floor(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      layoutStack(
        toolIds.flatMap((id) => {
          const tool = getTool(id);
          return tool ? [{ toolId: id, categoryId: tool.categoryId }] : [];
        }),
        width,
        layerOf,
      ),
    [toolIds, width, layerOf],
  );
  const routes = useMemo(() => routeStackEdges(layout, edges), [layout, edges]);

  // A short delay before un-hovering a line lets the pointer travel from the line onto its label.
  const clearEdgeTimer = useRef<number | undefined>(undefined);
  const enterEdge = (id: string) => {
    window.clearTimeout(clearEdgeTimer.current);
    setHoverEdgeId(id);
  };
  const leaveEdge = () => {
    window.clearTimeout(clearEdgeTimer.current);
    clearEdgeTimer.current = window.setTimeout(() => setHoverEdgeId(null), 150);
  };

  // What is in focus: a hovered line, a hovered or selected tool, or a selected connection.
  const focusToolId = hoverId ?? selectedToolId;
  const litEdges = useMemo(() => {
    if (hoverEdgeId) return new Set([hoverEdgeId]);
    if (selectedEdgeId && !hoverId) return new Set([selectedEdgeId]);
    if (!focusToolId) return new Set<string>();
    return new Set(routes.filter((r) => r.a === focusToolId || r.b === focusToolId).map((r) => r.id));
  }, [routes, focusToolId, selectedEdgeId, hoverId, hoverEdgeId]);
  const litTools = useMemo(() => {
    const set = new Set<string>();
    if (focusToolId) set.add(focusToolId);
    for (const r of routes) {
      if (!litEdges.has(r.id)) continue;
      set.add(r.a);
      set.add(r.b);
    }
    return set;
  }, [routes, litEdges, focusToolId]);
  const hasFocus = litEdges.size > 0 || !!focusToolId;

  const colors = [...new Set([...INTEGRATION_TYPES.map((t) => TYPE_META[t].color), QUIET])];

  return (
    <div
      ref={scrollRef}
      onClick={props.onClearSelection}
      className="thin-scroll absolute inset-0 overflow-auto bg-slate-50 p-4 pt-16 pb-44 @max-[440px]:pt-24 dark:bg-slate-950"
    >
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        {layout.strips.map((strip, index) => {
          const grey = index % 2 === 0;
          return (
          <Fragment key={strip.layer.id}>
            <div
              className={`absolute rounded-xl border border-slate-200 dark:border-slate-700 ${
                grey ? "bg-slate-100 dark:bg-slate-800/70" : "bg-white dark:bg-slate-900"
              }`}
              style={{ left: strip.x, top: strip.y, width: strip.w, height: strip.h }}
            >
              <div className="flex items-baseline gap-2 px-3 pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{strip.layer.title}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{strip.layer.subtitle}</span>
              </div>
            </div>
            {strip.boxes.map((box) => {
              const category = CATEGORIES_BY_ID[box.categoryId];
              return (
                <div
                  key={`${strip.layer.id}:${box.categoryId}`}
                  className={`absolute rounded-lg border border-slate-200 dark:border-slate-700 ${
                    grey ? "bg-white dark:bg-slate-900/80" : "bg-slate-50 dark:bg-slate-800/60"
                  }`}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                >
                  <div className="flex items-center gap-1.5 px-2.5 pt-1.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    <span className="size-1.5 rounded-full" style={{ background: category?.color ?? QUIET }} />
                    {category?.label ?? "Other"}
                  </div>
                </div>
              );
            })}
          </Fragment>
          );
        })}

        <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
          <defs>
            {colors.map((c) => (
              <marker
                key={c}
                id={`stack-arrow-${c.slice(1)}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {routes.map((r) => {
            // Grey arrows by default; the type color appears only for the connections in focus.
            const lit = litEdges.has(r.id);
            const interactive = lit || (!hasFocus && showAll);
            const stroke = lit ? TYPE_META[r.edge.integrationType].color : QUIET;
            const opacity = lit ? 1 : hasFocus ? 0.08 : showAll ? 0.9 : 0;
            const arrow = `url(#stack-arrow-${stroke.slice(1)})`;
            const twoWay = r.edge.direction === "two-way";
            const markerEnd = !r.flipped || twoWay ? arrow : undefined;
            const markerStart = r.flipped || twoWay ? arrow : undefined;
            return (
              <g key={r.id} opacity={opacity}>
                <path
                  d={r.path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={lit ? 2 : 1.5}
                  markerEnd={markerEnd}
                  markerStart={markerStart}
                />
                <path
                  d={r.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className={interactive ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
                  onMouseEnter={() => enterEdge(r.id)}
                  onMouseLeave={leaveEdge}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onSelectEdge(r.id);
                  }}
                />
              </g>
            );
          })}
        </svg>

        {layout.strips.flatMap((strip) =>
          strip.boxes.flatMap((box) =>
            box.tiles.map((tile) => {
              const tool = getTool(tile.toolId);
              if (!tool) return null;
              const category = CATEGORIES_BY_ID[tool.categoryId];
              const selected = selectedToolId === tile.toolId;
              const dim = hasFocus && !litTools.has(tile.toolId);
              return (
                <div
                  key={tile.toolId}
                  className={`group absolute transition-opacity ${dim ? "opacity-50" : ""}`}
                  style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
                  onMouseEnter={() => setHoverId(tile.toolId)}
                  onMouseLeave={() => setHoverId((id) => (id === tile.toolId ? null : id))}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onSelectTool(tile.toolId);
                    }}
                    onFocus={() => setHoverId(tile.toolId)}
                    onBlur={() => setHoverId((id) => (id === tile.toolId ? null : id))}
                    className={`flex size-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-white p-1.5 text-center shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none ${
                      selected ? "ring-4 ring-indigo-500/30" : litTools.has(tile.toolId) && hasFocus ? "ring-2 ring-indigo-300" : ""
                    }`}
                    style={{ borderColor: category?.color ?? QUIET, borderStyle: tool.placeholder ? "dashed" : "solid" }}
                  >
                    <ToolLogo tool={tool} className="size-7" />
                    <span className="line-clamp-2 text-[11px] leading-tight font-semibold text-slate-800">{tool.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${tool.name} from canvas`}
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onRemoveTool(tile.toolId);
                    }}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-slate-800 text-xs leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    ×
                  </button>
                </div>
              );
            }),
          ),
        )}

        {routes.map((r) => {
          // Labels (Native, API, Data pipeline, ...) appear only for the connections in focus.
          if (!litEdges.has(r.id)) return null;
          const meta = TYPE_META[r.edge.integrationType];
          return (
            <button
              key={`label:${r.id}`}
              type="button"
              onMouseEnter={() => enterEdge(r.id)}
              onMouseLeave={leaveEdge}
              onClick={(e) => {
                e.stopPropagation();
                props.onSelectEdge(r.id);
              }}
              className="absolute rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm hover:shadow-md"
              style={{
                left: r.label.x,
                top: r.label.y,
                transform: "translate(-50%, -50%)",
                color: meta.color,
                borderColor: meta.color,
                outline: selectedEdgeId === r.id ? `2px solid ${meta.color}` : undefined,
                outlineOffset: 2,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
