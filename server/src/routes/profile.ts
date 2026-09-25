import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  handleGetProfile,
  handleUpdateProfile,
} from "../controllers/profile.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", handleGetProfile);
router.put("/", handleUpdateProfile);

export default router;
