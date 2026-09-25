import { S3Client } from "@aws-sdk/client-s3";
import logger from "./logger.js";

/**
 * S3-compatible client — works with AWS S3, Cloudflare R2, MinIO, etc.
 * Configure via env vars:
 *   S3_ENDPOINT        – e.g. https://<account>.r2.cloudflarestorage.com
 *   S3_REGION           – e.g. auto (R2) or ap-south-1 (AWS)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_BUCKET           – bucket name for documents
 *
 * All env reads are deferred to first access so that dotenv.config() has
 * time to run before any value is captured.
 */

interface StorageEnv {
  endpoint?: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  keyPrefix: string;
}

function cleanPrefix(value: string | undefined): string {
  return (value || "").trim().replace(/^\/+|\/+$/g, "");
}

function resolveStorageEnv(): StorageEnv {
  let endpoint = (process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || "").trim() || undefined;
  let bucket = (process.env.S3_BUCKET || process.env.PROD_BUCKET || "").trim();

  if (endpoint) {
    try {
      const url = new URL(endpoint);
      const endpointPath = cleanPrefix(url.pathname);
      const pathBucket = endpointPath.split("/").filter(Boolean)[0];
      url.pathname = "";
      url.search = "";
      url.hash = "";
      endpoint = url.toString().replace(/\/+$/, "");
      if (!bucket && pathBucket) bucket = pathBucket;
    } catch {
      // The SDK will surface invalid endpoints with full context.
    }
  }

  return {
    endpoint,
    bucket: bucket || "courier-documents",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || process.env.R2_REGION || "auto",
    keyPrefix: cleanPrefix(process.env.S3_KEY_PREFIX || process.env.R2_KEY_PREFIX),
  };
}

export function getS3Bucket(): string {
  return resolveStorageEnv().bucket;
}

export function getS3KeyPrefix(): string {
  return resolveStorageEnv().keyPrefix;
}

export function isStorageConfigured(): boolean {
  const env = resolveStorageEnv();
  return Boolean(env.endpoint && env.accessKeyId && env.secretAccessKey);
}

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_client) {
    if (!isStorageConfigured()) {
      logger.warn("[Storage] S3 not configured — documents will not be persisted to cloud storage");
    }

    const env = resolveStorageEnv();
    _client = new S3Client({
      endpoint: env.endpoint,
      region: env.region,
      credentials: {
        accessKeyId: env.accessKeyId || "",
        secretAccessKey: env.secretAccessKey || "",
      },
      forcePathStyle: true, // Required for R2 / MinIO
      maxAttempts: Number(process.env.S3_MAX_ATTEMPTS) || 4,
    });
  }
  return _client;
}

/**
 * Throw the client (and every socket it is holding) away.
 *
 * A keep-alive socket that has gone bad mid-TLS — "bad record mac", a reset
 * peer — stays in the agent's pool and poisons the next request that happens
 * to pick it up. Retrying on a fresh client is the only reliable way out.
 */
export function resetS3Client(): void {
  const previous = _client;
  _client = null;
  try {
    previous?.destroy();
  } catch {
    // A client that can't be destroyed is already unusable — nothing to do.
  }
}
