import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdminAuth } from "../middleware/auth.js";
import { MAX_UPLOAD_SIZE } from "../config/constants.js";
import {
  handleSellerListTickets,
  handleSellerCreateTicket,
  handleSellerGetTicket,
  handleSellerReply,
  handleSellerGetAttachment,
  handleAdminListTickets,
  handleAdminGetTicket,
  handleAdminReply,
  handleAdminUpdateStatus,
  handleAdminGetAttachment,
} from "../controllers/supportTicket.controller.js";

const ATTACHMENT_ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 5 },
  fileFilter: (_req, file, cb) => {
    if ((ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, WebP, GIF) and PDF files are allowed"));
    }
  },
});

export const sellerSupportRouter = Router();
sellerSupportRouter.use(requireAuth);
sellerSupportRouter.get("/", handleSellerListTickets);
sellerSupportRouter.post("/", upload.array("attachments", 5), handleSellerCreateTicket);
sellerSupportRouter.get("/:id", handleSellerGetTicket);
sellerSupportRouter.post("/:id/reply", upload.array("attachments", 5), handleSellerReply);
sellerSupportRouter.get("/:id/attachments/:attachmentId", handleSellerGetAttachment);

export const adminSupportRouter = Router();
adminSupportRouter.use(requireAdminAuth);
adminSupportRouter.get("/", handleAdminListTickets);
adminSupportRouter.get("/:id", handleAdminGetTicket);
adminSupportRouter.post("/:id/reply", upload.array("attachments", 5), handleAdminReply);
adminSupportRouter.patch("/:id", handleAdminUpdateStatus);
adminSupportRouter.get("/:id/attachments/:attachmentId", handleAdminGetAttachment);
