// ── Time helpers (human-readable building blocks) ──

const SECONDS = 1_000; // 1 second in ms
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// ── Auth timing ──

/** How long an access token stays valid (JWT `expiresIn` string, e.g. "15m", "1h") */
export const ACCESS_TOKEN_EXPIRES_IN =
  (process.env.ACCESS_TOKEN_EXPIRES_IN || "15m") as import("ms").StringValue;

/** Refresh-token / cookie lifetime in days */
export const REFRESH_TOKEN_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7,
);

/** Same value pre-computed as milliseconds (for cookie maxAge & DB TTL) */
export const REFRESH_TOKEN_MAX_AGE_MS =
  REFRESH_TOKEN_EXPIRES_DAYS * DAYS; // default: 7 days → 604 800 000 ms

// ── OTP ──

/** Minutes until an OTP code expires */
export const OTP_EXPIRES_MINUTES = Number(
  process.env.OTP_EXPIRES_MINUTES ?? 10,
);

/** Maximum wrong-code attempts before the OTP is invalidated */
export const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);

// ── Security ──

/** bcrypt hash rounds */
export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

// ── Rate limiting ──

/** Rate-limit window for OTP sends (ms) */
export const RATE_LIMIT_OTP_WINDOW_MS = Number(
  process.env.RATE_LIMIT_OTP_WINDOW_MS ?? 15 * MINUTES, // 15 minutes
);

/** Max OTP sends per window per IP */
export const RATE_LIMIT_OTP_MAX = Number(
  process.env.RATE_LIMIT_OTP_MAX ?? 5,
);

/** Rate-limit window for login attempts (ms) */
export const RATE_LIMIT_LOGIN_WINDOW_MS = Number(
  process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? 15 * MINUTES, // 15 minutes
);

/** Max login attempts per window per IP */
export const RATE_LIMIT_LOGIN_MAX = Number(
  process.env.RATE_LIMIT_LOGIN_MAX ?? 10,
);

// ── HTTP request timeouts (ms) ──

/** Quick lookups — availability checks, token fetches, lightweight GETs */
export const HTTP_TIMEOUT_SHORT = 5 * SECONDS;

/** Standard calls — tracking, cancellation, NDR actions */
export const HTTP_TIMEOUT_MEDIUM = 15 * SECONDS;

/** Heavier calls — bulk tracking, manifest creation */
export const HTTP_TIMEOUT_LONG = 30 * SECONDS;

/** Very slow endpoints — Shipex order creation / label fetch */
export const HTTP_TIMEOUT_EXTRA_LONG = 50 * SECONDS;

// ── File upload ──

/** Max upload size in bytes (5 MB) */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

/** MIME types accepted for KYC document uploads */
export const KYC_ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Map MIME type → file extension */
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
