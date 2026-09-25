import { registerCron } from "./index.js";
import { autoGenerateInvoices } from "../services/billingInvoice.js";
import logger from "../config/logger.js";

const TAG = "[InvoiceCron]";

registerCron({
  name: "invoice-generation",
  schedule: "0 2 * * *", // daily at 2:00 AM IST
  handler: async () => {
    const result = await autoGenerateInvoices();
    logger.info(
      `${TAG} generated=${result.generated} skipped=${result.skipped} errors=${result.errors.length}`,
    );
  },
});
