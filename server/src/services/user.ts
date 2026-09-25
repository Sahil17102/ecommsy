import { and, count, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  users,
  kycDocuments,
  orders,
  codRemittances,
  wallets,
  walletTransactions,
  plans,
} from "../db/schema.js";
import type { IUser } from "../models/User.js";
import { UserRole, TeamRole } from "../models/User.js";
import type { Pagination } from "../types/index.js";
import { AppError } from "../utils/AppError.js";

export class UserError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "UserError";
  }
}

// Order statuses (previously lived in models/Order.ts). Inlined here so this
// file no longer depends on the deprecated Mongoose model.
const ORDER_STATUSES = [
  "created",
  "processing",
  "booked",
  "pickup_initiated",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "ndr",
  "rto_initiated",
  "rto_in_transit",
  "rto_delivered",
  "cancelled",
  "lost",
] as const;

// KYC statuses — schema enum is { not_submitted | pending | approved | rejected }
// but UI/code historically expects "not_started" / "verified". We map at the boundary.
const KYC_VERIFIED_STATUS = "approved" as const;

export interface UserListItem {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  pincode: string | null;
  sellsOn: string[];
  monthlyShipmentVolume: string | null;
  lastLogin: Date | null;
  isActive: boolean;
  onboardingComplete: boolean;
  isVerified: boolean;
  kycStatus: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(doc: IUser & { kycStatus?: string | null }): UserListItem {
  return {
    id: doc.id,
    name: doc.name ?? null,
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    email: doc.email ?? null,
    phone: doc.phone ?? null,
    businessName: doc.businessName ?? null,
    pincode: doc.pincode ?? null,
    sellsOn: doc.sellsOn ?? [],
    monthlyShipmentVolume: doc.monthlyShipmentVolume ?? null,
    lastLogin: doc.lastLogin ?? null,
    isActive: doc.isActive ?? true,
    onboardingComplete: doc.onboardingComplete,
    isVerified: doc.isVerified,
    kycStatus: doc.kycStatus ?? "not_started",
    plan: doc.plan ?? "basic",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ListUsersResult {
  users: UserListItem[];
  pagination: Pagination;
  stats: {
    total: number;
    verified: number;
    onboarded: number;
    active: number;
    kycPending: number;
    kycVerified: number;
    inactive: number;
    notOnboarded: number;
    kycNotStarted: number;
  };
}

const SORTABLE_FIELDS = new Set(["createdAt", "lastLogin"]);

export async function listUsers(opts?: {
  search?: string;
  onboardingComplete?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  plan?: string;
  kycStatus?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ListUsersResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortField = opts?.sortField && SORTABLE_FIELDS.has(opts.sortField) ? opts.sortField : "createdAt";
  const sortDir = opts?.sortOrder === "asc" ? "asc" : "desc";

  // Only show top-level sellers — team members are visible on the owner's
  // detail page. teamRole is NULL until the seller invites a team member,
  // so NULL counts as an owner here.
  const conditions: Array<ReturnType<typeof eq>> = [
    eq(users.role, UserRole.USER),
    or(isNull(users.teamRole), eq(users.teamRole, TeamRole.OWNER)) as unknown as ReturnType<typeof eq>,
  ];

  if (opts?.search) {
    const like = `%${opts.search}%`;
    const searchClause = or(
      sql`${users.name} ILIKE ${like}`,
      sql`${users.firstName} ILIKE ${like}`,
      sql`${users.lastName} ILIKE ${like}`,
      sql`${users.email} ILIKE ${like}`,
      sql`${users.phone} ILIKE ${like}`,
      sql`${users.businessName} ILIKE ${like}`,
    );
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }

  if (opts?.onboardingComplete !== undefined) {
    conditions.push(eq(users.onboardingComplete, opts.onboardingComplete));
  }
  if (opts?.isVerified !== undefined) {
    conditions.push(eq(users.isVerified, opts.isVerified));
  }
  if (opts?.isActive !== undefined) {
    conditions.push(eq(users.isActive, opts.isActive));
  }
  if (opts?.plan) {
    conditions.push(eq(users.plan, opts.plan));
  }

  // Build kyc-status filter: kycStatus column from joined kyc_documents,
  // coalesced to "not_started" when no record exists.
  const kycStatusExpr = sql<string>`COALESCE(${kycDocuments.status}::text, 'not_started')`;

  const whereClause = and(...conditions);

  // Optionally further restrict on kycStatus (comma-separated)
  const kycFilterValues = opts?.kycStatus ? opts.kycStatus.split(",") : null;
  const havingClause = kycFilterValues
    ? (kycFilterValues.length === 1
        ? sql`${kycStatusExpr} = ${kycFilterValues[0]}`
        : sql`${kycStatusExpr} IN ${kycFilterValues}`)
    : undefined;

  // For lastLogin sorting, push nulls to the end
  const orderByExpr =
    sortField === "lastLogin"
      ? sortDir === "asc"
        ? sql`${users.lastLogin} ASC NULLS LAST, ${users.id} ASC`
        : sql`${users.lastLogin} DESC NULLS LAST, ${users.id} DESC`
      : sortDir === "asc"
        ? sql`${users.createdAt} ASC`
        : sql`${users.createdAt} DESC`;

  const listQuery = db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      passwordHash: users.passwordHash,
      role: users.role,
      parentUserId: users.parentUserId,
      teamRole: users.teamRole,
      pincode: users.pincode,
      city: users.city,
      state: users.state,
      businessName: users.businessName,
      website: users.website,
      supportEmail: users.supportEmail,
      contactNumber: users.contactNumber,
      address: users.address,
      sellsOn: users.sellsOn,
      monthlyShipmentVolume: users.monthlyShipmentVolume,
      integrationsOfInterest: users.integrationsOfInterest,
      lastLogin: users.lastLogin,
      isActive: users.isActive,
      onboardingComplete: users.onboardingComplete,
      isVerified: users.isVerified,
      plan: users.plan,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      kycStatus: kycStatusExpr,
    })
    .from(users)
    .leftJoin(kycDocuments, eq(kycDocuments.userId, users.id))
    .where(havingClause ? and(whereClause, havingClause) : whereClause)
    .orderBy(orderByExpr)
    .offset(skip)
    .limit(limit);

  const countQuery = db
    .select({ value: count() })
    .from(users)
    .leftJoin(kycDocuments, eq(kycDocuments.userId, users.id))
    .where(havingClause ? and(whereClause, havingClause) : whereClause);

  // Match the list query's owner definition: teamRole is NULL until the seller
  // invites a team member, so NULL counts as an owner.
  const ownerCond = and(
    eq(users.role, UserRole.USER),
    or(isNull(users.teamRole), eq(users.teamRole, TeamRole.OWNER)),
  );

  const [
    docs,
    totalRow,
    totalUsersRow,
    verifiedRow,
    onboardedRow,
    activeRow,
    kycPendingRow,
    kycVerifiedRow,
    inactiveRow,
    notOnboardedRow,
    kycNotStartedRow,
  ] = await Promise.all([
    listQuery,
    countQuery.then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).where(ownerCond).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).where(and(ownerCond, eq(users.isVerified, true))).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).where(and(ownerCond, eq(users.onboardingComplete, true))).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).where(and(ownerCond, ne(users.isActive, false))).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(kycDocuments).where(eq(kycDocuments.status, "pending")).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(kycDocuments).where(eq(kycDocuments.status, KYC_VERIFIED_STATUS)).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).where(and(ownerCond, eq(users.isActive, false))).then((r) => r[0]?.value ?? 0),
    // Users who haven't completed onboarding AND have no KYC submission
    db
      .select({ value: count() })
      .from(users)
      .leftJoin(kycDocuments, eq(kycDocuments.userId, users.id))
      .where(and(ownerCond, eq(users.onboardingComplete, false), isNull(kycDocuments.id)))
      .then((r) => r[0]?.value ?? 0),
    // Users whose KYC status is "not_started" — either no kyc_document or status null
    db
      .select({ value: count() })
      .from(users)
      .leftJoin(kycDocuments, eq(kycDocuments.userId, users.id))
      .where(and(ownerCond, isNull(kycDocuments.id)))
      .then((r) => r[0]?.value ?? 0),
  ]);

  return {
    users: docs.map((d) => toListItem(d as unknown as IUser & { kycStatus: string })),
    pagination: {
      page,
      limit,
      total: totalRow,
      totalPages: Math.ceil(totalRow / limit),
    },
    stats: {
      total: totalUsersRow,
      verified: verifiedRow,
      onboarded: onboardedRow,
      active: activeRow,
      kycPending: kycPendingRow,
      kycVerified: kycVerifiedRow,
      inactive: inactiveRow,
      notOnboarded: notOnboardedRow,
      kycNotStarted: kycNotStartedRow,
    },
  };
}

