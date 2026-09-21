import { Graph, layout } from "@dagrejs/dagre";
import type { Node } from "@xyflow/react";

export const NODE_W = 120;
export const NODE_H = 128;

const RANK_GAP = 110;
const COLUMN_GAP = 20;
const ROW_GAP = 22;
// A layout is only "horizontal" when it is at least this much wider than tall.
const MIN_ASPECT = 1.4;

type Arranged = { positions: Map<string, { x: number; y: number }>; width: number; height: number };

// Stacks each rank (a group of tools at the same step of the flow) into columns of at most `perColumn`
// tools, so a rank with many tools grows sideways instead of downward.
function arrange<N extends Node>(ranks: N[][], perColumn: number): Arranged {
  const positions = new Map<string, { x: number; y: number }>();
  const columns: { x: number; nodes: N[] }[] = [];
  let x = 0;

  for (const rank of ranks) {
    const columnCount = Math.ceil(rank.length / perColumn);
    const size = Math.ceil(rank.length / columnCount);
    for (let c = 0; c < columnCount; c++) {
      columns.push({ x, nodes: rank.slice(c * size, (c + 1) * size) });
      x += NODE_W + (c < columnCount - 1 ? COLUMN_GAP : 0);
    }
    x += RANK_GAP;
  }

  const columnHeight = (n: number) => n * NODE_H + (n - 1) * ROW_GAP;
  const height = Math.max(...columns.map((col) => columnHeight(col.nodes.length)), NODE_H);
  for (const col of columns) {
    const top = (height - columnHeight(col.nodes.length)) / 2;
    col.nodes.forEach((node, i) => positions.set(node.id, { x: col.x, y: top + i * (NODE_H + ROW_GAP) }));
  }
  return { positions, width: Math.max(x - RANK_GAP, NODE_W), height };
}

// Always flows left to right. Dagre orders the tools into steps with few crossings; then tall steps are wrapped
// into extra columns, and the arrangement that is wide enough and fits the canvas best at the largest zoom wins.
export function layoutNodes<N extends Node>(
  nodes: N[],
  edges: { source: string; target: string }[],
  viewport: { width: number; height: number },
): N[] {
  if (nodes.length === 0) return nodes;

  const g = new Graph();
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: RANK_GAP });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  layout(g);

  const byRank = new Map<number, { node: N; y: number }[]>();
  for (const node of nodes) {
    const p = g.node(node.id);
    const key = Math.round(p.x);
    byRank.set(key, [...(byRank.get(key) ?? []), { node, y: p.y }]);
  }
  const ranks = [...byRank.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) => list.sort((p, q) => p.y - q.y).map((entry) => entry.node));

  const tallest = Math.max(...ranks.map((rank) => rank.length));
  const candidates = Array.from({ length: tallest }, (_, i) => arrange(ranks, i + 1)).map((arranged) => ({
    arranged,
    aspect: arranged.width / arranged.height,
    fit: Math.min(viewport.width / arranged.width, viewport.height / arranged.height),
  }));

  const wide = candidates.filter((c) => c.aspect >= MIN_ASPECT);
  const best =
    wide.length > 0
      ? wide.reduce((a, b) => (b.fit > a.fit ? b : a))
      : candidates.reduce((a, b) => (b.aspect > a.aspect ? b : a));

  return nodes.map((node) => ({ ...node, position: best.arranged.positions.get(node.id) ?? node.position }));
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
