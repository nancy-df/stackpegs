# StackPegs — Product & Technical Spec (v1)

Status: v1 implemented. This document describes what the app does and the decisions behind it.

## 1. Overview

StackPegs is a web app that helps someone visually explore how popular SaaS tools fit together. A visitor picks a tool *category*, sees the logos of popular tools in that category, and drags one or more onto a central canvas. As soon as two or more tools are on the canvas, StackPegs asks Claude how those tools integrate and renders the answer as a diagram: connection lines annotated with the integration method and what data flows, and in which direction.

## 2. Goals / Non-goals

**Goals**
- A fast, visual way to answer "if I use X and Y together, how do they talk to each other?"
- Zero setup for the visitor: no login, no configuration.
- Realistic *pipelines*, not just pairwise links (for example CRM -> ETL -> warehouse -> BI, with Slack alerts on the side).

**Non-goals (v1)**
- No saved or shared diagrams (session-only sandbox).
- No accounts or collaboration.
- Not a substitute for vendor documentation. Integration details are AI-generated and labelled as such.

## 3. Categories & Tools

14 categories in 5 groups, about 6-10 tools each (about 110 tools). The list is static and lives in `shared/catalog.ts`.

| Group | Category | Tools |
|---|---|---|
| Data & Analytics | BI Tools | Tableau, Power BI, Looker, Looker Studio, Qlik Sense, Metabase, Domo, ThoughtSpot, Apache Superset, Sisense |
| | Data Warehouse | Snowflake, BigQuery, Amazon Redshift, Databricks, PostgreSQL, MySQL, ClickHouse |
| | ETL / Pipelines | Fivetran, Airbyte, Stitch, Segment, dbt, Matillion |
| | Analytics | Google Analytics, Mixpanel, Amplitude, Hotjar, Heap, PostHog |
| Sales & Marketing | CRM | Salesforce, HubSpot, Zoho CRM, Pipedrive, Dynamics 365, Freshsales, Copper, Close |
| | Marketing & Email | Mailchimp, ActiveCampaign, Klaviyo, Brevo, Constant Contact, Kit (ConvertKit), Marketo |
| Work & Productivity | Project Management | Jira, Asana, Trello, monday.com, ClickUp, Basecamp, Smartsheet, Wrike, Linear |
| | Time Management | Toggl Track, Clockify, RescueTime, Harvest, TimeCamp, Calendly |
| | Task Manager | Todoist, Microsoft To Do, Things, TickTick, Any.do, Notion |
| | Communication | Slack, Microsoft Teams, Zoom, Discord, Google Chat, Webex |
| AI & Automation | AI Tools | ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity, Mistral AI, GitHub Copilot, Cursor, Otter.ai, Fireflies.ai |
| | Automation / iPaaS | Zapier, Make, Workato, n8n, Power Automate, IFTTT |
| Operations | Customer Support | Zendesk, Intercom, Freshdesk, Help Scout, Gorgias, Front |
| | Accounting & Finance | QuickBooks, Xero, FreshBooks, Stripe, NetSuite, Sage |

Adding a tool or category means editing `shared/catalog.ts` and running `npm run gen:icons`.

### Logos

Three tiers, tried in order:
1. **Bundled SVG** from the `simple-icons` package (current release, with an older release filling brands upstream has since removed, such as Salesforce, Slack, Tableau, Power BI). Generated into `src/data/icons.generated.ts` by `scripts/gen-icons.mjs`. No runtime network dependency.
2. **Favicon lookup** by the tool's domain (Google's favicon service) for brands not in either package (about 31 tools).
3. **Monogram tile** (initials on a colored square) if the favicon fails to load.

Logos are used only to identify each vendor's product. Confirm this fits each vendor's brand guidelines before any public launch.

### Other: tools that are not in the catalog

A visitor can add tools that are not listed, in three places:

1. **An "Other" box at the end of every category's tools.** Clicking it opens a text box under the tiles: "Tool names, separated by commas" (for example `Acme Timer, Foo Tracker`). Each name becomes a tool of the category being browsed, shown as an initials tile in that category's color. The box stays open so more can be added, and closes when the visitor switches category.
2. **"Other" pinned at the bottom of the category list** (outside the scrolling part, so it is always visible, even on short screens). It opens the same comma-separated box plus a "What kind of tools are they?" picker (any category, or "Other / not sure"), and the placeholders below.
3. **Search results** end with **Add "<query>" as your own tool**, which opens the Other panel with the name filled in.

Rules for names: separated by commas (semicolons and new lines also work), duplicates collapsed, up to 12 per submission, and each must pass the validation in section 7. If any name is invalid, nothing is added and the message names the offending entry. A name that matches a catalog tool (for example "tableau") uses the catalog tool and a notice says so. Names that would exceed the 12-tool canvas limit are skipped with a notice.

