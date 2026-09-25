import { and, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { serviceProviders } from "../../db/schema.js";
import logger from "../../config/logger.js";

import { BaseProvider, type ProviderAccount, type ServiceProviderCredentials } from "./BaseProvider.js";
import { DelhiveryProvider } from "./DelhiveryProvider.js";
import { DelhiveryB2bProvider } from "./DelhiveryB2bProvider.js";
import { XpressbeesProvider } from "./XpressbeesProvider.js";
import { XpressbeesB2bProvider } from "./XpressbeesB2bProvider.js";
import { EkartProvider } from "./EkartProvider.js";
import { ShipexProvider } from "./ShipexProvider.js";
import { DtdcProvider } from "./DtdcProvider.js";
import { DreamzProvider } from "./DreamzProvider.js";

export { BaseProvider } from "./BaseProvider.js";
export type { ProviderAccount, ServiceProviderCredentials } from "./BaseProvider.js";
export type { ServiceabilityParams, ServiceabilityResult, OrderCreationParams, OrderCreationResult } from "../../types/provider.js";
export { DelhiveryProvider, DelhiveryB2bProvider, XpressbeesProvider, XpressbeesB2bProvider, EkartProvider, ShipexProvider, DtdcProvider, DreamzProvider };

type ProviderClass = new (account: ProviderAccount) => BaseProvider;

/**
 * Maps `service_providers.slug` → provider class for B2C orders.
 * Each instance is constructed per account, so two rows under the same slug
 * coexist as independent provider instances.
 */
const B2C_CLASSES: Record<string, ProviderClass> = {
  delhivery: DelhiveryProvider,
  xpressbees: XpressbeesProvider,
  ekart: EkartProvider,
  shipexindia: ShipexProvider,
  dtdc: DtdcProvider,
  dreamz: DreamzProvider,
};

/**
 * Maps slug → provider class for B2B orders. Only brands with a dedicated
 * B2B integration are listed; everything else falls back to the B2C class.
 */
const B2B_CLASSES: Record<string, ProviderClass> = {
  delhivery: DelhiveryB2bProvider,
  xpressbees: XpressbeesB2bProvider,
};

/**
 * Normalize an order's stored `orderType` to the value {@link createProvider}
 * expects. The DB stores it lowercase (`"b2b"` / `"b2c"`), while the provider
 * registry keys off uppercase `"B2B"` / `"B2C"`. Anything that isn't B2B is
 * treated as B2C (the safe default, matching the previous behaviour).
 */
export function providerOrderType(orderType: string | null | undefined): "B2B" | "B2C" {
  return orderType?.toUpperCase() === "B2B" ? "B2B" : "B2C";
}

/** Returns the list of integration slugs that have a registered provider class. */
export function listKnownSlugs(): string[] {
  return Object.keys(B2C_CLASSES);
}

/** Returns true if the given slug has a registered provider class. */
export function isKnownSlug(slug: string): boolean {
  return slug in B2C_CLASSES;
}

/**
 * Construct a provider instance bound to a specific account row.
 * Returns null if no provider class is registered for the row's slug.
 */
export function createProvider(
  account: ProviderAccount,
  orderType: "B2B" | "B2C" = "B2C",
): BaseProvider | null {
  const Klass =
    orderType === "B2B"
      ? B2B_CLASSES[account.slug] ?? B2C_CLASSES[account.slug]
      : B2C_CLASSES[account.slug];
  if (!Klass) return null;
  return new Klass(account);
}

/**
 * Load all active accounts from `service_providers`. Each row is treated as
 * an independent integration instance.
 */
export async function loadActiveAccounts(): Promise<ProviderAccount[]> {
  const rows = await db
    .select({
      id: serviceProviders.id,
      slug: serviceProviders.slug,
      name: serviceProviders.name,
      credentials: serviceProviders.credentials,
    })
    .from(serviceProviders)
    .where(eq(serviceProviders.isActive, true));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    credentials: (r.credentials as ServiceProviderCredentials | null) ?? null,
  }));
}

/**
 * Load a single account by id. Returns null if the row is missing or inactive.
 */
export async function loadAccountById(id: string): Promise<ProviderAccount | null> {
  const row = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.id, id), eq(serviceProviders.isActive, true)),
  });
  if (!row) {
    logger.warn(`[ProviderRegistry] No active service_providers row with id=${id}`);
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    credentials: (row.credentials as ServiceProviderCredentials | null) ?? null,
  };
}

/**
 * Resolve the account an existing order was shipped through. Reads
 * `orders.metadata.serviceProviderId` (set by orderCreation when booking).
 *
 * For pre-multi-account orders that don't have it stored, falls back to the
 * first active account of the order's slug — logs a warning.
 */
export async function resolveAccountForOrder(order: {
  serviceProvider: string | null;
  metadata: unknown;
}): Promise<ProviderAccount | null> {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const accountId = typeof meta.serviceProviderId === "string" ? meta.serviceProviderId : null;

  if (accountId) {
    const account = await loadAccountById(accountId);
    if (account) return account;
    logger.warn(
      `[ProviderRegistry] Order references serviceProviderId=${accountId} but no active row found — falling back to slug lookup`,
    );
  }

  if (!order.serviceProvider) {
    logger.warn(`[ProviderRegistry] Order has no serviceProvider slug and no metadata.serviceProviderId — cannot resolve account`);
    return null;
  }

  const fallback = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.slug, order.serviceProvider), eq(serviceProviders.isActive, true)),
  });
  if (!fallback) return null;
  logger.warn(
    `[ProviderRegistry] Order (slug=${order.serviceProvider}) has no metadata.serviceProviderId — using first active account "${fallback.name}"`,
  );
  return {
    id: fallback.id,
    slug: fallback.slug,
    name: fallback.name,
    credentials: (fallback.credentials as ServiceProviderCredentials | null) ?? null,
  };
}

/**
 * Resolve the account a courier row is bound to. Reads
 * `couriers.metaData.serviceProviderId` (UUID of the service_providers row).
 *
 * For couriers without an explicit binding, returns the first active account
 * of the matching slug as a pragmatic default — logs a warning so it can be
 * fixed via the admin UI.
 */
export async function resolveAccountForCourier(courier: {
  serviceProvider: string;
  metaData: unknown;
}): Promise<ProviderAccount | null> {
  const meta = (courier.metaData ?? {}) as Record<string, unknown>;
  const accountId = typeof meta.serviceProviderId === "string" ? meta.serviceProviderId : null;

  if (accountId) {
    const account = await loadAccountById(accountId);
    if (account) return account;
    logger.warn(
      `[ProviderRegistry] Courier references serviceProviderId=${accountId} but no active row found — falling back to slug lookup`,
    );
  }

  const fallback = await db.query.serviceProviders.findFirst({
    where: and(eq(serviceProviders.slug, courier.serviceProvider), eq(serviceProviders.isActive, true)),
  });
  if (!fallback) return null;
  logger.warn(
    `[ProviderRegistry] Courier (slug=${courier.serviceProvider}) has no metaData.serviceProviderId — using first active account "${fallback.name}"`,
  );
  return {
    id: fallback.id,
    slug: fallback.slug,
    name: fallback.name,
    credentials: (fallback.credentials as ServiceProviderCredentials | null) ?? null,
  };
}
