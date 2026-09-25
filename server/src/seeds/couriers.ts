import dotenv from "dotenv";
import logger from "../config/logger.js";
import { importDreamzCouriers } from "./importDreamzCouriers.js";

dotenv.config();

importDreamzCouriers().catch((err) => {
  logger.error("Courier seeding failed", err);
  process.exit(1);
});