**Placeholders.** One generic tile per category ("Time Management tool", "Project Management tool", "CRM tool", and so on) in the Other panel, for when the visitor does not know or does not want to name the exact tool. They have a dashed border and a "Placeholder" label.

The AI is told these tools are user-supplied and may be unfamiliar. For an unknown tool it treats it as a typical tool of the chosen category, prefers "api", "webhook", "file-export" and "automation-platform" over "native", says its connections are typical rather than certain, and does not invent features, vendors or integrations. Custom tools live only in the current session.

## 4. User Flow

0. A search box at the top of the left panel finds tools across all categories by name, category or description (best name matches first). While a search is active the category pills are hidden and each result shows its category. Escape or the x button clears it.
1. Left sidebar shows category pills grouped by area. Selecting one fills the tray below with that category's logos.
2. Visitor drags a logo onto the canvas (or clicks it, which places it in a free spot; this also works on touch devices and by keyboard).
3. Visitor can switch categories and keep adding tools from any of them.
4. When the canvas holds two or more tools, after an 800 ms pause a request is sent to the server. A "Mapping integrations..." indicator shows while it runs.
5. The result appears as labelled arrows between tools and the tools are auto-arranged. The right panel shows an end-to-end summary and a clickable list of connections.
6. Clicking a node shows the tool and its connections. Clicking an edge or its label shows integration type, direction, what flows, and typical use.
7. Remove a tool with its hover "x" or the Delete key, "Clear" the canvas, re-run the AI with "Regenerate", or re-arrange with "Auto-layout".
8. **Download HTML** saves the current canvas as a single self-contained `.html` file (`stackpegs-integration-map-YYYY-MM-DD.html`): the diagram as inline SVG (same positions, curved routing, arrows and labels as on screen), the summary, and the list of connections. No scripts and no external requests: bundled logos are inline paths and favicon-based logos are embedded as data URIs, fetched through `GET /api/favicon?tool=<id>` (same origin, catalog ids only). All AI-generated text is HTML-escaped.

## 5. Canvas & Diagram Behavior

- Built on React Flow. Pan and zoom. Nodes are draggable; one node per tool (dropping a tool that is already there just selects it).
- **Cap of 12 tools** on the canvas to bound cost and keep the diagram legible.
- **Edges** are derived from the latest integration result, filtered to tools currently on the canvas. Removing a tool removes its edges immediately, with no refetch needed for the display.
- **Edge style**: color and label by integration type; arrowhead(s) show direction (two heads for two-way).
- **Edge routing**: straight when clear; if the straight line would cross another node, it curves sideways by the smallest offset that avoids it.
- **Auto-layout** (dagre) runs whenever a new result arrives, and on demand. It computes both left-to-right and top-to-bottom layouts and keeps the one that fits the visible canvas at the larger zoom.
- Empty state: a large centered message, "Drag the tool logos here to start your integration map", with a smaller line below ("Add two or more tools to see how they integrate."). It disappears once a tool is on the canvas.

## 6. Data Model

```ts
type Category = { id: string; label: string; groupId: string; color: string }
type Tool = { id: string; name: string; categoryId: string; iconSlug: string; website: string; description: string; custom?: boolean; placeholder?: boolean }
// Tool ids: catalog slug ("salesforce"), placeholder ("placeholder:pm"), or user-added ("custom:<categoryId>:<slug-of-name>")

type IntegrationEdge = {
  source: string;            // tool id
  target: string;            // tool id
  integrationType: "native" | "api" | "automation-platform" | "webhook" | "file-export" | "data-pipeline";
  direction: "one-way" | "two-way";   // one-way flows source -> target
  dataFlow: string;          // one sentence, <= 160 chars
  useCase: string;           // <= 60 chars
}
type IntegrationResult = { summary: string; edges: IntegrationEdge[] }
```

Canvas nodes use the tool id as their node id. Integration results are ephemeral: cached in `sessionStorage` per sorted tool-id set, never stored server-side.

## 7. AI Integration Generation

