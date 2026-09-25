import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

type AsyncController = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(fn: AsyncController) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      logger.error(`${req.method} ${req.path} failed`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
