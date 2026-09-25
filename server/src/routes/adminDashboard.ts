import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleAdminDashboard } from "../controllers/adminDashboard.controller.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", asyncHandler(handleAdminDashboard));

export default router;
