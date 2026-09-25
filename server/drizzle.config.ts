import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "drizzle-kit";

// Explicitly load server/.env relative to this file so drizzle-kit's TS
// loader picks it up regardless of cwd.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to server/.env or export it before running drizzle-kit.",
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Mirror config/db.ts: only negotiate TLS when the URL actually asks for it
    // (self-hosted Postgres here refuses SSL and the handshake would fail).
    ssl: /sslmode=require/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
  },
  strict: true,
  verbose: true,
} satisfies Config;
