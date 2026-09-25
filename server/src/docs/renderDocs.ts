import { escapeHtml, renderInline, renderMarkdown } from "./markdown.js";
import {
  authenticationGuide,
  ERRORS_GUIDE,
  SIGNATURE_GUIDE,
  WEBHOOKS_GUIDE,
  type GuideSection,
} from "./guides.js";
import { WEBHOOK_EVENT_CATALOGUE } from "../services/webhookEvents.js";

/**
 * Renders the OpenAPI document into the public docs page.
 *
 * Self-contained on purpose: no CDN, no build step, no client-side spec
 * fetching. The page a reader gets is the page the server rendered from the
 * live spec, which is also what /api/docs/openapi.json serves.
 */

type Json = Record<string, unknown>;

const METHOD_ORDER = ["get", "post", "put", "patch", "delete"] as const;
type Method = (typeof METHOD_ORDER)[number];

interface Operation {
  method: Method;
  path: string;
  op: Json;
  id: string;
}

/* ─────────────────────────────── Helpers ───────────────────────────────── */

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "";
}

function codeBlock(code: string, label?: string): string {
  return [
    '<div class="snippet">',
    label ? `<div class="snippet-label">${escapeHtml(label)}</div>` : "",
    '<button class="copy" type="button" aria-label="Copy to clipboard">Copy</button>',
    `<pre class="code"><code>${escapeHtml(code)}</code></pre>`,
    "</div>",
  ].join("");
}

/** Shell-quote a JSON body for a `-d '...'` argument. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function firstJsonExample(container: Json | undefined): unknown {
  const content = container?.content as Json | undefined;
  const json = content?.["application/json"] as Json | undefined;
  return json?.example;
}

function buildCurl(server: string, opItem: Operation, requiresAuth: boolean): string {
  const { method, path, op } = opItem;
  const lines: string[] = [];
  const url = `${server}${path.replace(/\{(\w+)\}/g, (_m, name: string) => `<${name}>`)}`;

  lines.push(`curl -X ${method.toUpperCase()} ${shellQuote(url)} \\`);
  if (requiresAuth) lines.push("  -H 'Authorization: Bearer <ACCESS_TOKEN>' \\");

  const body = firstJsonExample(op.requestBody as Json | undefined);
  if (body !== undefined) {
    lines.push("  -H 'Content-Type: application/json' \\");
    lines.push(`  -d ${shellQuote(pretty(body))}`);
  } else {
    // Drop the trailing continuation from the last line we emitted.
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
  }
  return lines.join("\n");
}

function renderTable(columns: string[], rows: string[][]): string {
  return [
    '<div class="table-wrap"><table>',
    `<thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`,
    "<tbody>",
    rows
      .map((r) => `<tr>${r.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
      .join(""),
    "</tbody></table></div>",
  ].join("");
}

function schemaLabel(schema: Json | undefined): string {
  if (!schema) return "string";
  const type = Array.isArray(schema.type) ? (schema.type as string[]).join(" | ") : (schema.type as string | undefined);
  const enumValues = schema.enum as unknown[] | undefined;
  if (enumValues?.length) return `${type ?? "string"} · ${enumValues.filter((v) => v !== null).map((v) => `\`${String(v)}\``).join(", ")}`;
  if (schema.format) return `${type ?? "string"} (${String(schema.format)})`;
  return type ?? "string";
}

/* ──────────────────────────── Operation card ───────────────────────────── */

