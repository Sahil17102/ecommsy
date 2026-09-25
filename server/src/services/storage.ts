import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getS3Bucket, getS3KeyPrefix, isStorageConfigured, resetS3Client } from "../config/storage.js";
import logger from "../config/logger.js";

const TAG = "[Storage]";

const TRANSPORT_ATTEMPTS = Number(process.env.S3_TRANSPORT_ATTEMPTS) || 3;

/**
 * Does this look like the connection failing rather than S3 refusing us?
 *
 * TLS-layer failures are the ones that bite: a "bad record mac" alert means the
 * peer could not authenticate a record we sent, which the SDK's own retry
 * policy does not classify as retryable, so a single corrupted socket kills the
 * whole call. Auth/permission/not-found errors must NOT be retried — they will
 * fail identically every time.
 */
function isTransportError(err: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current instanceof Error && depth < 5; depth += 1) {
    parts.push(current.message, (current as NodeJS.ErrnoException).code ?? "");
    current = (current as { cause?: unknown }).cause;
  }
  const haystack = parts.join(" ").toLowerCase();
  return (
    haystack.includes("ssl") ||
    haystack.includes("tls") ||
    haystack.includes("bad record mac") ||
    haystack.includes("socket hang up") ||
    haystack.includes("econnreset") ||
    haystack.includes("epipe") ||
    haystack.includes("etimedout") ||
    haystack.includes("econnrefused") ||
    haystack.includes("eai_again") ||
    haystack.includes("premature close") ||
    haystack.includes("network error")
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function physicalKey(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  const prefix = getS3KeyPrefix();
  return prefix ? `${prefix}/${cleanKey}` : cleanKey;
}

/**
 * Run an S3 call, retrying transport-level failures on a fresh client.
 *
 * Without this a momentary TLS blip on the last step of a long job (uploading a
 * finished export, say) throws away everything the job just built.
 */
async function withTransportRetry<T>(label: string, run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= TRANSPORT_ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      if (!isTransportError(err) || attempt === TRANSPORT_ATTEMPTS) throw err;
      logger.warn(
        `${TAG} ${label} failed on attempt ${attempt}/${TRANSPORT_ATTEMPTS} — ${(err as Error).message}. Retrying on a fresh connection.`,
      );
      resetS3Client();
      await wait(500 * attempt);
    }
  }
  throw lastError;
}

/**
 * Upload a buffer to storage. Returns the storage key.
 */
export async function uploadDocument(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("S3 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
  }

  await withTransportRetry(`upload ${key}`, () =>
    getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: physicalKey(key),
        // A fresh Buffer per attempt: a retry must never resume a consumed body.
        Body: Buffer.from(buffer),
        ContentType: contentType,
      }),
    ),
  );
  logger.info(`${TAG} Uploaded to S3 — ${key} (${buffer.length} bytes)`);
  return key;
}

/**
 * Download a document from storage. Returns the buffer and content type.
 */
export async function downloadDocument(
  key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!isStorageConfigured()) {
    throw new Error("S3 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
  }

  // The body is drained inside the retry: a stream that dies half-way is just
  // as much a transport failure as a rejected handshake.
  return withTransportRetry(`download ${key}`, async () => {
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: getS3Bucket(), Key: physicalKey(key) }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType || "application/octet-stream",
    };
  });
}

/**
 * Delete an object from storage. Missing objects are not an error.
 */
export async function deleteDocument(key: string): Promise<void> {
  if (!isStorageConfigured()) return;

  const client = getS3Client();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: physicalKey(key) }));
    logger.info(`${TAG} Deleted from S3 — ${key}`);
  } catch (err) {
    logger.warn(`${TAG} Delete failed for ${key} — ${(err as Error).message}`);
  }
}

/**
 * Build the storage key for a document.
 */
export function buildDocumentKey(
  userId: string,
  orderId: string,
  docType: "label" | "invoice" | "manifest",
  ext = "pdf",
): string {
  return `documents/${userId}/${docType}/${orderId}.${ext}`;
}