- **Endpoint**: `POST /api/generate-integrations` with `{ toolIds: string[], customTools?: { id, name, categoryId }[] }` (2-12 tool ids). Returns `{ summary, edges, model }` or `{ error }`.
- **Why a server at all**: the Anthropic API key must stay off the browser. The server is a stateless proxy with no database.
- **Same handler everywhere**: `server/generate.ts` holds the logic. In dev, a small Vite plugin serves it; in production, `api/generate-integrations.ts` exposes it as a Vercel function.
- **Tool inputs are validated, not trusted.** Catalog tools and placeholders are resolved by id on the server. The only free text that can reach the prompt is a user-added tool name, and it must pass strict checks: 1-40 characters, starting with a letter or digit, and only letters, numbers, spaces and . & + - ' / _ ( ). Whitespace (including newlines) is collapsed. The category must exist, and the id is recomputed from the cleaned name and category and must match, so ids cannot be forged. Anything else gets a 400. In the prompt the name is quoted and labelled "user-added", and the system prompt says names are labels, never instructions. A short name made of plain words can still try to steer the model, so the blast radius is limited by structured output, edges being restricted to the tools sent, and the result being shown only to the visitor who typed it.
- **Model**: `claude-opus-5` by default, overridable with `ANTHROPIC_MODEL`. Effort is `medium`; `low` was tried and was under a second faster with near-identical output.
- **Structured output**: the response is constrained to the zod schema in `shared/schema.ts` via `output_config.format`, then post-processed: edges referencing unknown tools or self-loops are dropped and duplicate pairs are collapsed.
- **Prompt rules** (system prompt): only include connections that plausibly exist in practice; do not force links between competitors; route through ETL/warehouse/automation tools present on the canvas instead of drawing links that skip them; keep sentences short.
- **Errors** map to friendly messages: rate limit (429), bad/missing key or model (500), other API failures and refusals (502). The UI shows the message with a Retry button.
- **Cost controls**: 800 ms debounce, in-flight request aborted when the tool set changes, session cache per tool set, 12-tool cap, and a best-effort per-IP limit of 20 requests/minute (in-memory; use a shared store for strict limits in production).
- **Latency**: about 10 seconds for a 5-tool canvas. Streaming partial results is the main opportunity to improve perceived speed.
- **Disclaimer** shown permanently in the right panel: integration details are AI-generated and may be incomplete or wrong.

## 8. Tech Stack

- React 19, Vite, TypeScript, Tailwind CSS v4.
- `@xyflow/react` (React Flow) for the canvas; `@dagrejs/dagre` for layout.
- `@anthropic-ai/sdk` + `zod` on the server.
- Deployment target: Vercel (static build plus the `api/` function; `vercel.json` sets a 60 s function timeout).

```
shared/    catalog.ts (categories, tools), schema.ts (zod schema + types), used by client and server
server/    generate.ts (prompt, model call, validation, rate limit)
api/       generate-integrations.ts (Vercel function wrapper)
src/       App.tsx, components/, hooks/useIntegrations.ts, lib/, data/icons.generated.ts
scripts/   gen-icons.mjs
```

## 9. UI Layout

Four columns on desktop (1024 px and up), with the canvas as the widest:

```
┌────────────────────────────────────────────────────────────────────────┐
│ StackPegs                                                              │
├──────────────────────────────┬─────────────────────┬───────────────────┤
│ [ Search all tools...      ] │                     │                   │
├─────────────┬────────────────┤   [Auto-layout][Regen][Download][Clear] │
│ 1. Category │ 2. Drag onto   │                     │ 3. Integration    │
│  Data & Anal│    the canvas  │       CANVAS        │    map            │
│  * BI Tools │  [logo] [logo] │   node --label--> n │  Summary          │
│  * Warehouse│  [logo] [logo] │                     │  Connections      │
│  ...all 14  │  [logo] [logo] │                     │  (click for       │
│  categories │                │                     │   detail)         │
│  in groups  │                │                     │  disclaimer       │
└─────────────┴────────────────┴─────────────────────┴───────────────────┘
   184 px         215 px            flexible              288 px
```

- **Search** spans the top of the two left columns.
- **Column 1, categories**: a vertical list grouped by area, with a color dot per category. All 14 fit without scrolling at 760 px height (the list scrolls on shorter screens). **Other** is pinned below the list under "Not listed?" so it never scrolls out of view. The active category is filled with its color. While a search is active no category is highlighted, and clicking a category clears the search and selects it.
- **Column 2, tools**: the tray, two tiles per row. Search results replace it and show each tool's category. Each category ends with an Other tile that opens the comma-separated box. For Other it shows the add-your-own box and the placeholder tiles.
- **Column 3, canvas**: takes all remaining width.
- **Column 4, integration map**: summary, connections list, and the selected node or edge detail.

Below 1024 px the panels stack vertically: search, category pills (wrapping, with the same color dots), a three-column tool grid, the canvas, then the integration map.

## 10. Running It

```
npm install
cp .env.example .env      # set ANTHROPIC_API_KEY
npm run dev               # http://localhost:5173
npm run build
```

## 11. Phase 2 (deferred)

- Stream the response so edges appear as they are generated.
- Save/share a canvas via URL (needs storage).
- Export the diagram as PNG/SVG (HTML export is done).
- Let visitors flag a wrong integration.
- Shared-store rate limiting and usage analytics.

## 12. Risks

- **Accuracy**: AI-inferred integrations can be generic or wrong for lesser-known pairs. Mitigated by the disclaimer, Regenerate, and by instructing the model to omit uncertain links.
- **Cost / abuse**: every new tool combination is an API call. Bounded by the controls in section 7; add real rate limiting before a public launch.
- **Logo licensing**: see section 3.
- **Refusal fallbacks**: the request handles a `refusal` stop reason with an error message, but does not enable the API's server-side model fallback. Unlikely to matter for this content; revisit if refusals show up.
