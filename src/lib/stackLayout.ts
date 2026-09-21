import { CATEGORIES } from "../../shared/catalog";
import { LAYERS, type Layer } from "../../shared/layers";
import type { IntegrationEdge } from "../../shared/schema";

export const TILE_W = 88;
export const TILE_H = 84;
const TILE_GAP = 8;
const BOX_PAD = 8;
const BOX_HEADER = 22;
const BOX_GAP = 10;
// Wide enough for the longest category title on one line.
const MIN_BOX_W = 152;
const STRIP_PAD = 10;
const STRIP_HEADER = 30;
export const STRIP_GAP = 30;

export type StackTile = { toolId: string; x: number; y: number; w: number; h: number };
export type StackBox = { categoryId: string; x: number; y: number; w: number; h: number; tiles: StackTile[] };
export type StackStrip = { layer: Layer; x: number; y: number; w: number; h: number; boxes: StackBox[] };
export type StackLayout = {
  width: number;
  height: number;
  strips: StackStrip[];
  tiles: Map<string, StackTile & { stripIndex: number }>;
};

type Item = { toolId: string; categoryId: string };

function boxNaturalWidth(count: number): number {
  return 2 * BOX_PAD + count * TILE_W + (count - 1) * TILE_GAP;
}

// Places tools into layer strips, category boxes and tile slots for a given canvas width.
// Tiles keep the order in which they were added. Empty layers are left out.
export function layoutStack(items: Item[], width: number, layerOf: (toolId: string) => string): StackLayout {
  const categoryOrder = new Map(CATEGORIES.map((c, i) => [c.id, i]));
  const innerWidth = Math.max(width - 2 * STRIP_PAD, TILE_W + 2 * BOX_PAD);

  const strips: StackStrip[] = [];
  const tiles: StackLayout["tiles"] = new Map();
  let y = 0;

  for (const layer of LAYERS) {
    const inLayer = items.filter((item) => layerOf(item.toolId) === layer.id);
    if (inLayer.length === 0) continue;

    const byCategory = new Map<string, Item[]>();
    for (const item of inLayer) byCategory.set(item.categoryId, [...(byCategory.get(item.categoryId) ?? []), item]);
    const groups = [...byCategory.entries()].sort(
      ([a], [b]) => (categoryOrder.get(a) ?? 99) - (categoryOrder.get(b) ?? 99),
    );

    // Pack category boxes into rows, wrapping tiles inside a box that is wider than the strip.
    type Placed = { categoryId: string; items: Item[]; w: number; perRow: number; h: number };
    const rows: Placed[][] = [];
    let current: Placed[] = [];
    let used = 0;
    for (const [categoryId, groupItems] of groups) {
      const natural = boxNaturalWidth(groupItems.length);
      const w = Math.min(Math.max(natural, MIN_BOX_W), innerWidth);
      const perRow = Math.max(1, Math.floor((w - 2 * BOX_PAD + TILE_GAP) / (TILE_W + TILE_GAP)));
      const tileRows = Math.ceil(groupItems.length / perRow);
      const h = BOX_PAD + BOX_HEADER + tileRows * TILE_H + (tileRows - 1) * TILE_GAP + BOX_PAD;
      const placed: Placed = { categoryId, items: groupItems, w, perRow, h };
      if (current.length > 0 && used + BOX_GAP + w > innerWidth) {
        rows.push(current);
        current = [];
        used = 0;
      }
      used += (current.length > 0 ? BOX_GAP : 0) + w;
      current.push(placed);
    }
    if (current.length > 0) rows.push(current);

    const stripIndex = strips.length;
    const boxes: StackBox[] = [];
    let rowY = STRIP_HEADER + STRIP_PAD;
    for (const row of rows) {
      const rowHeight = Math.max(...row.map((p) => p.h));
      const rowTotal = row.reduce((sum, p) => sum + p.w, 0) + (row.length - 1) * BOX_GAP;
      let x = STRIP_PAD + Math.max(0, (innerWidth - rowTotal) / 2);
      for (const placed of row) {
        const boxTiles: StackTile[] = placed.items.map((item, index) => {
          const col = index % placed.perRow;
          const tileRow = Math.floor(index / placed.perRow);
          const inThisRow = Math.min(placed.perRow, placed.items.length - tileRow * placed.perRow);
          const rowWidth = inThisRow * TILE_W + (inThisRow - 1) * TILE_GAP;
          const tile: StackTile = {
            toolId: item.toolId,
            x: x + (placed.w - rowWidth) / 2 + col * (TILE_W + TILE_GAP),
            y: y + rowY + BOX_PAD + BOX_HEADER + tileRow * (TILE_H + TILE_GAP),
            w: TILE_W,
            h: TILE_H,
          };
          tiles.set(item.toolId, { ...tile, stripIndex });
          return tile;
        });
        boxes.push({ categoryId: placed.categoryId, x, y: y + rowY, w: placed.w, h: rowHeight, tiles: boxTiles });
        x += placed.w + BOX_GAP;
      }
      rowY += rowHeight + BOX_GAP;
    }

    const stripHeight = rowY - BOX_GAP + STRIP_PAD;
    strips.push({ layer, x: 0, y, w: width, h: stripHeight, boxes });
    y += stripHeight + STRIP_GAP;
  }

  return { width, height: Math.max(0, y - STRIP_GAP), strips, tiles };
}