export async function getUserById(id: string): Promise<UserListItem> {
  const doc = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!doc) throw new UserError(404, "User not found");

  const kyc = await db.query.kycDocuments.findFirst({
    where: eq(kycDocuments.userId, doc.id),
    columns: { status: true },
  });

  return toListItem({ ...doc, kycStatus: kyc?.status ?? "not_started" });
}

export async function toggleUserActive(id: string): Promise<IUser> {
  const doc = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!doc) throw new UserError(404, "User not found");

  const [updated] = await db
    .update(users)
    .set({ isActive: !(doc.isActive ?? true), updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function updateUserPlan(
  userId: string,
  planSlug: string,
): Promise<IUser> {
  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.slug, planSlug), eq(plans.isActive, true)),
  });
  if (!plan) throw new UserError(400, `Plan "${planSlug}" not found or inactive`);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new UserError(404, "User not found");

  const [updated] = await db
    .update(users)
    .set({ plan: plan.slug, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export interface UserSummary {
  orders: {
    total: number;
    byStatus: Record<string, number>;
    byType: { B2B: number; B2C: number };
    byPayment: { prepaid: number; cod: number };
  };
  revenue: {
    total: number;
    freight: number;
    cod: number;
  };
  remittance: {
    totalCodCollected: number;
    totalRemitted: number;
    pendingRemittance: number;
    pendingCount: number;
    creditedCount: number;
  };
  wallet: {
    balance: number;
    totalCredits: number;
    totalDebits: number;
  };
  topProviders: { provider: string; count: number; revenue: number }[];
}

export async function getUserSummary(userId: string): Promise<UserSummary> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new UserError(404, "User not found");

  // Helper expression for extracting numeric fields from rate_snapshot jsonb.
  const rateTotalExpr = sql<number>`COALESCE((${orders.rateSnapshot} ->> 'totalCharge')::numeric, 0)`;
  const rateFreightExpr = sql<number>`COALESCE((${orders.rateSnapshot} ->> 'freightCharge')::numeric, 0)`;
  const rateCodExpr = sql<number>`COALESCE((${orders.rateSnapshot} ->> 'codCharges')::numeric, 0)`;

  // Order counts by status + revenue
  const statusCountsPromise = db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.status);

  const revenuePromise = db
    .select({
      total: sql<number>`COALESCE(SUM(${rateTotalExpr}), 0)`,
      freight: sql<number>`COALESCE(SUM(${rateFreightExpr}), 0)`,
      cod: sql<number>`COALESCE(SUM(${rateCodExpr}), 0)`,
      count: count(),
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  const typeCountsPromise = db
    .select({ orderType: orders.orderType, count: count() })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.orderType);

  // schema field is paymentMode (was paymentType in legacy Mongoose)
  const paymentCountsPromise = db
    .select({ paymentMode: orders.paymentMode, count: count() })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.paymentMode);

  const providerCountsPromise = db
    .select({
      provider: orders.serviceProvider,
      count: count(),
      revenue: sql<number>`COALESCE(SUM(${rateTotalExpr}), 0)`,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.serviceProvider)
    .orderBy(desc(count()))
    .limit(5);

  // COD remittance — schema enum uses "remitted" for what legacy called "credited"
  const remittancePromise = db
    .select({
      totalCodCollected: sql<number>`COALESCE(SUM(${codRemittances.codAmount}), 0)`,
      totalRemitted: sql<number>`COALESCE(SUM(CASE WHEN ${codRemittances.status} = 'remitted' THEN ${codRemittances.remittableAmount} ELSE 0 END), 0)`,
      pendingRemittance: sql<number>`COALESCE(SUM(CASE WHEN ${codRemittances.status} = 'pending' THEN ${codRemittances.remittableAmount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${codRemittances.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      creditedCount: sql<number>`COALESCE(SUM(CASE WHEN ${codRemittances.status} = 'remitted' THEN 1 ELSE 0 END), 0)`,
    })
    .from(codRemittances)
    .where(eq(codRemittances.userId, userId));

  const walletPromise = db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });

  const [
    statusRows,
    revenueRows,
    typeRows,
    paymentRows,
    providerRows,
    remittanceRows,
    walletRow,
  ] = await Promise.all([
    statusCountsPromise,
    revenuePromise,
    typeCountsPromise,
    paymentCountsPromise,
    providerCountsPromise,
    remittancePromise,
    walletPromise,
  ]);

  let walletTxStats = { totalCredits: 0, totalDebits: 0 };
  if (walletRow) {
    const txRows = await db
      .select({
        type: walletTransactions.type,
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)`,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletRow.id))
      .groupBy(walletTransactions.type);

    const credits = Number(txRows.find((t) => t.type === "credit")?.total ?? 0);
    const debits = Number(txRows.find((t) => t.type === "debit")?.total ?? 0);
    walletTxStats = { totalCredits: credits, totalDebits: debits };
  }

  const byStatus: Record<string, number> = {};
  for (const s of ORDER_STATUSES) byStatus[s] = 0;
  for (const r of statusRows) {
    if (r.status) byStatus[r.status] = Number(r.count);
  }

  const byType: Record<string, number> = {};
  for (const t of typeRows) {
    if (t.orderType) byType[t.orderType] = Number(t.count);
  }

  const byPayment: Record<string, number> = {};
  for (const p of paymentRows) {
    if (p.paymentMode) byPayment[p.paymentMode] = Number(p.count);
  }

  const revenue = revenueRows[0];

  return {
    orders: {
      total: Number(revenue?.count ?? 0),
      byStatus,
      byType: { B2B: byType.B2B ?? byType.b2b ?? 0, B2C: byType.B2C ?? byType.b2c ?? 0 },
      byPayment: { prepaid: byPayment.prepaid ?? 0, cod: byPayment.cod ?? 0 },
    },
    revenue: {
      total: Number(revenue?.total ?? 0),
      freight: Number(revenue?.freight ?? 0),
      cod: Number(revenue?.cod ?? 0),
    },
    remittance: {
      totalCodCollected: Number(remittanceRows[0]?.totalCodCollected ?? 0),
      totalRemitted: Number(remittanceRows[0]?.totalRemitted ?? 0),
      pendingRemittance: Number(remittanceRows[0]?.pendingRemittance ?? 0),
      pendingCount: Number(remittanceRows[0]?.pendingCount ?? 0),
      creditedCount: Number(remittanceRows[0]?.creditedCount ?? 0),
    },
    wallet: {
      balance: walletRow ? Number(walletRow.balance) : 0,
      totalCredits: walletTxStats.totalCredits,
      totalDebits: walletTxStats.totalDebits,
    },
    topProviders: providerRows.map((p) => ({
      provider: p.provider ?? "",
      count: Number(p.count),
      revenue: Number(p.revenue),
    })),
  };
}