function renderOperation(opItem: Operation, server: string, docSecurity: unknown): string {
  const { method, path, op, id } = opItem;
  const security = (op.security ?? docSecurity) as unknown[] | undefined;
  const requiresAuth = Array.isArray(security) && security.length > 0;

  const parameters = (op.parameters ?? []) as Json[];
  const pathParams = parameters.filter((p) => p.in === "path");
  const queryParams = parameters.filter((p) => p.in === "query");

  const parts: string[] = [];
  parts.push(`<article class="op" id="${escapeHtml(id)}">`);
  parts.push('<div class="op-head">');
  parts.push(
    `<div class="endpoint"><span class="method ${method}">${method.toUpperCase()}</span><code class="path">${escapeHtml(path)}</code></div>`,
  );
  parts.push(
    `<h3>${escapeHtml(String(op.summary ?? id))}${
      requiresAuth
        ? '<span class="badge auth" title="Requires a bearer token">Auth</span>'
        : '<span class="badge public" title="No authentication required">Public</span>'
    }</h3>`,
  );
  parts.push("</div>");

  if (op.description) parts.push(`<div class="prose">${renderMarkdown(String(op.description))}</div>`);

  if (pathParams.length) {
    parts.push("<h4>Path parameters</h4>");
    parts.push(
      renderTable(
        ["Name", "Type", "Description"],
        pathParams.map((p) => [
          `\`${String(p.name)}\``,
          schemaLabel(p.schema as Json | undefined),
          String(p.description ?? ""),
        ]),
      ),
    );
  }

  if (queryParams.length) {
    parts.push("<h4>Query parameters</h4>");
    parts.push(
      renderTable(
        ["Name", "Type", "Description"],
        queryParams.map((p) => [
          `\`${String(p.name)}\``,
          schemaLabel(p.schema as Json | undefined),
          String(p.description ?? ""),
        ]),
      ),
    );
  }

  const requestExample = firstJsonExample(op.requestBody as Json | undefined);
  if (requestExample !== undefined) {
    const required = (op.requestBody as Json).required === true;
    parts.push(`<h4>Request body${required ? "" : ' <span class="optional">optional</span>'}</h4>`);
    parts.push(codeBlock(pretty(requestExample), "application/json"));
  }

  parts.push("<h4>Example request</h4>");
  parts.push(codeBlock(buildCurl(server, opItem, requiresAuth), "cURL"));

  const responses = (op.responses ?? {}) as Json;
  const codes = Object.keys(responses).sort();
  if (codes.length) {
    parts.push("<h4>Responses</h4>");
    for (const code of codes) {
      const response = responses[code] as Json;
      const isOk = code.startsWith("2");
      parts.push('<div class="response">');
      parts.push(
        `<div class="response-head"><span class="status ${isOk ? "ok" : "err"}">${escapeHtml(code)}</span><span class="response-desc">${renderInline(String(response.description ?? ""))}</span></div>`,
      );
      const example = firstJsonExample(response);
      if (example !== undefined) parts.push(codeBlock(pretty(example)));
      else {
        const content = response.content as Json | undefined;
        const nonJson = content ? Object.keys(content).find((k) => k !== "application/json") : undefined;
        if (nonJson) parts.push(`<p class="binary">Returns <code>${escapeHtml(nonJson)}</code>.</p>`);
      }
      parts.push("</div>");
    }
  }

  parts.push("</article>");
  return parts.join("\n");
}

/* ───────────────────────────── Guide section ───────────────────────────── */

function renderGuide(guide: GuideSection): string {
  const parts: string[] = [];
  parts.push(`<section class="section" id="${escapeHtml(guide.id)}">`);
  parts.push(`<h2>${escapeHtml(guide.title)}</h2>`);
  parts.push(`<div class="prose">${renderMarkdown(guide.body)}</div>`);
  if (guide.table) parts.push(renderTable(guide.table.columns, guide.table.rows));
  if (guide.samples) {
    for (const sample of guide.samples) parts.push(codeBlock(sample.code, sample.label));
  }
  parts.push("</section>");
  return parts.join("\n");
}

/* ──────────────────────────────── Page ─────────────────────────────────── */

