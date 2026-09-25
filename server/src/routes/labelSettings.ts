import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  handleGetLabelSettings,
  handleUpdateLabelSettings,
  handleUploadLogo,
  handleServeLogo,
} from "../controllers/labelSettings.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public: the logo is rendered via <img src="..."> tags (label preview, PDFs).
// A browser image request can't carry the in-memory Bearer token, so this route
// must sit BEFORE requireAuth or every logo load 401s and shows as broken.
router.get("/logo/:userId/:filename", handleServeLogo);

router.use(requireAuth);

router.get("/", handleGetLabelSettings);
router.put("/", handleUpdateLabelSettings);
router.post("/logo", upload.single("logo"), handleUploadLogo);

export default router;
