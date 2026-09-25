import axios, { AxiosError } from "axios";
import logger from "../../config/logger.js";
import type {
  ServiceabilityParams,
  ServiceabilityResult,
  OrderCreationParams,
  OrderCreationResult,
} from "../../types/provider.js";

/**
 * Coerce a courier error detail into a human-readable string. Couriers are
 * inconsistent: Delhivery returns arrays (`{ error: [...] }`), some return a
 * plain string, others a nested object. Returns undefined for empty/missing
 * values so the caller can fall through to the next candidate.
 */
function stringifyDetail(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const parts = value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : undefined;
  }
  return undefined;
}

interface CredentialBlock {
  fields?: Array<{ key: string; label: string; type: string; required: boolean }>;
  description?: string;
  values?: Record<string, string>;
}

interface B2bCredentialBlock extends CredentialBlock {
  sameAsB2c?: boolean;
}

export interface ServiceProviderCredentials {
  b2c?: CredentialBlock;
  b2b?: B2bCredentialBlock;
}

/**
 * Lean view of a `service_providers` row passed into every provider instance.
 * One row = one account; multiple rows can share a slug (multi-account per brand).
 */
export interface ProviderAccount {
  /** `service_providers.id` — uniquely identifies this account row. */
  id: string;
  /** `service_providers.slug` — the integration this account belongs to (e.g. "xpressbees"). */
  slug: string;
  /** Display name for logs and UI (e.g. "Xpressbees", "Expressbees-2"). */
  name: string;
  /** Parsed credentials JSON (b2c + b2b blocks). */
  credentials: ServiceProviderCredentials | null;
}

export type {
  ServiceabilityParams,
  ServiceabilityResult,
  OrderCreationParams,
  OrderCreationResult,
};

/**
 * Base class for all courier service providers.
 *
 * Each subclass is generic — it does not hardcode a slug. Provider instances
 * are constructed per `service_providers` row, so two accounts of the same
 * brand (e.g. two Xpressbees franchises) live as two independent instances
 * with their own credentials and token caches.
 */
export abstract class BaseProvider {
  /** Human-readable name for logging (subclass may include account name) */
  abstract readonly displayName: string;

  /** The account row this instance is bound to. */
  readonly account: ProviderAccount;

  constructor(account: ProviderAccount) {
    this.account = account;
  }

  // ── Convenience accessors ──

  get accountId(): string {
    return this.account.id;
  }

  /** Integration slug (e.g. "xpressbees"). */
  get slug(): string {
    return this.account.slug;
  }

  /** Account display name (e.g. "Expressbees-2"). */
  get accountName(): string {
    return this.account.name;
  }

  // ── Token cache (shared across all instances via static) ──
  // Keyed by `${className}:${accountId}` so:
  //   - two accounts under the same brand have independent tokens
  //   - B2B/B2C variant classes on the same account also don't collide

  private static tokenCache: Record<string, { token: string; expiresAt: number }> = {};

  private get tokenCacheKey(): string {
    return `${this.constructor.name}:${this.account.id}`;
  }

  protected getCachedToken(): string | null {
    const entry = BaseProvider.tokenCache[this.tokenCacheKey];
    if (entry && Date.now() < entry.expiresAt) return entry.token;
    return null;
  }

  protected setCachedToken(token: string, ttlMs: number): void {
    BaseProvider.tokenCache[this.tokenCacheKey] = { token, expiresAt: Date.now() + ttlMs };
  }

  protected clearCachedToken(): void {
    delete BaseProvider.tokenCache[this.tokenCacheKey];
  }

  // ── Credentials (read straight off the in-memory account row) ──
  // Kept async so existing `await this.getCredentials(...)` call sites need no churn.

  protected async getCredentials(businessType: "b2c" | "b2b" = "b2c"): Promise<Record<string, string> | null> {
    const creds = this.account.credentials;
    if (!creds) {
      this.log("warn", "Provider credentials missing");
      return null;
    }

    let vals: Record<string, string> | undefined;

    if (businessType === "b2b") {
      const b2bBlock = creds.b2b;
      // If sameAsB2c flag is set or B2B values are empty, fall back to B2C
      if (b2bBlock?.sameAsB2c || !b2bBlock?.values || Object.keys(b2bBlock.values).length === 0) {
        vals = creds.b2c?.values;
      } else {
        vals = b2bBlock.values;
      }
    } else {
      vals = creds.b2c?.values;
    }

    if (!vals || Object.keys(vals).length === 0) {
      this.log("warn", `No ${businessType.toUpperCase()} credentials configured`);
      return null;
    }

    return vals;
  }

