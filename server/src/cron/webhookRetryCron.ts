import { registerCron } from "./index.js";
import { deliverDueWebhooks } from "../services/webhook.js";
import logger from "../config/logger.js";

const TAG = "[WebhookRetryCron]";

/** Deliveries claimed per tick. Bounded so one backlog can't monopolise the pool. */
const BATCH_SIZE = 100;

/**
 * Re-sends webhook deliveries whose backoff has elapsed.
 *
 * The first attempt happens inline at dispatch time; every retry after that is
 * driven from here, which is what lets a backoff of hours survive a deploy.
 */
registerCron({
  name: "webhook-retry",
  schedule: "* * * * *", // every minute
  handler: async () => {
    const result = await deliverDueWebhooks(BATCH_SIZE);
    if (result.claimed > 0) {
      logger.info(
        `${TAG} claimed=${result.claimed} delivered=${result.delivered} still-failing=${result.failed}`,
      );
    }
  },
});
