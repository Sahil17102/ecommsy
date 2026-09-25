import {
  createProvider,
  loadActiveAccounts,
  type ProviderAccount,
  type ServiceabilityParams,
  type ServiceabilityResult,
} from "./providers/index.js";
import logger from "../config/logger.js";

// Re-export types so existing consumers don't break
export type { ServiceabilityParams, ServiceabilityResult, ProviderAccount };

export interface ServiceabilityCheckResult {
  /** Per-account results keyed by `service_providers.id`. */
  byAccountId: Map<string, ServiceabilityResult>;
  /** All active accounts that were checked (with display info). */
  accounts: ProviderAccount[];
}

const TAG = "[Serviceability]";

/** Max time (ms) to wait for ALL serviceability checks before returning partial results */
const SERVICEABILITY_TIMEOUT_MS = 10_000;

/** Wraps a promise with a timeout — resolves to a fallback on timeout instead of rejecting */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      logger.warn(`${TAG} [${label}] Timed out after ${ms}ms — using fallback`);
      resolve(fallback);
    }, ms);

    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); logger.error(`${TAG} [${label}] Rejected — ${err}`); resolve(fallback); },
    );
  });
}

export async function checkServiceability(
  params: ServiceabilityParams,
): Promise<ServiceabilityCheckResult> {
  const start = Date.now();
  logger.info(
    `${TAG} Starting checks — ${params.origin} → ${params.destination} (${params.weight}g, ${params.paymentType})`,
  );

  const accounts = await loadActiveAccounts();
  logger.info(`${TAG} Checking ${accounts.length} account(s): ${accounts.map((a) => `${a.name}/${a.slug}`).join(", ") || "—"}`);

  const checks: Promise<ServiceabilityResult>[] = accounts.map((account) => {
    const provider = createProvider(account);
    // Default: if there's no integration class for this slug, assume serviceable so
    // the brand still shows up — but the order flow will fail loudly if used.
    const fallback: ServiceabilityResult = {
      accountId: account.id,
      provider: account.slug,
      serviceable: true,
    };

    if (!provider) {
      logger.warn(`${TAG} No provider class registered for slug "${account.slug}" — account "${account.name}" defaulting to serviceable`);
      return Promise.resolve(fallback);
    }

    return withTimeout(
      provider.checkServiceability(params),
      SERVICEABILITY_TIMEOUT_MS,
      { ...fallback, serviceable: false },
      `${account.slug}/${account.name}`,
    );
  });

  const results = await Promise.all(checks);
  const byAccountId = new Map<string, ServiceabilityResult>();
  for (const result of results) {
    byAccountId.set(result.accountId, result);
  }

  const summary = accounts
    .map((a) => `${a.name}: ${byAccountId.get(a.id)?.serviceable ? "YES" : "NO"}`)
    .join(" | ");
  logger.info(`${TAG} All checks complete — ${summary} (total: ${Date.now() - start}ms)`);

  return { byAccountId, accounts };
}
