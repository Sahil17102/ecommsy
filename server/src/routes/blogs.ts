import { Router } from "express";
import multer from "multer";
import { requireSuperadminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { MAX_UPLOAD_SIZE } from "../config/constants.js";
import {
  handlePublicListBlogs,
  handlePublicGetBlog,
  handleServeBlogCover,
  handleServeInlineImage,
  handleAdminListBlogs,
  handleAdminGetBlog,
  handleCreateBlog,
  handleUpdateBlog,
  handleDeleteBlog,
  handleUploadCover,
  handleUploadInlineImage,
} from "../controllers/blog.controller.js";

// Cover-image uploads accept image MIMEs only (no PDFs).
const BLOG_COVER_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (BLOG_COVER_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image (JPEG, PNG, WebP) files are allowed for blog covers"));
    }
  },
});

// ── Public router (no auth) ─────────────────────────────────────
export const publicBlogsRouter = Router();
publicBlogsRouter.get("/", asyncHandler(handlePublicListBlogs));
publicBlogsRouter.get("/cover/:filename", asyncHandler(handleServeBlogCover));
// Inline image route must be defined BEFORE /:slug so the slug pattern
// doesn't swallow `/<slug>/inline/<filename>`.
publicBlogsRouter.get("/:slug/inline/:filename", asyncHandler(handleServeInlineImage));
publicBlogsRouter.get("/:slug", asyncHandler(handlePublicGetBlog));

// ── Admin router (admin auth required) ──────────────────────────
export const adminBlogsRouter = Router();
adminBlogsRouter.use(requireSuperadminAuth);
adminBlogsRouter.get("/", asyncHandler(handleAdminListBlogs));
adminBlogsRouter.get("/:id", asyncHandler(handleAdminGetBlog));
adminBlogsRouter.post("/", asyncHandler(handleCreateBlog));
adminBlogsRouter.put("/:id", asyncHandler(handleUpdateBlog));
adminBlogsRouter.delete("/:id", asyncHandler(handleDeleteBlog));
adminBlogsRouter.post("/:id/cover", upload.single("cover"), asyncHandler(handleUploadCover));
adminBlogsRouter.post(
  "/:id/inline-image",
  upload.single("image"),
  asyncHandler(handleUploadInlineImage),
);
