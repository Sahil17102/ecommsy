import type { Request, Response } from "express";
import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
} from "../services/plan.js";

export async function handleListPlans(req: Request, res: Response) {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const isActive =
    req.query.isActive === "true"
      ? true
      : req.query.isActive === "false"
        ? false
        : undefined;

  const result = await listPlans({ page, limit, isActive });
  res.json(result);
}

export async function handleCreatePlan(req: Request, res: Response) {
  const plan = await createPlan(req.body);
  res.status(201).json({ message: "Plan created", plan });
}

export async function handleUpdatePlan(req: Request, res: Response) {
  const plan = await updatePlan(req.params.id, req.body);
  res.json({ message: "Plan updated", plan });
}

export async function handleDeletePlan(req: Request, res: Response) {
  await deletePlan(req.params.id);
  res.json({ message: "Plan deleted" });
}

export async function handleTogglePlanActive(req: Request, res: Response) {
  const plan = await togglePlanActive(req.params.id);
  res.json({
    message: `Plan ${plan.isActive ? "activated" : "deactivated"}`,
    plan,
  });
}