  // ── Logging ──

  protected log(level: "debug" | "info" | "warn" | "error", message: string): void {
    logger[level](`[${this.displayName}] ${message}`);
  }

  // ── Traced HTTP (shared request/response logging) ──
  //
  // Courier APIs fail in ways that are impossible to diagnose after the fact
  // unless the exact URL, headers, body and raw response were captured at the
  // time. `tracedRequest` is the single place that happens, so every provider
  // logs the same way and no call site can quietly skip it.

  /** Payload/header keys whose values must never reach the logs verbatim. */
  private static readonly SECRET_KEYS = new Set([
    "password",
    "token",
    "authorization",
    "api_key",
    "apikey",
    "x-api-key",
    "access_token",
    "accesstoken",
    "secret",
    "client_secret",
    "webhooksecret",
  ]);

  /** Hard cap on one logged JSON blob so a bulk response can't flood the logs. */
  private static readonly MAX_LOG_CHARS = 12000;

  /** Mask a secret, keeping just enough to tell two values apart. */
  protected maskSecret(value: unknown): string {
    const s = typeof value === "string" ? value : String(value ?? "");
    if (!s) return "<empty>";
    if (s.length <= 8) return "*".repeat(s.length);
    return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
  }

  /** Deep-copy a value, masking anything that looks like a credential. */
  protected redactForLog(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((v) => this.redactForLog(v));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        out[key] = BaseProvider.SECRET_KEYS.has(key.toLowerCase())
          ? this.maskSecret(val)
          : this.redactForLog(val);
      }
      return out;
    }
    return value;
  }

  /** Pretty-print a redacted payload/response, truncated to keep logs readable. */
  protected prettyLog(value: unknown): string {
    if (value === undefined) return "<none>";
    // A pre-serialised body (form-encoded string) is logged verbatim —
    // JSON.stringify would wrap it in quotes and misrepresent what we sent.
    if (typeof value === "string") return value;
    // FormData / streams have no useful JSON form — JSON.stringify yields "{}".
    if (typeof (value as { getHeaders?: unknown })?.getHeaders === "function") {
      return "<multipart form-data>";
    }
    let json: string;
    try {
      json = JSON.stringify(this.redactForLog(value), null, 2) ?? String(value);
    } catch {
      return "<unserialisable payload>";
    }
    if (json.length <= BaseProvider.MAX_LOG_CHARS) return json;
    return `${json.slice(0, BaseProvider.MAX_LOG_CHARS)}\n… [truncated ${json.length - BaseProvider.MAX_LOG_CHARS} chars]`;
  }

  /** A copy-pasteable curl for the exact call we made (auth redacted). */
  protected curlFor(
    method: string,
    url: string,
    headers: Record<string, string>,
    data?: unknown,
    params?: Record<string, unknown>,
  ): string {
    const query = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    const parts = [`curl -X ${method} '${url}${query ? `?${query}` : ""}'`];
    for (const [key, val] of Object.entries(headers)) {
      parts.push(`-H '${key}: ${BaseProvider.SECRET_KEYS.has(key.toLowerCase()) ? "<redacted>" : val}'`);
    }
    if (data !== undefined) {
      try {
        parts.push(`-d '${typeof data === "string" ? data : JSON.stringify(this.redactForLog(data))}'`);
      } catch {
        /* ignore — body is logged separately */
      }
    }
    return parts.join(" ");
  }

  /**
   * Perform an HTTP call with full request/response tracing.
   *
   * Logs, in order: method + URL → headers → query params → request payload →
   * curl (debug) → HTTP status + latency → raw response body. On failure it
   * logs the status, the raw error body and the response headers, then RETHROWS
   * so callers keep their existing 401 / error handling untouched.
   *
   * `op` is a short label for the call (e.g. "createOrder", "assignAwb") and
   * prefixes every line so interleaved logs stay readable.
   */
  protected async tracedRequest<T = unknown>(
    op: string,
    cfg: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      data?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
      timeout?: number;
      responseType?: "json" | "arraybuffer" | "text";
      /** Passed through to axios — lets a call site treat 4xx as a normal response. */
      validateStatus?: (status: number) => boolean;
    },
  ): Promise<T> {
    const headers = cfg.headers ?? {};
    const started = Date.now();

    this.log("info", `[${op}] → ${cfg.method} ${cfg.url}`);
    this.log("info", `[${op}] request headers: ${this.prettyLog(headers)}`);
    if (cfg.params) this.log("info", `[${op}] query params: ${this.prettyLog(cfg.params)}`);
    this.log("info", `[${op}] request payload: ${this.prettyLog(cfg.data)}`);
    this.log("debug", `[${op}] curl: ${this.curlFor(cfg.method, cfg.url, headers, cfg.data, cfg.params)}`);

    try {
      const res = await axios.request<T>({
        method: cfg.method,
        url: cfg.url,
        data: cfg.data,
        params: cfg.params,
        headers,
        timeout: cfg.timeout,
        responseType: cfg.responseType,
        validateStatus: cfg.validateStatus,
      });
      const ms = Date.now() - started;
      this.log("info", `[${op}] ← HTTP ${res.status} ${res.statusText ?? ""} (${ms}ms) ${cfg.method} ${cfg.url}`);
      this.log(
        "info",
        `[${op}] response body: ${
          cfg.responseType === "arraybuffer"
            ? `<binary, ${(res.data as unknown as ArrayBuffer)?.byteLength ?? "?"} bytes>`
            : this.prettyLog(res.data)
        }`,
      );
      return res.data;
    } catch (err) {
      const ms = Date.now() - started;
      const status = err instanceof AxiosError ? (err.response?.status ?? "no-response") : "n/a";
      this.log(
        "error",
        `[${op}] ✖ ${cfg.method} ${cfg.url} FAILED (${ms}ms) — HTTP ${status} — ${this.formatError(err)}`,
      );
      if (err instanceof AxiosError) {
        this.log(
          "error",
          `[${op}] error response body: ${err.response ? this.prettyLog(err.response.data) : "<no response received>"}`,
        );
        if (err.response?.headers) {
          this.log("debug", `[${op}] error response headers: ${this.prettyLog({ ...err.response.headers })}`);
        }
        if (err.code) this.log("debug", `[${op}] axios error code: ${err.code}`);
      }
      throw err;
    }
  }

  /**
   * Same as {@link tracedRequest} but returns the full axios response, for the
   * few call sites that need response headers (DTDC reads its auth token and
   * label content-type off them).
   */
  protected async tracedRequestFull<T = unknown>(
    op: string,
    cfg: Parameters<BaseProvider["tracedRequest"]>[1],
  ): Promise<{ data: T; status: number; headers: Record<string, unknown> }> {
    const headers = cfg.headers ?? {};
    const started = Date.now();

    this.log("info", `[${op}] → ${cfg.method} ${cfg.url}`);
    this.log("info", `[${op}] request headers: ${this.prettyLog(headers)}`);
    if (cfg.params) this.log("info", `[${op}] query params: ${this.prettyLog(cfg.params)}`);
    this.log("info", `[${op}] request payload: ${this.prettyLog(cfg.data)}`);
    this.log("debug", `[${op}] curl: ${this.curlFor(cfg.method, cfg.url, headers, cfg.data, cfg.params)}`);

    try {
      const res = await axios.request<T>({
        method: cfg.method,
        url: cfg.url,
        data: cfg.data,
        params: cfg.params,
        headers,
        timeout: cfg.timeout,
        responseType: cfg.responseType,
        validateStatus: cfg.validateStatus,
      });
      const ms = Date.now() - started;
      this.log("info", `[${op}] ← HTTP ${res.status} ${res.statusText ?? ""} (${ms}ms) ${cfg.method} ${cfg.url}`);
      this.log(
        "info",
        `[${op}] response body: ${
          cfg.responseType === "arraybuffer"
            ? `<binary, ${(res.data as unknown as ArrayBuffer)?.byteLength ?? "?"} bytes>`
            : this.prettyLog(res.data)
        }`,
      );
      this.log("debug", `[${op}] response headers: ${this.prettyLog({ ...res.headers })}`);
      return { data: res.data, status: res.status, headers: { ...res.headers } };
    } catch (err) {
      const ms = Date.now() - started;
      const status = err instanceof AxiosError ? (err.response?.status ?? "no-response") : "n/a";
      this.log(
        "error",
        `[${op}] ✖ ${cfg.method} ${cfg.url} FAILED (${ms}ms) — HTTP ${status} — ${this.formatError(err)}`,
      );
      if (err instanceof AxiosError) {
        this.log(
          "error",
          `[${op}] error response body: ${err.response ? this.prettyLog(err.response.data) : "<no response received>"}`,
        );
        if (err.code) this.log("debug", `[${op}] axios error code: ${err.code}`);
      }
      throw err;
    }
  }

  // ── Error formatting ──

  protected formatError(err: unknown): string {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? "N/A";
      const data = this.parseResponseData(err.response?.data);
      // Some providers nest the detail (e.g. DTDC: { error: { message, reason } }).
      const nested =
        data && typeof data.error === "object" && data.error !== null
          ? (data.error as Record<string, unknown>)
          : null;
      // Ekart returns { description, message, severity } — prefer description for human-readable detail.
      // Delhivery's pickup/edit endpoints return errors as arrays — { error: [...] } or
      // { errors: [...] } — so check those before falling back to the generic axios message.
      const msg =
        (data?.description as string | undefined) ||
        (data?.message as string | undefined) ||
        (nested?.message as string | undefined) ||
        stringifyDetail(data?.error) ||
        stringifyDetail(data?.errors) ||
        stringifyDetail(data?.rmk) ||
        // Last resort: surface the raw body so a 400 is never opaque in the logs.
        (data ? JSON.stringify(data) : undefined) ||
        err.message;
      const reason = nested?.reason ? ` (${nested.reason})` : "";
      return `HTTP ${status} — ${msg}${reason}`;
    }
    return (err as Error).message;
  }

  /**
   * Safely parse response data that may be a Buffer/ArrayBuffer (from arraybuffer responseType)
   * or a plain object (from default JSON responseType).
   */
  private parseResponseData(data: unknown): Record<string, unknown> | null {
    if (!data) return null;
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
      try {
        const text = Buffer.from(data as ArrayBuffer).toString("utf-8");
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
    if (typeof data === "object") return data as Record<string, unknown>;
    return null;
  }

  /** Returns true if the error is a 401 — subclasses should clear token cache on this */
  protected isUnauthorized(err: unknown): boolean {
    return err instanceof AxiosError && err.response?.status === 401;
  }

  // ── Result helpers (stamp accountId + slug on every return) ──

  protected serviceabilityResult(
    serviceable: boolean,
    extra: Partial<Omit<ServiceabilityResult, "accountId" | "provider" | "serviceable">> = {},
  ): ServiceabilityResult {
    return {
      accountId: this.account.id,
      provider: this.account.slug,
      serviceable,
      ...extra,
    };
  }

  protected orderResult(
    fields: Omit<OrderCreationResult, "accountId" | "provider">,
  ): OrderCreationResult {
    return {
      accountId: this.account.id,
      provider: this.account.slug,
      ...fields,
    };
  }

  // ── Abstract methods (each provider must implement) ──

  abstract checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult>;

  abstract createOrder(params: OrderCreationParams): Promise<OrderCreationResult>;

  // ── Optional methods (providers override if supported) ──

  /** Cancel a shipment by AWB. Returns success/error. */
  async cancelOrder(
    _awb: string,
    _order?: { id?: string; orderId?: string | null; metadata?: unknown },
    _reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    this.log("info", "No cancel API available — skipping");
    return { success: true };
  }

  /** Take an NDR action (reattempt, reschedule, RTO). Returns success/error. */
  async ndrAction(
    _awb: string,
    _params: { action: string; rescheduledDate?: string; updatedPhone?: string; updatedAddress?: string },
  ): Promise<{ success: boolean; error?: string }> {
    this.log("info", "No NDR action API available — skipping");
    return { success: true };
  }

  /** Track a shipment by AWB. Returns raw tracking data or null. */
  async trackOrder(_awb: string): Promise<Record<string, unknown> | null> {
    this.log("info", "No tracking API available — skipping");
    return null;
  }

  /**
   * Request pickup for a shipment. Returns success/error.
   *
   * `expectedPackageCount` is how many shipments the same pickup covers — most
   * couriers raise ONE pickup per warehouse + date, so a bulk manifest sends a
   * single request carrying the whole count rather than one per AWB.
   */
  async requestPickup(
    _awb: string,
    _params: {
      pickupDate?: string;
      pickupTime?: string;
      pickupLocation?: string;
      expectedPackageCount?: number;
    },
  ): Promise<{
    success: boolean;
    error?: string;
    pickupId?: string;
    /** True when the courier reused an existing pickup instead of raising one. */
    alreadyScheduled?: boolean;
    /** Courier's own wording for a non-failure caveat (shown to the user). */
    message?: string;
  }> {
    this.log("info", "No separate pickup API — handled via order creation");
    return { success: true };
  }
}

export { axios, AxiosError };