export function renderDocsPage(spec: Json, opts: { nonce: string; specUrl: string }): string {
  const info = (spec.info ?? {}) as Json;
  const servers = (spec.servers ?? []) as Json[];
  const server = String(servers[0]?.url ?? "");
  const tags = (spec.tags ?? []) as Json[];
  const paths = (spec.paths ?? {}) as Json;
  const docSecurity = spec.security;
  const authGuide = authenticationGuide(server);

  // Group operations by their first tag, preserving the declared tag order.
  const byTag = new Map<string, Operation[]>();
  for (const tag of tags) byTag.set(String(tag.name), []);

  for (const [path, item] of Object.entries(paths)) {
    for (const method of METHOD_ORDER) {
      const op = (item as Json)[method] as Json | undefined;
      if (!op) continue;
      const tagName = String((op.tags as string[] | undefined)?.[0] ?? "Other");
      const id = String(op.operationId ?? `${method}-${slug(path)}`);
      if (!byTag.has(tagName)) byTag.set(tagName, []);
      byTag.get(tagName)!.push({ method, path, op, id });
    }
  }

  /* Sidebar */
  const navGroups: string[] = [];
  const guideLink = (id: string, label: string) =>
    `<a class="nav-item" href="#${id}" data-search="${escapeHtml(label.toLowerCase())}">${escapeHtml(label)}</a>`;

  navGroups.push(
    [
      '<div class="nav-group">',
      '<div class="nav-title">Getting started</div>',
      guideLink("overview", "Overview"),
      guideLink(authGuide.id, authGuide.title),
      guideLink(ERRORS_GUIDE.id, ERRORS_GUIDE.title),
      "</div>",
    ].join(""),
  );

  for (const [tagName, operations] of byTag) {
    if (operations.length === 0) continue;
    navGroups.push(
      [
        '<div class="nav-group">',
        `<div class="nav-title">${escapeHtml(tagName)}</div>`,
        operations
          .map(
            (o) =>
              `<a class="nav-item" href="#${escapeHtml(o.id)}" data-search="${escapeHtml(
                `${o.method} ${o.path} ${String(o.op.summary ?? "")}`.toLowerCase(),
              )}"><span class="m ${o.method}">${o.method.toUpperCase()}</span>${escapeHtml(String(o.op.summary ?? o.id))}</a>`,
          )
          .join(""),
        "</div>",
      ].join(""),
    );
  }

  navGroups.push(
    [
      '<div class="nav-group">',
      '<div class="nav-title">Webhook events</div>',
      guideLink(WEBHOOKS_GUIDE.id, "Receiving events"),
      guideLink(SIGNATURE_GUIDE.id, SIGNATURE_GUIDE.title),
      guideLink("webhook-payload", "Event payload"),
      guideLink("webhook-catalogue", "Event reference"),
      "</div>",
    ].join(""),
  );

  /* Main content */
  const main: string[] = [];

  main.push('<section class="section" id="overview">');
  main.push(`<h1>${escapeHtml(String(info.title ?? "API"))}</h1>`);
  if (info.summary) main.push(`<p class="lede">${renderInline(String(info.summary))}</p>`);
  main.push(
    `<div class="server-row"><span class="server-label">Base URL</span><code class="server-url">${escapeHtml(server)}</code><a class="spec-link" href="${escapeHtml(opts.specUrl)}">OpenAPI spec</a></div>`,
  );
  main.push(`<div class="prose">${renderMarkdown(String(info.description ?? ""))}</div>`);
  main.push("</section>");

  main.push(renderGuide(authGuide));
  main.push(renderGuide(ERRORS_GUIDE));

  for (const [tagName, operations] of byTag) {
    if (operations.length === 0) continue;
    const tagMeta = tags.find((t) => t.name === tagName);
    main.push(`<section class="section" id="tag-${escapeHtml(slug(tagName))}">`);
    main.push(`<h2>${escapeHtml(tagName)}</h2>`);
    if (tagMeta?.description) main.push(`<div class="prose">${renderMarkdown(String(tagMeta.description))}</div>`);
    for (const operation of operations) main.push(renderOperation(operation, server, docSecurity));
    main.push("</section>");
  }

  main.push(renderGuide(WEBHOOKS_GUIDE));
  main.push(renderGuide(SIGNATURE_GUIDE));

  /* Event payload + catalogue, both derived from the live catalogue. */
  const webhookDefs = (spec.webhooks ?? {}) as Json;
  const firstEvent = Object.values(webhookDefs)[0] as Json | undefined;
  const envelopeExample = firstJsonExample((firstEvent?.post as Json | undefined)?.requestBody as Json | undefined);

  main.push('<section class="section" id="webhook-payload">');
  main.push("<h2>Event payload</h2>");
  main.push(
    `<div class="prose">${renderMarkdown(
      [
        "Every event uses the same envelope. `data` describes the shipment and carries the same field set",
        "for every event type — fields that do not apply are `null` rather than absent, so a single handler",
        "and a single schema cover all of them.",
      ].join("\n"),
    )}</div>`,
  );
  if (envelopeExample !== undefined) main.push(codeBlock(pretty(envelopeExample), "Example delivery body"));

  const dataSchema = ((spec.components as Json)?.schemas as Json | undefined)?.WebhookOrderEventData as Json | undefined;
  const dataProps = (dataSchema?.properties ?? {}) as Json;
  main.push("<h4>data</h4>");
  main.push(
    renderTable(
      ["Field", "Type", "Description"],
      Object.entries(dataProps).map(([name, raw]) => {
        const field = raw as Json;
        const deprecated = field.deprecated === true;
        return [
          `\`${name}\`${deprecated ? " *(deprecated)*" : ""}`,
          schemaLabel(field),
          String(field.description ?? ""),
        ];
      }),
    ),
  );
  main.push("</section>");

  main.push('<section class="section" id="webhook-catalogue">');
  main.push("<h2>Event reference</h2>");
  main.push(
    `<div class="prose">${renderMarkdown(
      "Every status change that can arrive on your endpoint. You receive all of them — there is no subscription list. `GET /webhooks/events` returns the same reference at runtime.",
    )}</div>`,
  );
  main.push(
    renderTable(
      ["Event", "Fires when"],
      WEBHOOK_EVENT_CATALOGUE.map((e) => [`\`${e.event}\``, e.description]),
    ),
  );
  main.push("</section>");

  const year = new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(String(info.title ?? "API"))} · Documentation</title>
