import dotenv from "dotenv";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { b2cZones } from "../db/schema.js";
import logger from "../config/logger.js";
import { pathToFileURL } from "node:url";

dotenv.config();

const zones = [
  { name: "Within City", code: "WITHIN_CITY", description: "Origin and destination are in the same city" },
  { name: "Within State", code: "WITHIN_STATE", description: "Origin and destination are in the same state" },
  { name: "Within Region", code: "WITHIN_REGION", description: "Origin and destination are in the same region (North/South/East/West)" },
  { name: "Metro to Metro", code: "METRO_TO_METRO", description: "Shipment between two different metro cities" },
  { name: "ROI", code: "ROI", description: "Rest of India — default zone when no other zone matches" },
  { name: "Special Zone", code: "SPECIAL_ZONE", description: "Origin or destination is in a special zone (e.g. remote/restricted areas)" },
];

export async function seedB2cZones(options: { connect?: boolean; disconnect?: boolean } = {}) {
  const shouldConnect = options.connect ?? true;
  const shouldDisconnect = options.disconnect ?? true;
  if (shouldConnect) await connectDB();
  logger.info("Connected to Postgres for B2C zone seeding");

  for (const z of zones) {
    const now = new Date();
    await db
      .insert(b2cZones)
      .values({ code: z.code, name: z.name, description: z.description, updatedAt: now })
      .onConflictDoUpdate({
        target: b2cZones.code,
        set: { name: z.name, description: z.description, updatedAt: now },
      });
    logger.info(`Seeded zone: ${z.name} (${z.code})`);
  }

  logger.info(`B2C zone seeding complete — ${zones.length} zones`);
  if (shouldDisconnect) await disconnectDB();
}

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirectRun) {
  seedB2cZones().catch((err) => {
    logger.error("B2C zone seeding failed", err);
    process.exit(1);
  });
}
