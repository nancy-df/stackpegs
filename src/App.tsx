import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useStore,
  type XYPosition,
} from "@xyflow/react";
import { CATEGORIES, MAX_CANVAS_TOOLS, TOOLS_BY_ID } from "../shared/catalog";
import { DetailPanel, edgeId } from "./components/DetailPanel";
import { IntegrationEdgeView, type IntegrationFlowEdge } from "./components/IntegrationEdgeView";
import { DRAG_MIME, Sidebar } from "./components/Sidebar";
import { ToolNode, type ToolFlowNode } from "./components/ToolNode";
import { useIntegrations } from "./hooks/useIntegrations";
import { buildHtml, downloadHtml } from "./lib/exportHtml";
import { TYPE_META } from "./lib/integrationTypes";
import { NODE_W, freeSpot, layoutNodes } from "./lib/layout";

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
  const { screenToFlowPosition, fitView } = useReactFlow();
  const canvasWidth = useStore((s) => s.width);
  const canvasHeight = useStore((s) => s.height);

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
    const viewport = { width: Math.max(canvasWidth, 300), height: Math.max(canvasHeight, 300) };
    setNodes((nds) => layoutNodes(nds, visibleEdges, viewport));
    setTimeout(() => fitView({ padding: 0.2, duration: 450, maxZoom: 1.1 }), 60);
    setTimeout(() => setLayouting(false), 700);
  }, [setNodes, visibleEdges, fitView, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (integrations.version > 0 && visibleEdges.length > 0) runLayout();
    // Re-arrange only when a new integration result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrations.version]);

  const addTool = useCallback(
    (toolId: string, dropPosition?: XYPosition) => {
      if (!TOOLS_BY_ID[toolId]) return;
      if (onCanvas.has(toolId)) {
        setNotice(`${TOOLS_BY_ID[toolId]!.name} is already on the canvas.`);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === toolId })));
        return;
      }
      if (nodes.length >= MAX_CANVAS_TOOLS) {
        setNotice(`The canvas holds up to ${MAX_CANVAS_TOOLS} tools. Remove one to add another.`);
        return;
      }
      const position = dropPosition
        ? { x: dropPosition.x - NODE_W / 2, y: dropPosition.y - 36 }
        : freeSpot(nodes);
      setNodes((nds) => [
        ...nds.map((n) => (n.selected ? { ...n, selected: false } : n)),
        { id: toolId, type: "tool", position, data: { toolId } },
      ]);
      setSelectedEdgeId(null);
    },
    [nodes, onCanvas, setNodes],
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
      addTool(toolId, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [addTool, screenToFlowPosition],
  );

  const selectNode = useCallback(
    (toolId: string) => {
      setSelectedEdgeId(null);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === toolId })));
    },
    [setNodes],
  );

  const downloadCanvas = useCallback(async () => {
    setExporting(true);
    try {
      const html = await buildHtml({
        nodes: nodes.map((n) => ({ id: n.id, position: n.position })),
        edges: visibleEdges,
        summary: integrations.result?.summary ?? null,
      });
      downloadHtml(html, `stackpegs-integration-map-${new Date().toISOString().slice(0, 10)}.html`);
    } catch {
      setNotice("Could not create the HTML file. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [nodes, visibleEdges, integrations.result]);

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
          categoryId={categoryId}
          onSelectCategory={setCategoryId}
          onAddTool={(id) => addTool(id)}
          onCanvas={onCanvas}
        />

        <section className="relative min-h-[420px] flex-1 lg:min-h-0" onDragOver={onDragOver} onDrop={onDrop}>
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

            <Panel position="top-right" className="flex gap-1.5">
              <ToolbarButton onClick={runLayout} disabled={nodes.length < 2}>
                Auto-layout
              </ToolbarButton>
              <ToolbarButton onClick={integrations.regenerate} disabled={nodes.length < 2 || busy}>
                Regenerate
              </ToolbarButton>
              <ToolbarButton onClick={downloadCanvas} disabled={nodes.length === 0 || exporting}>
                {exporting ? "Preparing..." : "Download HTML"}
              </ToolbarButton>
              <ToolbarButton onClick={clearCanvas} disabled={nodes.length === 0}>
                Clear
              </ToolbarButton>
            </Panel>

            {busy && (
              <Panel position="top-center">
                <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Mapping integrations...
                </div>
              </Panel>
            )}

            {notice && (
              <Panel position="bottom-center">
                <div role="status" className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                  {notice}
                </div>
              </Panel>
            )}
          </ReactFlow>

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
        </section>

        <DetailPanel
          toolIds={toolIds}
          edges={visibleEdges}
          summary={integrations.result?.summary ?? null}
          status={integrations.status}
          error={integrations.error}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onRetry={integrations.regenerate}
        />
      </main>
    </div>
  );
}

function ToolbarButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      {children}
    </button>
  );
}
