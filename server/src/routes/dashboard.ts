import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleSellerDashboard } from "../controllers/dashboard.controller.js";
import { handleSellerHome } from "../controllers/home.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", asyncHandler(handleSellerDashboard));
router.get("/home", asyncHandler(handleSellerHome));

export default router;
