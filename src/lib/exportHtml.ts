import { CATEGORIES_BY_ID, type Tool } from "../../shared/catalog";
import { INTEGRATION_TYPES, type IntegrationEdge } from "../../shared/schema";
import { ICONS } from "../data/icons.generated";
import { routeEdge, type Box, type Point } from "./edgeRoute";
import { TYPE_META } from "./integrationTypes";
import { NODE_H, NODE_W } from "./layout";
import { faviconUrl, hueFor, initials } from "./logo";
import { TILE_LOGO, layoutStack, routeStackEdges } from "./stackLayout";
import { getTool } from "./tools";

export type ExportInput = {
  nodes: { id: string; position: Point }[];
  edges: IntegrationEdge[];
  summary: string | null;
  // When set, the diagram is drawn as layer strips (like the Stack view) instead of at the canvas positions.
  stack?: { toolIds: string[]; layerOf: (toolId: string) => string };
};

const PAD = 48;
const TILE = 72;
const LOGO = 32;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function logoSvg(tool: Tool, x: number, y: number, size = LOGO): Promise<string> {
  if (tool.placeholder) {
    const color = CATEGORIES_BY_ID[tool.categoryId]?.color ?? "#64748b";
    return (
      `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}">` +
      `<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke-width="2" stroke-dasharray="3.2 2.4"/>` +
      `<path d="M12 8v8M8 12h8" stroke-width="2" stroke-linecap="round"/></svg>`
    );
  }
  if (tool.custom) {
    return (
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size / 5)}" fill="hsl(${hueFor(tool.name)} 55% 45%)"/>` +
      `<text x="${x + size / 2}" y="${y + size / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.round(size * 0.4)}" font-weight="700" fill="#fff">${esc(initials(tool.name))}</text>`
    );
  }
  const icon = ICONS[tool.iconSlug];
  if (icon) {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${icon.path}" fill="#${icon.hex}"/></svg>`;
  }
  const href =
    (await toDataUri(`/api/favicon?tool=${encodeURIComponent(tool.id)}`)) ?? faviconUrl(tool.website);
  return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="${esc(href)}"/>`;
}

// Greedy two-line wrap for tile names in SVG, which has no automatic wrapping.
function wrapName(name: string, max = 13): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of name.split(" ")) {
    if (line && (line + " " + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= 2) return lines;
  return [lines[0]!, (lines[1] + "...").slice(0, max)];
}

const STACK_WIDTH = 1000;

// The same strips, category boxes and tiles as the Stack view, drawn as a static SVG.
async function buildStackSvg(input: Pick<ExportInput, "edges"> & { stack: NonNullable<ExportInput["stack"]> }) {
  const items = input.stack.toolIds.flatMap((id) => {
    const tool = getTool(id);
    return tool ? [{ toolId: id, categoryId: tool.categoryId }] : [];
  });
  const layout = layoutStack(items, STACK_WIDTH, input.stack.layerOf);
  const routes = routeStackEdges(layout, input.edges);
  const colors = [...new Set(routes.map((r) => TYPE_META[r.edge.integrationType].color))];

  const stripMarkup = layout.strips
    .map((strip, index) => {
      // Plain grey and white bands, alternating, with neutral borders.
      const grey = index % 2 === 0;
      return (
        `<rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" rx="12" fill="${grey ? "#f1f5f9" : "#ffffff"}" stroke="#e2e8f0"/>` +
        `<text x="${strip.x + 12}" y="${strip.y + 16}" font-size="12" font-weight="700" fill="#334155">${esc(strip.layer.title)}` +
        `<tspan dx="8" font-size="11" font-weight="400" fill="#64748b">${esc(strip.layer.subtitle)}</tspan></text>` +
        strip.boxes
          .map((box) => {
            const category = CATEGORIES_BY_ID[box.categoryId];
            const dot = category?.color ?? "#94a3b8";
            return (
              `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8" fill="${grey ? "#ffffff" : "#f8fafc"}" stroke="#e2e8f0"/>` +
              `<circle cx="${box.x + 13}" cy="${box.y + 13}" r="3" fill="${dot}"/>` +
              `<text x="${box.x + 21}" y="${box.y + 16}" font-size="10" font-weight="600" letter-spacing="0.5" fill="#64748b">${esc((category?.label ?? "Other").toUpperCase())}</text>`
            );
          })
          .join("")
      );
    })
    .join("");

  const edgeMarkup = routes
    .map((r) => {
      const color = TYPE_META[r.edge.integrationType].color;
      const marker = `url(#arrow-${color.slice(1)})`;
      const twoWay = r.edge.direction === "two-way";
      const end = !r.flipped || twoWay ? ` marker-end="${marker}"` : "";
      const start = r.flipped || twoWay ? ` marker-start="${marker}"` : "";
      return `<path d="${r.path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.85"${end}${start}/>`;
    })
    .join("");

  const tileMarkup = (
    await Promise.all(
      [...layout.tiles.values()].map(async (t) => {
        const tool = getTool(t.toolId);
        if (!tool) return "";
        const cc = CATEGORIES_BY_ID[tool.categoryId]?.color ?? "#94a3b8";
        const logo = await logoSvg(tool, t.x + (t.w - TILE_LOGO) / 2, t.y + 9, TILE_LOGO);
        const lines = wrapName(tool.name);
        return (
          `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="12" fill="#fff" stroke="${cc}" stroke-width="2"${tool.placeholder ? ` stroke-dasharray="5 3"` : ""}/>` +
          logo +
          lines
            .map(
              (line, i) =>
                `<text x="${t.x + t.w / 2}" y="${t.y + 9 + TILE_LOGO + 14 + i * 13}" text-anchor="middle" font-size="11" font-weight="600" fill="#0f172a">${esc(line)}</text>`,
            )
            .join("")
        );
      }),
    )
  ).join("");

  const labelMarkup = routes
    .map((r) => {
      const meta = TYPE_META[r.edge.integrationType];
      const w = meta.label.length * 6.4 + 20;
      return (
        `<g transform="translate(${Math.round(r.label.x)} ${Math.round(r.label.y)})">` +
        `<rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="10" fill="#fff" stroke="${meta.color}"/>` +
        `<text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="${meta.color}">${esc(meta.label)}</text></g>`
      );
    })
    .join("");

  const h = Math.max(Math.round(layout.height), 1);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STACK_WIDTH} ${h}" width="${STACK_WIDTH}" ` +
    `style="max-width:100%;height:auto" role="img" aria-label="Integration diagram, grouped by layer" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif">` +
    `<defs>${markerDefs(colors)}</defs>${stripMarkup}${edgeMarkup}${tileMarkup}${labelMarkup}</svg>`
  );
}

