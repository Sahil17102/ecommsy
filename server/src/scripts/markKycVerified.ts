import "dotenv/config";
import { eq } from "drizzle-orm";
import { connectDB, db, disconnectDB } from "../config/db.js";
import { kycDocuments, users } from "../db/schema.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  throw new Error("Usage: npm run user:verify-kyc -- <email>");
}

await connectDB();

try {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isVerified: true, updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx
      .insert(kycDocuments)
      .values({ userId: user.id, status: "approved" })
      .onConflictDoUpdate({
        target: kycDocuments.userId,
        set: { status: "approved", updatedAt: new Date() },
      });
  });

  console.log(`KYC marked as verified for ${email}`);
} finally {
  await disconnectDB();
}
