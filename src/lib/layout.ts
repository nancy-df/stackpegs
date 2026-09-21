import { Graph, layout } from "@dagrejs/dagre";
import type { Node } from "@xyflow/react";

export const NODE_W = 120;
export const NODE_H = 128;

type Positioned<N> = { nodes: N[]; width: number; height: number };

function runDagre<N extends Node>(
  nodes: N[],
  edges: { source: string; target: string }[],
  rankdir: "LR" | "TB",
): Positioned<N> {
  const g = new Graph();
  g.setGraph({ rankdir, nodesep: 56, ranksep: rankdir === "LR" ? 150 : 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  layout(g);
  const graph = g.graph();
  return {
    width: graph.width ?? 0,
    height: graph.height ?? 0,
    nodes: nodes.map((node) => {
      const p = g.node(node.id);
      return { ...node, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
    }),
  };
}

// Lays out left-to-right and top-to-bottom, keeping whichever fits the canvas at the larger zoom.
export function layoutNodes<N extends Node>(
  nodes: N[],
  edges: { source: string; target: string }[],
  viewport: { width: number; height: number },
): N[] {
  const lr = runDagre(nodes, edges, "LR");
  const tb = runDagre(nodes, edges, "TB");
  const fit = (p: Positioned<N>) =>
    Math.min(viewport.width / Math.max(p.width, 1), viewport.height / Math.max(p.height, 1));
  return fit(tb) > fit(lr) ? tb.nodes : lr.nodes;
}

export function freeSpot(nodes: Node[]): { x: number; y: number } {
  for (let i = 0; i < 200; i++) {
    const x = 60 + (i % 4) * 180;
    const y = 60 + Math.floor(i / 4) * 170;
    if (!nodes.some((n) => Math.abs(n.position.x - x) < 90 && Math.abs(n.position.y - y) < 90)) {
      return { x, y };
    }
  }
  return { x: 60, y: 60 };
}
