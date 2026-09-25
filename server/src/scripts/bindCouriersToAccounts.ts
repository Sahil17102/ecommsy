/**
 * Backfill couriers.metaData.serviceProviderId by binding each courier row to a
 * service-provider account. Without this binding the availability flow skips
 * every courier (see services/courierAvailability.ts step 6).
 *
 * Usage:
 *   tsx src/scripts/bindCouriersToAccounts.ts             # interactive
 *   tsx src/scripts/bindCouriersToAccounts.ts --auto      # auto-bind when slug matches exactly one account; prompt otherwise
 *   tsx src/scripts/bindCouriersToAccounts.ts --dry-run   # print planned updates, write nothing
 *   tsx src/scripts/bindCouriersToAccounts.ts --rebind    # rebind couriers that already have a serviceProviderId
 */
import dotenv from "dotenv";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { couriers, serviceProviders } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

const flags = new Set(process.argv.slice(2));
const AUTO = flags.has("--auto");
const DRY_RUN = flags.has("--dry-run");
const REBIND = flags.has("--rebind");

type Account = { id: string; name: string; slug: string; isActive: boolean };
type Courier = {
  id: string;
  name: string;
  serviceProvider: string;
  metaData: Record<string, unknown> | null;
};

async function main() {
  await connectDB();

  const accountRows = (await db
    .select({
      id: serviceProviders.id,
      name: serviceProviders.name,
      slug: serviceProviders.slug,
      isActive: serviceProviders.isActive,
    })
    .from(serviceProviders)) as Account[];

  const courierRows = (await db
    .select({
      id: couriers.id,
      name: couriers.name,
      serviceProvider: couriers.serviceProvider,
      metaData: couriers.metaData,
    })
    .from(couriers)) as Courier[];

  const activeAccounts = accountRows.filter((a) => a.isActive);
  const accountsBySlug = new Map<string, Account[]>();
  for (const a of activeAccounts) {
    const list = accountsBySlug.get(a.slug) ?? [];
    list.push(a);
    accountsBySlug.set(a.slug, list);
  }
  const accountById = new Map(accountRows.map((a) => [a.id, a] as const));

  console.log("\n── Service-provider accounts (active) ──");
  for (const [slug, list] of accountsBySlug) {
    console.log(`  slug=${slug}:`);
    for (const a of list) console.log(`    • ${a.name}  (${a.id})`);
  }

  console.log(`\n── Couriers (${courierRows.length}) ──`);

  const updates: { courier: Courier; accountId: string }[] = [];
  const rl = readline.createInterface({ input: stdin, output: stdout });

  for (const c of courierRows) {
    const existing =
      c.metaData && typeof (c.metaData as Record<string, unknown>).serviceProviderId === "string"
        ? ((c.metaData as Record<string, unknown>).serviceProviderId as string)
        : null;

    if (existing && !REBIND) {
      const acc = accountById.get(existing);
      console.log(
        `  ✓ ${c.name} (slug=${c.serviceProvider}) — already bound to ${acc?.name ?? existing} — skipping`,
      );
      continue;
    }

    const matches = accountsBySlug.get(c.serviceProvider) ?? [];
    const candidates = matches.length > 0 ? matches : activeAccounts;

    if (candidates.length === 0) {
      console.log(`  ✗ ${c.name} (slug=${c.serviceProvider}) — no active accounts at all; cannot bind`);
      continue;
    }

    if (AUTO && matches.length === 1) {
      const pick = matches[0];
      console.log(`  → ${c.name} (slug=${c.serviceProvider}) — auto-bind to ${pick.name}`);
      updates.push({ courier: c, accountId: pick.id });
      continue;
    }

    console.log(`\n  ${c.name} (slug=${c.serviceProvider})${existing ? ` — currently ${accountById.get(existing)?.name ?? existing}` : ""}`);
    candidates.forEach((a, i) => {
      const sameSlug = a.slug === c.serviceProvider ? "" : `  [slug=${a.slug}]`;
      console.log(`    [${i + 1}] ${a.name}${sameSlug}`);
    });
    console.log(`    [s] skip`);

    let pickIndex: number | null = null;
    while (pickIndex === null) {
      const answer = (await rl.question("    choice: ")).trim().toLowerCase();
      if (answer === "s" || answer === "") {
        pickIndex = -1;
        break;
      }
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= candidates.length) {
        pickIndex = n - 1;
      } else {
        console.log(`    invalid — enter 1-${candidates.length} or s`);
      }
    }
    if (pickIndex === -1) continue;
    updates.push({ courier: c, accountId: candidates[pickIndex].id });
  }

  rl.close();

  if (updates.length === 0) {
    console.log("\nNo updates to apply.");
    await disconnectDB();
    return;
  }

  console.log("\n── Planned updates ──");
  for (const u of updates) {
    console.log(`  ${u.courier.name}  →  ${accountById.get(u.accountId)?.name}  (${u.accountId})`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no changes written");
    await disconnectDB();
    return;
  }

  for (const u of updates) {
    const meta = { ...(u.courier.metaData ?? {}), serviceProviderId: u.accountId };
    await db.update(couriers).set({ metaData: meta }).where(eq(couriers.id, u.courier.id));
  }

  logger.info(`Updated ${updates.length} courier(s)`);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