function legendMarkup(edges: IntegrationEdge[]): string {
  const used = INTEGRATION_TYPES.filter((type) => edges.some((e) => e.integrationType === type));
  if (used.length === 0) return "";
  const items = used
    .map((type) => `<li><span style="background:${TYPE_META[type].color}"></span>${esc(TYPE_META[type].label)}</li>`)
    .join("");
  return `<ul class="legend"><li class="lead">Connections</li>${items}</ul>`;
}

function markerDefs(colors: string[]): string {
  return colors
    .map(
      (c) =>
        `<marker id="arrow-${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`,
    )
    .join("");
}

async function buildSvg({ nodes, edges }: Pick<ExportInput, "nodes" | "edges">) {
  const boxes = new Map<string, Box>(
    nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y, w: NODE_W, h: NODE_H }]),
  );

  const routed = edges.flatMap((edge) => {
    const from = boxes.get(edge.source);
    const to = boxes.get(edge.target);
    if (!from || !to) return [];
    const others = [...boxes.entries()].filter(([id]) => id !== edge.source && id !== edge.target).map(([, b]) => b);
    return [{ edge, route: routeEdge(from, to, others) }];
  });

  const xs: number[] = [];
  const ys: number[] = [];
  for (const b of boxes.values()) {
    xs.push(b.x, b.x + b.w);
    ys.push(b.y, b.y + b.h);
  }
  for (const { route } of routed) {
    for (const p of route.samples) {
      xs.push(p.x);
      ys.push(p.y);
    }
  }
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const width = Math.max(...xs) + PAD - minX;
  const height = Math.max(...ys) + PAD - minY;

  const colors = [...new Set(routed.map(({ edge }) => TYPE_META[edge.integrationType].color))];

  const edgeMarkup = routed
    .map(({ edge, route }) => {
      const color = TYPE_META[edge.integrationType].color;
      const marker = `url(#arrow-${color.slice(1)})`;
      const start = edge.direction === "two-way" ? ` marker-start="${marker}"` : "";
      return `<path d="${route.path}" fill="none" stroke="${color}" stroke-width="2.25" marker-end="${marker}"${start}/>`;
    })
    .join("");

  const nodeMarkup = (
    await Promise.all(
      nodes.map(async (n) => {
        const tool = getTool(n.id);
        if (!tool) return "";
        const category = CATEGORIES_BY_ID[tool.categoryId];
        const tileX = (NODE_W - TILE) / 2;
        const logo = await logoSvg(tool, tileX + (TILE - LOGO) / 2, (TILE - LOGO) / 2);
        return (
          `<g transform="translate(${n.position.x} ${n.position.y})">` +
          `<rect x="${tileX}" y="0" width="${TILE}" height="${TILE}" rx="16" fill="#fff" stroke="${category?.color ?? "#94a3b8"}" stroke-width="2"${tool.placeholder ? ' stroke-dasharray="5 3"' : ""}/>` +
          logo +
          `<text x="${NODE_W / 2}" y="${TILE + 18}" text-anchor="middle" font-size="13" font-weight="600" fill="#0f172a">${esc(tool.name)}</text>` +
          `<text x="${NODE_W / 2}" y="${TILE + 34}" text-anchor="middle" font-size="11" fill="#64748b">${esc(tool.placeholder ? "Placeholder" : (category?.label ?? ""))}</text>` +
          `</g>`
        );
      }),
    )
  ).join("");

  const labelMarkup = routed
    .map(({ edge, route }) => {
      const meta = TYPE_META[edge.integrationType];
      const w = meta.label.length * 6.4 + 20;
      return (
        `<g transform="translate(${route.label.x} ${route.label.y})">` +
        `<rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="10" fill="#fff" stroke="${meta.color}"/>` +
        `<text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="${meta.color}">${esc(meta.label)}</text>` +
        `</g>`
      );
    })
    .join("");

  const r = (n: number) => Math.round(n);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" ` +
    `style="max-width:100%;height:auto" role="img" aria-label="Integration diagram" ` +
    `font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif">` +
    `<defs>${markerDefs(colors)}</defs>` +
    `<g transform="translate(${-r(minX)} ${-r(minY)})">${edgeMarkup}${nodeMarkup}${labelMarkup}</g>` +
    `</svg>`
  );
}