<meta name="description" content="${escapeHtml(String(info.summary ?? ""))}">
<style nonce="${opts.nonce}">${STYLES}</style>
<script nonce="${opts.nonce}">${THEME_BOOT}</script>
</head>
<body>
<a class="skip" href="#overview">Skip to content</a>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <div>
        <div class="brand-name">Searchcraft</div>
        <div class="brand-sub">API v${escapeHtml(String(info.version ?? "1.0.0"))}</div>
      </div>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch between light and dark">
        <svg class="icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>
        <svg class="icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      </button>
    </div>
    <input id="nav-search" class="nav-search" type="search" placeholder="Search endpoints…" autocomplete="off" aria-label="Search endpoints">
    <nav class="nav">${navGroups.join("")}</nav>
  </aside>
  <main class="main">
    ${main.join("\n")}
    <footer class="footer">
      <p>© ${year} Searchcraft. Questions? <a href="mailto:support@searchcraftdigital.com">support@searchcraftdigital.com</a></p>
    </footer>
  </main>
</div>
<script nonce="${opts.nonce}">${SCRIPT}</script>
</body>
</html>`;
}

/* ─────────────────────────────── Assets ────────────────────────────────── */

const STYLES = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#ffffff; --bg-soft:#f7f8fa; --bg-code:#f4f5f7; --panel:#ffffff;
  --text:#1a1d21; --text-soft:#5b6470; --text-faint:#858e9a;
  --border:#e4e7ec; --border-soft:#eef0f3;
  --accent:#e2571f; --accent-soft:rgba(226,87,31,.1);
  --get:#1f6feb; --post:#1a7f4b; --put:#7c3aed; --patch:#b45309; --delete:#c2261a;
  --ok:#1a7f4b; --err:#c2261a;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
}
/* Dark palette, emitted twice: once for the OS preference (unless the reader
   has explicitly chosen light) and once for an explicit dark choice. */
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
--bg:#0f1114; --bg-soft:#15181d; --bg-code:#14171c; --panel:#111419;
--text:#e6e9ee; --text-soft:#a3acb9; --text-faint:#78818f;
--border:#242932; --border-soft:#1c212a;
--accent:#ff7a45; --accent-soft:rgba(255,122,69,.14);
--get:#5aa2ff; --post:#43c07d; --put:#a78bfa; --patch:#e0a04a; --delete:#f0736a;
--ok:#43c07d; --err:#f0736a;
}}
:root[data-theme="dark"]{
--bg:#0f1114; --bg-soft:#15181d; --bg-code:#14171c; --panel:#111419;
--text:#e6e9ee; --text-soft:#a3acb9; --text-faint:#78818f;
--border:#242932; --border-soft:#1c212a;
--accent:#ff7a45; --accent-soft:rgba(255,122,69,.14);
--get:#5aa2ff; --post:#43c07d; --put:#a78bfa; --patch:#e0a04a; --delete:#f0736a;
--ok:#43c07d; --err:#f0736a;
}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.skip{position:absolute;left:-9999px}
.skip:focus{left:12px;top:12px;background:var(--panel);border:1px solid var(--border);padding:8px 14px;border-radius:8px;z-index:50}

.layout{display:grid;grid-template-columns:288px minmax(0,1fr);min-height:100vh}

.sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;border-right:1px solid var(--border);background:var(--bg-soft);padding:22px 0 40px}
.brand{padding:0 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.theme-toggle{flex-shrink:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text-soft);cursor:pointer;padding:0}
.theme-toggle:hover{color:var(--text);border-color:var(--text-faint)}
.theme-toggle svg{width:15px;height:15px}
.theme-toggle .icon-dark{display:none}
:root[data-theme="dark"] .theme-toggle .icon-dark{display:block}
:root[data-theme="dark"] .theme-toggle .icon-light{display:none}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .theme-toggle .icon-dark{display:block}:root:not([data-theme="light"]) .theme-toggle .icon-light{display:none}}
.brand-name{font-weight:650;font-size:16px;letter-spacing:-.01em}
.brand-sub{color:var(--text-faint);font-size:12px;font-family:var(--mono);margin-top:2px}
.nav-search{width:calc(100% - 44px);margin:0 22px 18px;padding:8px 11px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text);font:inherit;font-size:13px}
.nav-search:focus{outline:2px solid var(--accent-soft);border-color:var(--accent)}
.nav-group{margin-bottom:20px}
.nav-title{padding:0 22px 6px;font-size:11px;font-weight:650;letter-spacing:.09em;text-transform:uppercase;color:var(--text-faint)}
.nav-item{display:flex;align-items:center;gap:8px;padding:5px 22px;color:var(--text-soft);font-size:13.5px;border-left:2px solid transparent}
.nav-item:hover{color:var(--text);background:var(--accent-soft);text-decoration:none}
.nav-item.active{color:var(--text);border-left-color:var(--accent);background:var(--accent-soft)}
.nav-item .m{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.04em;min-width:38px;flex-shrink:0}
.m.get,.method.get{color:var(--get)} .m.post,.method.post{color:var(--post)}
.m.put,.method.put{color:var(--put)} .m.patch,.method.patch{color:var(--patch)}
.m.delete,.method.delete{color:var(--delete)}

.main{padding:44px 48px 80px;max-width:920px}
.section{margin-bottom:56px;scroll-margin-top:24px}
h1{font-size:32px;line-height:1.25;letter-spacing:-.02em;margin:0 0 10px}
h2{font-size:23px;letter-spacing:-.015em;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid var(--border)}
h3{font-size:17px;letter-spacing:-.01em;margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
h4{font-size:12px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:var(--text-faint);margin:24px 0 8px}
p{margin:0 0 12px}
.lede{font-size:17px;color:var(--text-soft);margin-bottom:18px}
.prose ul,.prose ol{margin:0 0 12px;padding-left:22px}
.prose li{margin-bottom:5px}
code{font-family:var(--mono);font-size:.875em;background:var(--bg-code);border:1px solid var(--border-soft);border-radius:4px;padding:1px 5px}

.server-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;background:var(--bg-soft);border:1px solid var(--border);border-radius:10px;margin-bottom:22px}
.server-label{font-size:11px;font-weight:650;letter-spacing:.07em;text-transform:uppercase;color:var(--text-faint)}
.server-url{background:none;border:none;padding:0;font-size:14px;color:var(--text)}
.spec-link{margin-left:auto;font-size:13px;font-weight:550}

.op{border:1px solid var(--border);border-radius:12px;padding:22px 24px;margin-bottom:22px;background:var(--panel);scroll-margin-top:24px}
.op-head{margin-bottom:14px}
.endpoint{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.method{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.05em}
.path{font-size:13.5px;background:var(--bg-code);border:1px solid var(--border-soft);padding:3px 8px;border-radius:6px;word-break:break-all}
.badge{font-size:10px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:20px;border:1px solid var(--border)}
.badge.auth{color:var(--text-faint)}
.badge.public{color:var(--ok);border-color:currentColor}
.optional{font-weight:500;text-transform:none;letter-spacing:0;color:var(--text-faint)}

.snippet{position:relative;margin:0 0 14px}
.snippet-label{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text-faint);margin-bottom:5px}
.copy{position:absolute;top:0;right:8px;font:inherit;font-size:11px;padding:3px 9px;border:1px solid var(--border);border-radius:6px;background:var(--panel);color:var(--text-soft);cursor:pointer;opacity:0;transition:opacity .12s}
.snippet:hover .copy,.copy:focus{opacity:1}
.copy:hover{color:var(--text);border-color:var(--text-faint)}
pre.code{margin:0;padding:13px 15px;background:var(--bg-code);border:1px solid var(--border-soft);border-radius:9px;overflow-x:auto;font-family:var(--mono);font-size:12.5px;line-height:1.6}
pre.code code{background:none;border:none;padding:0;font-size:inherit}

.response{margin-bottom:14px}
.response-head{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap}
.status{font-family:var(--mono);font-size:12px;font-weight:700;padding:1px 7px;border-radius:5px;border:1px solid currentColor}
.status.ok{color:var(--ok)} .status.err{color:var(--err)}
.response-desc{color:var(--text-soft);font-size:14px}
.binary{color:var(--text-soft);font-size:14px}

.table-wrap{overflow-x:auto;margin:0 0 16px;border:1px solid var(--border);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:13.5px}
th{text-align:left;padding:9px 13px;background:var(--bg-soft);color:var(--text-faint);font-size:11px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid var(--border)}
td{padding:9px 13px;border-bottom:1px solid var(--border-soft);vertical-align:top;color:var(--text-soft)}
tr:last-child td{border-bottom:none}
td:first-child{color:var(--text);white-space:nowrap}

.footer{margin-top:64px;padding-top:22px;border-top:1px solid var(--border);color:var(--text-faint);font-size:13px}

@media (max-width:900px){
  .layout{grid-template-columns:1fr}
  .sidebar{position:static;height:auto;border-right:none;border-bottom:1px solid var(--border);max-height:none}
  .main{padding:28px 20px 60px}
  h1{font-size:26px}
}
`;

