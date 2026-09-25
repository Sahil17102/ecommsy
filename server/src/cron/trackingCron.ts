import { registerCron } from "./index.js";
import { pollTrackingUpdates } from "../services/trackingPoller.js";
import logger from "../config/logger.js";

const TAG = "[TrackingCron]";

registerCron({
  name: "tracking-poller",
  schedule: "0 */3 * * *", // every 3 hours
  handler: async () => {
    const result = await pollTrackingUpdates();
    logger.info(
      `${TAG} polled=${result.polled} updated=${result.updated} errors=${result.errors}`,
    );
  },
});