function connectionsMarkup(edges: IntegrationEdge[]): string {
  if (edges.length === 0) return "";
  const items = edges
    .map((e) => {
      const from = getTool(e.source)?.name ?? e.source;
      const to = getTool(e.target)?.name ?? e.target;
      const meta = TYPE_META[e.integrationType];
      return (
        `<li><div class="pair"><strong>${esc(from)}</strong> <span class="arrow">${e.direction === "two-way" ? "&harr;" : "&rarr;"}</span> <strong>${esc(to)}</strong>` +
        `<span class="badge" style="color:${meta.color};border-color:${meta.color}">${esc(meta.label)}</span></div>` +
        `<p>${esc(e.dataFlow)}</p><p class="use">${esc(e.useCase)}</p></li>`
      );
    })
    .join("");
  return `<section><h2>Connections (${edges.length})</h2><ul class="connections">${items}</ul></section>`;
}

const STYLES = `
*{box-sizing:border-box}
body{margin:0;background:#f8fafc;color:#0f172a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.5}
main{max-width:1100px;margin:0 auto;padding:32px 20px 48px}
h1{margin:0 0 4px;font-size:24px}
h2{margin:32px 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
.meta{margin:0;color:#64748b;font-size:14px}
.diagram{margin-top:24px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:auto;text-align:center}
.summary{margin:0;font-size:16px}
.legend{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;color:#475569}
.legend li{display:flex;align-items:center;gap:6px}
.legend .lead{font-weight:600;color:#64748b}
.legend span{display:inline-block;width:18px;height:3px;border-radius:2px}
.connections{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.connections li{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}
.connections p{margin:4px 0 0;font-size:14px;color:#334155}
.connections .use{font-size:12px;color:#64748b}
.pair{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.arrow{color:#94a3b8}
.badge{margin-left:auto;border:1px solid;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600}
footer{margin-top:32px;font-size:12px;color:#64748b}
`;

export async function buildHtml(input: ExportInput): Promise<string> {
  const svg = input.stack ? await buildStackSvg({ edges: input.edges, stack: input.stack }) : await buildSvg(input);
  const legend = input.stack ? legendMarkup(input.edges) : "";
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const toolCount = input.nodes.length;
  const summary = input.summary && input.edges.length > 0
    ? `<section><h2>How they work together</h2><p class="summary">${esc(input.summary)}</p></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>StackPegs integration map</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<header>
<h1>Integration map</h1>
<p class="meta">${toolCount} tool${toolCount === 1 ? "" : "s"} &middot; generated with StackPegs on ${esc(date)}</p>
</header>
<div class="diagram">${svg}</div>
${legend}
${summary}
${connectionsMarkup(input.edges)}
<footer>Integration details are AI-generated and may be incomplete or wrong. Check each vendor's documentation before relying on them.</footer>
</main>
</body>
</html>
`;
}

export function downloadHtml(html: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
