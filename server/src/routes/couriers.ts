import { Router } from "express";
import {
  handleListSellerCouriers,
  handleCreateCourier,
  handleUpdateCourier,
  handleDeleteCourier,
  handleListCouriers,
  handleToggleCourier,
} from "../controllers/courier.controller.js";
import { requireAuth, requireSuperadminAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  courierIdValidation,
  createCourierValidation,
  updateCourierValidation,
  listCouriersValidation,
} from "../validators/courier.validator.js";

/** Seller-facing catalogue — mounted at /couriers. */
export const sellerCouriersRouter = Router();
sellerCouriersRouter.get("/", requireAuth, asyncHandler(handleListSellerCouriers));

/** Admin CRUD — mounted at /admin/couriers. */
const router = Router();

router.use(requireSuperadminAuth);

router.get("/", listCouriersValidation, validate, asyncHandler(handleListCouriers));
router.post("/", createCourierValidation, validate, asyncHandler(handleCreateCourier));
router.patch("/:id", updateCourierValidation, validate, asyncHandler(handleUpdateCourier));
router.delete("/:id", courierIdValidation, validate, asyncHandler(handleDeleteCourier));
router.patch("/:id/toggle", courierIdValidation, validate, asyncHandler(handleToggleCourier));

export default router;
