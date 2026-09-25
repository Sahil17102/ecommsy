import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { users, wallets } from "../db/schema.js";
import logger from "../config/logger.js";

dotenv.config();

async function seed() {
  await connectDB();
  logger.info("Connected to Postgres for wallet seeding");

  // Get all user IDs
  const userRows = await db.select({ id: users.id }).from(users);
  logger.info(`Found ${userRows.length} users`);

  let created = 0;
  let skipped = 0;

  for (const user of userRows) {
    const existing = await db.query.wallets.findFirst({ where: eq(wallets.userId, user.id) });
    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(wallets).values({ userId: user.id, balance: "0", currency: "INR" });
    created++;
  }

  logger.info(
    `Wallet seeding complete: ${created} created, ${skipped} already existed (${userRows.length} total users)`,
  );

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  logger.error("Wallet seeding failed:", err);
  process.exit(1);
});
