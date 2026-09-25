import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import logger from "./logger.js";
import * as schema from "../db/schema.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle<typeof schema>>;

export async function connectDB(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");

  const cleanUrl = url.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");
  pool = new Pool({ connectionString: cleanUrl, max: 10, ssl: false });
  await pool.query("SELECT 1");
  db = drizzle(pool, { schema });
  logger.info("Postgres connected");
}

export async function disconnectDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