export type StackRoute = {
  edge: IntegrationEdge;
  id: string;
  path: string;
  label: { x: number; y: number };
  // Which tools this connection touches.
  a: string;
  b: string;
  // True when the path was drawn from the edge's target to its source (so the arrow belongs at the path start).
  flipped: boolean;
};

// Spread the connection points along a tile edge so several lines do not stack on one spot.
function spread(count: number, index: number, tileWidth: number): number {
  if (count <= 1) return 0;
  const usable = tileWidth - 24;
  const step = Math.min(14, usable / (count - 1));
  return (index - (count - 1) / 2) * step;
}

export function routeStackEdges(layout: StackLayout, edges: IntegrationEdge[]): StackRoute[] {
  type Ref = { edge: IntegrationEdge; id: string; from: string; to: string };
  const refs: Ref[] = edges
    .filter((e) => layout.tiles.has(e.source) && layout.tiles.has(e.target))
    .map((e) => {
      const s = layout.tiles.get(e.source)!;
      const t = layout.tiles.get(e.target)!;
      // Draw from the upper strip down; ties keep the AI's direction.
      const flip = s.stripIndex > t.stripIndex || (s.stripIndex === t.stripIndex && s.x > t.x);
      return { edge: e, id: `${e.source}|${e.target}`, from: flip ? e.target : e.source, to: flip ? e.source : e.target };
    });

  // Per tile and side, the connections that attach there, ordered by where the other end is.
  const slots = new Map<string, Ref[]>();
  const attach = (tileId: string, side: "top" | "bottom", ref: Ref) => {
    const key = `${tileId}:${side}`;
    slots.set(key, [...(slots.get(key) ?? []), ref]);
  };
  for (const ref of refs) {
    const s = layout.tiles.get(ref.from)!;
    const t = layout.tiles.get(ref.to)!;
    if (s.stripIndex === t.stripIndex) {
      attach(ref.from, "bottom", ref);
      attach(ref.to, "bottom", ref);
    } else {
      attach(ref.from, "bottom", ref);
      attach(ref.to, "top", ref);
    }
  }
  const otherEndX = (ref: Ref, tileId: string) => {
    const other = layout.tiles.get(ref.from === tileId ? ref.to : ref.from)!;
    return other.x + other.w / 2;
  };
  const anchorX = (tileId: string, side: "top" | "bottom", ref: Ref) => {
    const tile = layout.tiles.get(tileId)!;
    const list = [...(slots.get(`${tileId}:${side}`) ?? [])].sort((p, q) => otherEndX(p, tileId) - otherEndX(q, tileId));
    return tile.x + tile.w / 2 + spread(list.length, list.indexOf(ref), tile.w);
  };

  return refs.map((ref) => {
    const s = layout.tiles.get(ref.from)!;
    const t = layout.tiles.get(ref.to)!;
    let path: string;
    let label: { x: number; y: number };

    if (s.stripIndex === t.stripIndex) {
      const x1 = anchorX(ref.from, "bottom", ref);
      const x2 = anchorX(ref.to, "bottom", ref);
      const y0 = s.y + s.h;
      const dip = 30 + Math.min(20, Math.abs(x2 - x1) / 12);
      path = `M ${x1} ${y0} C ${x1} ${y0 + dip}, ${x2} ${y0 + dip}, ${x2} ${t.y + t.h}`;
      label = { x: (x1 + x2) / 2, y: y0 + dip * 0.75 };
    } else {
      const x1 = anchorX(ref.from, "bottom", ref);
      const y1 = s.y + s.h;
      const x2 = anchorX(ref.to, "top", ref);
      const y2 = t.y;
      const dy = Math.max(24, (y2 - y1) / 2);
      path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
      label = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }
    return {
      edge: ref.edge,
      id: ref.id,
      path,
      label,
      a: ref.edge.source,
      b: ref.edge.target,
      flipped: ref.from !== ref.edge.source,
    };
  });
}
