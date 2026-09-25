import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { buildOpenApiDocument } from "../docs/openapi.js";
import { renderDocsPage } from "../docs/renderDocs.js";

/**
 * Public API documentation.
 *
 *   GET /docs               → the rendered documentation page
 *   GET /docs/openapi.json  → the OpenAPI 3.1 document (Postman / Insomnia / codegen)
 *
 * Deliberately unauthenticated and open to any origin: this is reference
 * material, not account data. It is mounted ahead of the global CORS guard in
 * index.ts so a cross-origin tool can fetch the spec without being rejected.
 */

const NONCE_PLACEHOLDER = "__CSP_NONCE__";

/** The spec is derived from constants and env, so it is built once per process. */
let cachedSpec: Record<string, unknown> | null = null;
/** Rendered HTML per mount path, with the nonce left as a placeholder. */
const cachedHtml = new Map<string, string>();

function getSpec(): Record<string, unknown> {
  if (!cachedSpec) cachedSpec = buildOpenApiDocument();
  return cachedSpec;
}

function getHtml(basePath: string): string {
  const cached = cachedHtml.get(basePath);
  if (cached) return cached;
  const html = renderDocsPage(getSpec(), {
    nonce: NONCE_PLACEHOLDER,
    specUrl: `${basePath}/openapi.json`,
  });
  cachedHtml.set(basePath, html);
  return html;
}

const router = Router();

// Readable by any origin and cacheable by intermediaries — helmet's defaults
// assume same-origin app responses, which is the wrong posture for docs.
router.use((_req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "public, max-age=300");
  next();
});

router.get("/openapi.json", (_req: Request, res: Response) => {
  res.type("application/json").send(JSON.stringify(getSpec(), null, 2));
});

router.get("/", (req: Request, res: Response) => {
  const nonce = crypto.randomBytes(16).toString("base64");

  // Replaces the policy helmet set for the rest of the app: this page is a
  // single self-contained document with no external assets at all.
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "base-uri 'none'",
      `style-src 'nonce-${nonce}'`,
      `script-src 'nonce-${nonce}'`,
      "img-src 'self' data:",
      "connect-src 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  const basePath = req.baseUrl || "/docs";
  res.type("html").send(getHtml(basePath).split(NONCE_PLACEHOLDER).join(nonce));
});

export default router;
