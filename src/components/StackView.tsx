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

  // What is in focus: a hovered or selected tool, or a selected connection.
  const focusToolId = hoverId ?? selectedToolId;
  const litEdges = useMemo(() => {
    if (selectedEdgeId && !hoverId) return new Set([selectedEdgeId]);
    if (!focusToolId) return new Set<string>();
    return new Set(routes.filter((r) => r.a === focusToolId || r.b === focusToolId).map((r) => r.id));
  }, [routes, focusToolId, selectedEdgeId, hoverId]);
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

  const typesShown = INTEGRATION_TYPES.filter((type) => routes.some((r) => r.edge.integrationType === type));
  const colors = [...new Set([...INTEGRATION_TYPES.map((t) => TYPE_META[t].color), QUIET])];

  return (
    <div
      ref={scrollRef}
      onClick={props.onClearSelection}
      className="thin-scroll absolute inset-0 overflow-auto bg-slate-50 p-4 pt-16 pb-44 @max-[440px]:pt-24 dark:bg-slate-950"
    >
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        {layout.strips.map((strip) => (
          <Fragment key={strip.layer.id}>
            <div
              className="absolute rounded-2xl border"
              style={{
                left: strip.x,
                top: strip.y,
                width: strip.w,
                height: strip.h,
                background: `${strip.layer.color}12`,
                borderColor: `${strip.layer.color}55`,
                borderStyle: strip.layer.band ? "dashed" : "solid",
              }}
            >
              <div className="flex items-baseline gap-2 px-3 pt-2">
                <span className="text-[13px] font-bold" style={{ color: strip.layer.color }}>
                  {strip.layer.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{strip.layer.subtitle}</span>
              </div>
            </div>
            {strip.boxes.map((box) => {
              const category = CATEGORIES_BY_ID[box.categoryId];
              return (
                <div
                  key={`${strip.layer.id}:${box.categoryId}`}
                  className="absolute rounded-xl border bg-white/80 dark:bg-slate-900/70"
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: `${category?.color ?? QUIET}66` }}
                >
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    <span className="size-1.5 rounded-full" style={{ background: category?.color ?? QUIET }} />
                    {category?.label ?? "Other"}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}

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
            const lit = litEdges.has(r.id);
            const color = TYPE_META[r.edge.integrationType].color;
            const stroke = lit || (showAll && !hasFocus) ? color : QUIET;
            const quiet = !lit && !(showAll && !hasFocus);
            const opacity = lit ? 1 : hasFocus ? 0.08 : showAll ? 0.85 : 0.3;
            const arrow = quiet ? undefined : `url(#stack-arrow-${stroke.slice(1)})`;
            const twoWay = r.edge.direction === "two-way";
            const markerEnd = !r.flipped || twoWay ? arrow : undefined;
            const markerStart = r.flipped || twoWay ? arrow : undefined;
            return (
              <g key={r.id} opacity={opacity}>
                <path
                  d={r.path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={lit ? 2.5 : quiet ? 1.25 : 1.75}
                  markerEnd={markerEnd}
                  markerStart={markerStart}
                />
                <path
                  d={r.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="pointer-events-auto cursor-pointer"
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
                    <ToolLogo tool={tool} className="size-9" />
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
          const lit = litEdges.has(r.id);
          if (!(lit || (showAll && !hasFocus))) return null;
          const meta = TYPE_META[r.edge.integrationType];
          return (
            <button
              key={`label:${r.id}`}
              type="button"
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

      {typesShown.length > 0 && (
        <ul className="mx-auto mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400" style={{ width: layout.width }}>
          <li className="font-semibold">Connections:</li>
          {typesShown.map((type) => (
            <li key={type} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: TYPE_META[type].color }} />
              {TYPE_META[type].label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
