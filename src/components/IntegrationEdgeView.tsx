import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  useNodes,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
} from "@xyflow/react";
import type { IntegrationEdge } from "../../shared/schema";
import { routeEdge, type Box } from "../lib/edgeRoute";
import { TYPE_META } from "../lib/integrationTypes";
import { NODE_H, NODE_W } from "../lib/layout";

const QUIET = "#94a3b8";

export type IntegrationFlowEdge = Edge<
  {
    edge: IntegrationEdge;
    // Lit connections show their type color and label; dim ones fade back while something else is in focus.
    lit: boolean;
    dim: boolean;
    onSelect: (edgeId: string) => void;
    onEnter: (edgeId: string) => void;
    onLeave: () => void;
  },
  "integration"
>;

function boxOf(node: InternalNode): Box {
  const { x, y } = node.internals.positionAbsolute;
  return { x, y, w: node.measured.width ?? NODE_W, h: node.measured.height ?? NODE_H };
}

export function IntegrationEdgeView({
  id,
  source,
  target,
  markerStart,
  markerEnd,
  data,
  selected,
}: EdgeProps<IntegrationFlowEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const allNodes = useNodes<Node>();
  if (!sourceNode || !targetNode || !data) return null;

  const others = allNodes
    .filter((n) => n.id !== source && n.id !== target)
    .map((n) => ({
      x: n.position.x,
      y: n.position.y,
      w: n.measured?.width ?? NODE_W,
      h: n.measured?.height ?? NODE_H,
    }));

  const { path, label } = routeEdge(boxOf(sourceNode), boxOf(targetNode), others);
  const meta = TYPE_META[data.edge.integrationType];

  const { lit, dim } = data;
  return (
    <>
      <g onMouseEnter={() => data.onEnter(id)} onMouseLeave={data.onLeave} opacity={dim ? 0.1 : 1}>
        <BaseEdge
          id={id}
          path={path}
          markerStart={markerStart}
          markerEnd={markerEnd}
          interactionWidth={24}
          style={{ stroke: lit ? meta.color : QUIET, strokeWidth: lit ? (selected ? 3.5 : 2.25) : 1.5 }}
        />
      </g>
      {lit && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={() => data.onSelect(id)}
            onMouseEnter={() => data.onEnter(id)}
            onMouseLeave={data.onLeave}
            className="nodrag nopan absolute rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm hover:shadow-md"
            style={{
              transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)`,
              pointerEvents: "all",
              color: meta.color,
              borderColor: meta.color,
              outline: selected ? `2px solid ${meta.color}` : undefined,
              outlineOffset: 2,
            }}
          >
            {meta.label}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
