import { Router } from "express";
import multer from "multer";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleCreateProvider,
  handleGetCredentials,
  handleGetProvider,
  handleListProviders,
  handleServeProviderLogo,
  handleUpdateCredentials,
  handleUpdateProvider,
  handleUploadProviderLogo,
} from "../controllers/serviceProvider.controller.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  createProviderValidation,
  getByIdValidation,
  listProvidersValidation,
  updateCredentialsValidation,
  updateProviderValidation,
} from "../validators/serviceProvider.validator.js";

const LOGO_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
  fileFilter: (_req, file, cb) => {
    if (LOGO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, WebP, or SVG images are allowed"));
    }
  },
});

// ── Public router (no auth — browser <img> renders directly) ──────────────
export const publicServiceProvidersRouter = Router();
publicServiceProvidersRouter.get("/logo/:filename", asyncHandler(handleServeProviderLogo));

// ── Admin router (superadmin auth) ────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireSuperadminAuth);

// CRUD
adminRouter.get("/", listProvidersValidation, validate, asyncHandler(handleListProviders));
adminRouter.post("/", createProviderValidation, validate, asyncHandler(handleCreateProvider));
adminRouter.get("/:id", getByIdValidation, validate, asyncHandler(handleGetProvider));
adminRouter.put("/:id", updateProviderValidation, validate, asyncHandler(handleUpdateProvider));

// Credential management
adminRouter.patch("/:id/credentials", updateCredentialsValidation, validate, asyncHandler(handleUpdateCredentials));
adminRouter.get("/:id/credentials", getByIdValidation, validate, asyncHandler(handleGetCredentials));

// Logo upload
adminRouter.post(
  "/:id/logo",
  getByIdValidation,
  validate,
  logoUpload.single("logo"),
  asyncHandler(handleUploadProviderLogo),
);

export default adminRouter;
