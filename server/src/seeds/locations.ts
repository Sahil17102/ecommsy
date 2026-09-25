import dotenv from "dotenv";
import axios from "axios";
import { sql } from "drizzle-orm";
import { connectDB, disconnectDB, db } from "../config/db.js";
import { locations } from "../db/schema.js";
import logger from "../config/logger.js";
import { externalUrls } from "../config/externalUrls.js";
import { pathToFileURL } from "node:url";

dotenv.config();

// ── State name normalization (kishorek → modern names) ──
const STATE_NORMALIZE: Record<string, string> = {
  orissa: "Odisha",
  uttaranchal: "Uttarakhand",
  pondicherry: "Puducherry",
  "andaman nicobar": "Andaman and Nicobar Islands",
  lakshdweep: "Lakshadweep",
  "jammu & kashmir": "Jammu and Kashmir",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra & nagar haveli ": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  hazaribagh: "Jharkhand", // district wrongly in state column
};

// ── Zone tag mapping by state ──
const ZONE_MAP: Record<string, string[]> = {
  // North
  "Jammu and Kashmir": ["north"],
  Ladakh: ["north", "special_zone"],
  "Himachal Pradesh": ["north"],
  Punjab: ["north"],
  Chandigarh: ["north"],
  Haryana: ["north"],
  Uttarakhand: ["north"],
  "Uttar Pradesh": ["north"],
  Delhi: ["north", "metro"],
  Rajasthan: ["north"],

  // South
  "Andhra Pradesh": ["south"],
  Telangana: ["south"],
  Karnataka: ["south"],
  Kerala: ["south"],
  "Tamil Nadu": ["south"],
  Puducherry: ["south"],
  Lakshadweep: ["south", "special_zone"],
  "Andaman and Nicobar Islands": ["south", "special_zone"],

  // East
  Bihar: ["east"],
  Jharkhand: ["east"],
  Odisha: ["east"],
  "West Bengal": ["east"],
  Sikkim: ["east"],
  Assam: ["east"],
  Meghalaya: ["east"],
  "Arunachal Pradesh": ["east"],
  Nagaland: ["east"],
  Manipur: ["east"],
  Mizoram: ["east"],
  Tripura: ["east"],

  // West
  Gujarat: ["west"],
  Maharashtra: ["west"],
  Goa: ["west"],
  "Dadra and Nagar Haveli and Daman and Diu": ["west"],
  "Madhya Pradesh": ["west"],
  Chhattisgarh: ["west"],
};

// Metro cities — pincodes in these districts get the "metro" tag
const METRO_DISTRICTS = new Set([
  "MUMBAI",
  "MUMBAI SUBURBAN",
  "NEW DELHI",
  "NORTH DELHI",
  "SOUTH DELHI",
  "EAST DELHI",
  "WEST DELHI",
  "CENTRAL DELHI",
  "NORTH EAST DELHI",
  "NORTH WEST DELHI",
  "SOUTH EAST DELHI",
  "SOUTH WEST DELHI",
  "SHAHDARA",
  "CHENNAI",
  "KOLKATA",
  "BANGALORE",
  "BENGALURU",
  "BENGALURU URBAN",
  "HYDERABAD",
  "PUNE",
  "AHMEDABAD",
]);

// ── CSV Parser (handles quoted fields) ──
function parseQuotedCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeState(raw: string): string {
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase();
  if (STATE_NORMALIZE[key]) return STATE_NORMALIZE[key];
  return titleCase(trimmed);
}

interface PincodeRecord {
  pincode: string;
  city: string;
  state: string;
  tags: string[];
}

// ── Parse dropdev CSV (primary source — modern state names) ──
function parseDropdev(csv: string): Map<string, PincodeRecord> {
  const map = new Map<string, PincodeRecord>();
  const lines = csv.split("\n");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseQuotedCsvLine(line);
    if (fields.length < 9) continue;

    const pincode = fields[4];
    const district = fields[7];
    const stateName = fields[8];

    if (!/^\d{6}$/.test(pincode)) continue;
    if (map.has(pincode)) continue; // first occurrence wins

    const state = titleCase(stateName);
    const tags = [...(ZONE_MAP[state] ?? [])];

    // Add metro tag if district is a metro city
    if (METRO_DISTRICTS.has(district.toUpperCase()) && !tags.includes("metro")) {
      tags.push("metro");
    }

    map.set(pincode, {
      pincode,
      city: titleCase(district),
      state,
      tags,
    });
  }

  return map;
}

