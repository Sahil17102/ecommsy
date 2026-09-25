import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { UserRole } from "../models/User.js";
import { hashPassword } from "../services/auth.js";
import logger from "../config/logger.js";

const ADMIN_EMAIL = "admin@boxandbeyond.in";
const ADMIN_PASSWORD = "Admin1511$";

/**
 * Ensures the bootstrap superadmin exists on every server start.
 * Safe to call multiple times.
 *
 * Migration behavior: an existing seed account with role=admin is upgraded
 * to superadmin (one-time bump as part of the scoping rollout).
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, ADMIN_EMAIL),
    });

    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        await db.update(users)
          .set({ role: UserRole.SUPERADMIN, updatedAt: new Date() })
          .where(eq(users.id, existing.id));
        logger.info(`[Seed] Promoted bootstrap admin → superadmin: ${ADMIN_EMAIL}`);
      } else {
        logger.info("[Seed] Bootstrap superadmin already exists — skipping");
      }
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      role: UserRole.SUPERADMIN,
      firstName: "Searchcraft",
      lastName: "Admin",
      name: "Searchcraft Admin",
      isVerified: true,
      isActive: true,
      onboardingComplete: true,
    });

    logger.info(`[Seed] Bootstrap superadmin created: ${ADMIN_EMAIL}`);
  } catch (err) {
    logger.error("[Seed] Failed to create bootstrap superadmin", err);
  }
}