/**
 * Runs in <head> so the stored preference is applied before the first paint.
 * localStorage can throw in a locked-down browser, so it never blocks render.
 */
const THEME_BOOT = `
(function () {
  try {
    var stored = localStorage.getItem('searchcraft-docs-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

const SCRIPT = `
(function () {
  // Theme toggle. With nothing stored we follow the OS, so the first click
  // resolves against what the reader is actually looking at.
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      if (!current) {
        current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('searchcraft-docs-theme', next); } catch (e) {}
    });
  }

  // Copy-to-clipboard
  document.addEventListener('click', function (event) {
    var button = event.target.closest('.copy');
    if (!button) return;
    var pre = button.parentElement.querySelector('pre code');
    if (!pre || !navigator.clipboard) return;
    navigator.clipboard.writeText(pre.textContent || '').then(function () {
      var original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = original; }, 1200);
    });
  });

  // Sidebar filter
  var search = document.getElementById('nav-search');
  if (search) {
    search.addEventListener('input', function () {
      var term = search.value.trim().toLowerCase();
      document.querySelectorAll('.nav-group').forEach(function (group) {
        var visible = 0;
        group.querySelectorAll('.nav-item').forEach(function (item) {
          var match = !term || (item.getAttribute('data-search') || '').indexOf(term) !== -1;
          item.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        group.style.display = visible ? '' : 'none';
      });
    });
  }

  // Highlight the section currently in view
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var byHash = {};
  links.forEach(function (link) { byHash[link.getAttribute('href').slice(1)] = link; });

  var targets = Object.keys(byHash)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); });
        var link = byHash[entry.target.id];
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '0px 0px -75% 0px', threshold: 0 });
    targets.forEach(function (target) { observer.observe(target); });
  }
})();
`;