// ── Parse kishorek CSV (secondary — more pincodes, needs normalization) ──
function parseKishorek(csv: string): Map<string, PincodeRecord> {
  const map = new Map<string, PincodeRecord>();
  const lines = csv.split("\n");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseQuotedCsvLine(line);
    if (fields.length < 5) continue;

    const pincode = fields[1];
    const city = fields[3] || fields[2]; // prefer City, fallback to District
    const rawState = fields[4];

    if (!/^\d{6}$/.test(pincode)) continue;
    if (map.has(pincode)) continue;

    const state = normalizeState(rawState);
    const tags = [...(ZONE_MAP[state] ?? [])];

    map.set(pincode, {
      pincode,
      city: titleCase(city),
      state,
      tags,
    });
  }

  return map;
}

// ── Main seed function ──
export async function seedLocations(options: { connect?: boolean; disconnect?: boolean } = {}) {
  const shouldConnect = options.connect ?? true;
  const shouldDisconnect = options.disconnect ?? true;
  if (shouldConnect) await connectDB();
  logger.info("Connected to Postgres for location seeding");

  // Check existing count
  const [{ count: existingCount = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(locations);
  if (existingCount > 0) {
    logger.info(
      `Found ${existingCount} existing locations. Skipping seed (truncate first to re-seed).`,
    );
    if (shouldDisconnect) await disconnectDB();
    return;
  }

  // Download both CSVs in parallel
  logger.info("Downloading pincode datasets...");
  const [dropdevRes, kishorekRes] = await Promise.all([
    axios.get<string>(externalUrls.pincode.csvPrimary, { responseType: "text" }),
    axios.get<string>(externalUrls.pincode.csvFallback, { responseType: "text" }),
  ]);

  // Parse both
  logger.info("Parsing dropdev dataset (primary)...");
  const dropdevMap = parseDropdev(dropdevRes.data);
  logger.info(`  → ${dropdevMap.size} unique pincodes`);

  logger.info("Parsing kishorek dataset (secondary)...");
  const kishorekMap = parseKishorek(kishorekRes.data);
  logger.info(`  → ${kishorekMap.size} unique pincodes`);

  // Merge: dropdev is primary, kishorek fills gaps
  const merged = new Map(dropdevMap);
  let added = 0;
  for (const [pincode, record] of kishorekMap) {
    if (!merged.has(pincode)) {
      merged.set(pincode, record);
      added++;
    }
  }
  logger.info(
    `Merged: ${dropdevMap.size} (primary) + ${added} (secondary) = ${merged.size} total pincodes`,
  );

  // Convert to array for bulk insert
  const docs = Array.from(merged.values()).map((r) => ({
    pincode: r.pincode,
    city: r.city,
    state: r.state,
    tags: r.tags,
    isActive: true,
  }));

  // Bulk insert in batches of 5000
  const BATCH_SIZE = 5000;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const rows = await db
      .insert(locations)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: locations.id });
    inserted += rows.length;
    logger.info(
      `  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${rows.length} (total: ${inserted})`,
    );
  }

  logger.info(`Location seeding complete: ${inserted} pincodes inserted`);

  // Verify tag distribution
  const tagCounts = await db.execute<{ tag: string; count: number }>(sql`
    select tag, count(*)::int as count
    from ${locations}, jsonb_array_elements_text(${locations.tags}) as tag
    group by tag
    order by count desc
  `);
  logger.info("Tag distribution:");
  for (const t of tagCounts.rows) {
    logger.info(`  ${t.tag}: ${t.count}`);
  }

  if (shouldDisconnect) await disconnectDB();
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) {
  seedLocations().catch((err) => {
    logger.error("Location seeding failed", err);
    process.exit(1);
  });
}
