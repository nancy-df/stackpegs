import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import { CATEGORIES, CATEGORIES_BY_ID, MAX_CANVAS_TOOLS, TOOLS } from "../shared/catalog";
import { CUSTOM_NAME_MAX, customToolId, normalizeCustomName, splitToolNames } from "../shared/custom";
import { defaultLayerId } from "../shared/layers";
import { DetailPanel, edgeId } from "./components/DetailPanel";
import { GuidanceBar } from "./components/GuidanceBar";
import { IntegrationEdgeView, type IntegrationFlowEdge } from "./components/IntegrationEdgeView";
import { Sidebar } from "./components/Sidebar";
import { StackView } from "./components/StackView";
import { DRAG_MIME } from "./components/ToolTile";
import { ToolNode, type ToolFlowNode } from "./components/ToolNode";
import { PanelToggle } from "./components/PanelToggle";
import { useIntegrations } from "./hooks/useIntegrations";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { buildHtml, downloadHtml } from "./lib/exportHtml";
import { TYPE_META } from "./lib/integrationTypes";
import { NODE_W, freeSpot, layoutNodes } from "./lib/layout";
import { getTool, registerCustomTool } from "./lib/tools";

const nodeTypes = { tool: ToolNode };
const edgeTypes = { integration: IntegrationEdgeView };

export default function App() {
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}

