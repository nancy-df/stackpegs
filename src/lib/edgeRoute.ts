export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

// Point where the ray from the box center toward `toward` exits the box.
function exitPoint(box: Box, toward: Point): Point {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = 1 / Math.max(Math.abs(dx) / (box.w / 2), Math.abs(dy) / (box.h / 2));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function quadPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function hitsOther(a: Point, c: Point, b: Point, others: Box[]): number {
  let hits = 0;
  for (let t = 0.08; t <= 0.92; t += 0.04) {
    const p = quadPoint(a, c, b, t);
    if (others.some((o) => p.x > o.x - 8 && p.x < o.x + o.w + 8 && p.y > o.y - 8 && p.y < o.y + o.h + 8)) hits++;
  }
  return hits;
}

export type EdgeRoute = { path: string; label: Point; samples: Point[] };

// Straight when clear; otherwise bows sideways just enough to avoid nodes in the way.
export function routeEdge(sourceBox: Box, targetBox: Box, others: Box[]): EdgeRoute {
  const sc = { x: sourceBox.x + sourceBox.w / 2, y: sourceBox.y + sourceBox.h / 2 };
  const tc = { x: targetBox.x + targetBox.w / 2, y: targetBox.y + targetBox.h / 2 };
  const mid = { x: (sc.x + tc.x) / 2, y: (sc.y + tc.y) / 2 };
  const len = Math.hypot(tc.x - sc.x, tc.y - sc.y) || 1;
  const normal = { x: -(tc.y - sc.y) / len, y: (tc.x - sc.x) / len };

  let best = { control: mid, hits: Infinity, start: sc, end: tc };
  for (const offset of [0, 90, -90, 180, -180, 270, -270]) {
    const control = { x: mid.x + normal.x * offset, y: mid.y + normal.y * offset };
    const start = exitPoint(sourceBox, control);
    const end = exitPoint(targetBox, control);
    const hits = hitsOther(start, control, end, others);
    if (hits < best.hits) best = { control, hits, start, end };
    if (hits === 0) break;
  }
  const { start, end, control } = best;
  const straight = control === mid;
  const path = straight
    ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => quadPoint(start, control, end, t));
  return { path, label: quadPoint(start, control, end, 0.5), samples };
}
