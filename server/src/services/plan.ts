import { and, asc, eq, ne, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { plans, users } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";
import type { Pagination } from "../types/index.js";

export class PlanError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "PlanError";
  }
}

const DEFAULT_PLANS = [
  { name: "Basic", slug: "basic", description: "Default plan for all users", sortOrder: 0, isDefault: true },
  { name: "Gold", slug: "gold", description: "Gold tier pricing", sortOrder: 1, isDefault: false },
  { name: "Platinum", slug: "platinum", description: "Platinum tier pricing", sortOrder: 2, isDefault: false },
  { name: "Diamond", slug: "diamond", description: "Diamond tier pricing", sortOrder: 3, isDefault: false },
];

export async function seedPlans(): Promise<void> {
  for (const p of DEFAULT_PLANS) {
    await db.insert(plans)
      .values(p)
      .onConflictDoNothing({ target: plans.slug });
  }
}

export async function listPlans(opts?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;

  const where = opts?.isActive !== undefined ? eq(plans.isActive, opts.isActive) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(plans).where(where ?? undefined);
  const total = totalRow?.value ?? 0;

  const rows = await db.query.plans.findMany({
    where,
    orderBy: [asc(plans.sortOrder)],
    limit,
    offset,
  });

  return {
    plans: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    } as Pagination,
  };
}

export async function getPlanBySlug(slug: string) {
  const plan = await db.query.plans.findFirst({ where: eq(plans.slug, slug) });
  if (!plan) throw new PlanError(404, "Plan not found");
  return plan;
}

export async function createPlan(data: {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}) {
  try {
    const [plan] = await db.insert(plans).values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? "",
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return plan;
  } catch (err: unknown) {
    // Postgres unique-violation code
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      throw new PlanError(409, "A plan with this slug already exists");
    }
    throw err;
  }
}

export async function updatePlan(
  id: string,
  data: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
  },
) {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, id) });
  if (!plan) throw new PlanError(404, "Plan not found");

  const patch: Partial<typeof plans.$inferInsert> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;

  // Run isDefault-flip + update inside a single transaction so we don't end
  // up with zero or two defaults if either statement fails mid-flight.
  return db.transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.update(plans).set({ isDefault: false }).where(ne(plans.id, plan.id));
      patch.isDefault = true;
    }
    const [updated] = await tx.update(plans).set(patch).where(eq(plans.id, plan.id)).returning();
    return updated;
  });
}

export async function deletePlan(id: string): Promise<void> {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, id) });
  if (!plan) throw new PlanError(404, "Plan not found");

  if (plan.isDefault) {
    throw new PlanError(400, "Cannot delete the default plan");
  }

  const [usageRow] = await db.select({ value: count() }).from(users).where(eq(users.plan, plan.slug));
  const usersOnPlan = usageRow?.value ?? 0;
  if (usersOnPlan > 0) {
    throw new PlanError(
      400,
      `Cannot delete plan — ${usersOnPlan} user(s) are currently on this plan`,
    );
  }

  await db.delete(plans).where(eq(plans.id, id));
}

export async function togglePlanActive(id: string) {
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, id) });
  if (!plan) throw new PlanError(404, "Plan not found");

  if (plan.isDefault && plan.isActive) {
    throw new PlanError(400, "Cannot deactivate the default plan");
  }

  const [updated] = await db.update(plans)
    .set({ isActive: !plan.isActive, updatedAt: new Date() })
    .where(eq(plans.id, id))
    .returning();
  return updated;
}