function Workspace() {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]!.id);
  const [nodes, setNodes, onNodesChange] = useNodesState<ToolFlowNode>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [layouting, setLayouting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [view, setView] = useState<"stack" | "free">("stack");
  const [showAllConnections, setShowAllConnections] = useState(true);
  const [layerOverrides, setLayerOverrides] = useState<Record<string, string>>({});
  // Panels can only be collapsed in the desktop layout; on narrow screens they always show.
  const isDesktop = useIsDesktop();
  const showLeft = leftOpen || !isDesktop;
  const showRight = rightOpen || !isDesktop;
  const { screenToFlowPosition, fitView } = useReactFlow();
  const canvasRef = useRef<HTMLElement>(null);

  const presentKey = nodes.map((n) => n.id).sort().join(",");
  const toolIds = useMemo(() => (presentKey ? presentKey.split(",") : []), [presentKey]);
  const onCanvas = useMemo(() => new Set(toolIds), [toolIds]);

  const integrations = useIntegrations(toolIds);

  const visibleEdges = useMemo(
    () =>
      (integrations.result?.edges ?? []).filter((e) => onCanvas.has(e.source) && onCanvas.has(e.target)),
    [integrations.result, onCanvas],
  );

  const selectEdge = useCallback((id: string) => {
    setSelectedEdgeId(id);
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
  }, [setNodes]);

  const flowEdges = useMemo<IntegrationFlowEdge[]>(
    () =>
      visibleEdges.map((e) => {
        const id = edgeId(e);
        const color = TYPE_META[e.integrationType].color;
        const marker = { type: MarkerType.ArrowClosed, color, width: 18, height: 18 };
        return {
          id,
          source: e.source,
          target: e.target,
          type: "integration",
          selected: id === selectedEdgeId,
          data: { edge: e, onSelect: selectEdge },
          markerEnd: marker,
          markerStart: e.direction === "two-way" ? marker : undefined,
        };
      }),
    [visibleEdges, selectedEdgeId, selectEdge],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const runLayout = useCallback(() => {
    setLayouting(true);
    // Measure the canvas itself: the flow's own size is 0 while the Stack view is showing.
    const box = canvasRef.current;
    const viewport = { width: Math.max(box?.clientWidth ?? 0, 300), height: Math.max(box?.clientHeight ?? 0, 300) };
    setNodes((nds) => layoutNodes(nds, visibleEdges, viewport));
    setTimeout(() => fitView({ padding: 0.12, duration: 450, maxZoom: 1 }), 80);
    setTimeout(() => setLayouting(false), 700);
  }, [setNodes, visibleEdges, fitView]);

  useEffect(() => {
    if (view === "free" && integrations.version > 0 && visibleEdges.length > 0) runLayout();
    // Re-arrange only when a new integration result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrations.version]);

  // Opening the Free view arranges the tools left to right and fits them to the screen.
  useEffect(() => {
    if (view !== "free" || nodes.length < 2) return;
    const timer = setTimeout(runLayout, 60);
    return () => clearTimeout(timer);
    // Only when the view changes, so manual dragging is not undone by unrelated updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Adds several tools in one go, each at its own free spot. Returns any notices for the visitor.
  const addTools = useCallback(
    (toolIds: string[], dropPosition?: XYPosition): string[] => {
      let current: ToolFlowNode[] = nodes;
      const added: ToolFlowNode[] = [];
      const alreadyThere: string[] = [];
      let skippedForLimit = 0;

      for (const toolId of new Set(toolIds)) {
        const tool = getTool(toolId);
        if (!tool) continue;
        if (current.some((n) => n.id === toolId)) {
          alreadyThere.push(tool.name);
          continue;
        }
        if (current.length >= MAX_CANVAS_TOOLS) {
          skippedForLimit++;
          continue;
        }
        const position = dropPosition
          ? { x: dropPosition.x - NODE_W / 2, y: dropPosition.y - 36 }
          : freeSpot(current);
        const node: ToolFlowNode = { id: toolId, type: "tool", position, data: { toolId } };
        current = [...current, node];
        added.push(node);
      }

      if (added.length > 0) {
        setNodes((nds) => [...nds.map((n) => (n.selected ? { ...n, selected: false } : n)), ...added]);
        setSelectedEdgeId(null);
      } else if (alreadyThere.length > 0 && toolIds.length === 1) {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === toolIds[0] })));
      }

      const notices: string[] = [];
      if (alreadyThere.length > 0) {
        notices.push(`${alreadyThere.join(", ")} ${alreadyThere.length === 1 ? "is" : "are"} already on the canvas.`);
      }
      if (skippedForLimit > 0) {
        notices.push(`The canvas holds up to ${MAX_CANVAS_TOOLS} tools. Remove one to add more.`);
      }
      if (notices.length > 0) setNotice(notices.join(" "));
      return notices;
    },
    [nodes, setNodes],
  );

  const addTool = useCallback(
    (toolId: string, dropPosition?: XYPosition) => {
      addTools([toolId], dropPosition);
    },
    [addTools],
  );

  // Takes "Acme Timer, Foo Tracker" and adds each name. Returns an error message, or null on success.
  const addCustomTools = useCallback(
    (raw: string, categoryId: string): string | null => {
      const parts = splitToolNames(raw);
      if (parts.length === 0) return "Type at least one tool name. Separate several with commas.";
      if (parts.length > MAX_CANVAS_TOOLS) return `Add up to ${MAX_CANVAS_TOOLS} tools at a time.`;
      if (!CATEGORIES_BY_ID[categoryId]) return "Choose what kind of tool it is.";

      const invalid = parts.filter((part) => !normalizeCustomName(part));
      if (invalid.length > 0) {
        const shown = invalid.map((n) => `"${n.slice(0, CUSTOM_NAME_MAX)}"`).join(", ");
        return `Can't use ${shown}. Names can be up to ${CUSTOM_NAME_MAX} characters: letters, numbers, spaces and . & + - ' / _ ( ) only.`;
      }

      const ids: string[] = [];
      const usedCatalog: string[] = [];
      for (const part of parts) {
        const name = normalizeCustomName(part)!;
        const slug = customToolId(name, categoryId).split(":").pop();
        const listed = TOOLS.find((t) => t.name.toLowerCase() === name.toLowerCase() || t.id === slug);
        if (listed) {
          ids.push(listed.id);
          usedCatalog.push(listed.name);
        } else {
          ids.push(registerCustomTool(name, categoryId).id);
        }
      }

      const notices = addTools(ids);
      if (usedCatalog.length > 0) {
        notices.unshift(`${usedCatalog.join(", ")} ${usedCatalog.length === 1 ? "is" : "are"} in the catalog, so I used that.`);
        setNotice(notices.join(" "));
      }
      return null;
    },
    [addTools],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const toolId = e.dataTransfer.getData(DRAG_MIME);
      if (!toolId) return;
      // The stack view places tools itself, so only the free canvas needs the drop position.
      addTool(toolId, view === "free" ? screenToFlowPosition({ x: e.clientX, y: e.clientY }) : undefined);
    },
    [addTool, screenToFlowPosition, view],
  );

  const selectNode = useCallback(
    (toolId: string) => {
      setSelectedEdgeId(null);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === toolId })));
    },
    [setNodes],
  );

  const clearSelection = useCallback(() => {
    setSelectedEdgeId(null);
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
  }, [setNodes]);

  const removeTool = useCallback(
    (toolId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== toolId));
      setSelectedEdgeId(null);
    },
    [setNodes],
  );

  const layerOf = useCallback(
    (toolId: string) => layerOverrides[toolId] ?? defaultLayerId(getTool(toolId) ?? { categoryId: "other" }),
    [layerOverrides],
  );

  const moveToLayer = useCallback((toolId: string, layerId: string) => {
    setLayerOverrides((prev) => ({ ...prev, [toolId]: layerId }));
  }, []);

  // Tools in the order they were added; the key keeps the array stable while only selection or positions change.
  const orderKey = nodes.map((n) => n.id).join(",");
  const orderedToolIds = useMemo(() => (orderKey ? orderKey.split(",") : []), [orderKey]);

  const downloadCanvas = useCallback(async () => {
    setExporting(true);
    try {
      const html = await buildHtml({
        nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
        edges: visibleEdges,
        summary: integrations.result?.summary ?? null,
        stack: view === "stack" ? { toolIds: orderedToolIds, layerOf } : undefined,
      });
      downloadHtml(html, `stackpegs-integration-map-${new Date().toISOString().slice(0, 10)}.html`);
    } catch {
      setNotice("Could not create the HTML file. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [nodes, visibleEdges, integrations.result, view, orderedToolIds, layerOf]);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setSelectedEdgeId(null);
  }, [setNodes]);

  const selectedNodeId = nodes.find((n) => n.selected)?.id ?? null;
  const busy = integrations.status === "loading";

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">S</div>
        <h1 className="text-sm font-semibold">StackPegs</h1>
        <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
          See how your tools connect and where the data flows.
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar
          open={showLeft}
          categoryId={categoryId}
          onSelectCategory={setCategoryId}
          onAddTool={(id) => addTool(id)}
          onAddCustom={addCustomTools}
          onCanvas={onCanvas}
        />

        <section ref={canvasRef} className="@container relative min-h-[420px] flex-1 lg:min-h-0" onDragOver={onDragOver} onDrop={onDrop}>
          {view === "stack" ? (
            <StackView
              toolIds={orderedToolIds}
              edges={visibleEdges}
              layerOf={layerOf}
              selectedToolId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              showAll={showAllConnections}
              onSelectTool={selectNode}
              onSelectEdge={selectEdge}
              onClearSelection={clearSelection}
              onRemoveTool={removeTool}
            />
          ) : (
            <ReactFlow<ToolFlowNode, IntegrationFlowEdge>
              className={layouting ? "layouting" : undefined}
              nodes={nodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeClick={() => setSelectedEdgeId(null)}
              onEdgeClick={(_, edge) => selectEdge(edge.id)}
              onPaneClick={() => setSelectedEdgeId(null)}
              nodesConnectable={false}
              elementsSelectable
              colorMode="system"
              minZoom={0.3}
              maxZoom={1.6}
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}

          {busy && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute inset-0 z-[5] grid place-items-center p-6"
            >
              <div className="flex max-w-sm flex-col items-center gap-3 rounded-3xl bg-white/75 px-10 py-7 text-center shadow-sm backdrop-blur-[2px] dark:bg-slate-900/75">
                <span className="size-10 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
                <p className="animate-pulse text-2xl font-bold tracking-tight text-slate-500 dark:text-slate-300">
                  Mapping integrations...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The AI is working out how your tools connect. This usually takes a few seconds.
                </p>
              </div>
            </div>
          )}

          <div className="absolute top-[15px] right-9 left-9 z-10 flex flex-wrap justify-end gap-1.5 @max-[440px]:gap-1">
            <ToolbarButton
              onClick={() => setView((v) => (v === "stack" ? "free" : "stack"))}
              title={
                view === "stack"
                  ? "Show a free-flowing diagram you can rearrange"
                  : "Group tools into layers by kind"
              }
              disabled={nodes.length === 0}
            >
              <span className="@max-[440px]:hidden">{view === "stack" ? "Ungroup apps" : "Group apps"}</span>
              <span className="hidden @max-[440px]:inline">{view === "stack" ? "Ungroup" : "Group"}</span>
            </ToolbarButton>
            {view === "stack" ? (
              <ToolbarButton
                aria-pressed={showAllConnections}
                onClick={() => setShowAllConnections((v) => !v)}
                disabled={visibleEdges.length === 0}
                title="Show every connection as a grey arrow, or only the ones for the tool you point at"
                className={showAllConnections ? "!border-indigo-500 !bg-indigo-50 !text-indigo-700" : undefined}
              >
                <span className="@max-[440px]:hidden">All connections</span>
                <span className="hidden @max-[440px]:inline">Connections</span>
              </ToolbarButton>
            ) : (
              <ToolbarButton onClick={runLayout} disabled={nodes.length < 2}>
                Auto-layout
              </ToolbarButton>
            )}
            <ToolbarButton onClick={downloadCanvas} disabled={nodes.length === 0 || exporting}>
              {exporting ? "Preparing..." : (
                <>
                  Download<span className="hidden @min-[440px]:inline"> HTML</span>
                </>
              )}
            </ToolbarButton>
            <ToolbarButton onClick={clearCanvas} disabled={nodes.length === 0}>
              Clear
            </ToolbarButton>
          </div>

          {(notice || nodes.length >= 2) && (
            <div className="absolute bottom-[15px] left-1/2 z-10 flex w-[min(480px,calc(100%-104px))] -translate-x-1/2 flex-col gap-2">
              {integrations.status === "error" && !showRight && (
                <div
                  role="alert"
                  className="flex max-w-full items-center gap-2 self-center rounded-2xl bg-red-700 py-1.5 pr-1.5 pl-3 text-xs font-medium text-white shadow-lg"
                >
                  <span>{integrations.error ?? "Something went wrong."}</span>
                  <button
                    type="button"
                    onClick={() => integrations.regenerate()}
                    className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 hover:bg-white/30"
                  >
                    Retry
                  </button>
                </div>
              )}
              {notice && (
                <div role="status" className="self-center rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                  {notice}
                </div>
              )}
              {nodes.length >= 2 && <GuidanceBar busy={busy} onRegenerate={integrations.regenerate} />}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-xl">
                <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl border-2 border-dashed border-slate-300 text-4xl text-slate-400 dark:border-slate-600">
                  +
                </div>
                <p className="text-3xl leading-tight font-bold tracking-tight text-slate-500 sm:text-4xl dark:text-slate-400">
                  Drag the tool logos here to start your integration map
                </p>
                <p className="mt-3 text-sm text-slate-400">Add two or more tools to see how they integrate.</p>
              </div>
            </div>
          )}

          <PanelToggle side="left" open={showLeft} label="tools panel" onClick={() => setLeftOpen((v) => !v)} />
          <PanelToggle side="right" open={showRight} label="integration map" onClick={() => setRightOpen((v) => !v)} />
        </section>

        <DetailPanel
          layerControl={
            view === "stack" && selectedNodeId
              ? { value: layerOf(selectedNodeId), onChange: (layerId) => moveToLayer(selectedNodeId, layerId) }
              : undefined
          }
          open={showRight}
          toolIds={toolIds}
          edges={visibleEdges}
          summary={integrations.result?.summary ?? null}
          status={integrations.status}
          error={integrations.error}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onRetry={() => integrations.regenerate()}
        />
      </main>
    </div>
  );
}

function ToolbarButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-slate-700 @max-[440px]:px-2 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
