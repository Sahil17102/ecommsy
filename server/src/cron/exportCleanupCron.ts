import { registerCron } from "./index.js";
import { failStalledExports, kickExportWorker, purgeExpiredExports } from "../services/exports/index.js";

/**
 * Safety net: the queue is normally drained the moment a job is inserted, but a
 * lost wake-up (or a job inserted by a different process) must never leave an
 * export sitting untouched.
 */
registerCron({
  name: "export-queue-sweeper",
  schedule: "* * * * *", // every minute
  handler: async () => {
    kickExportWorker();
  },
});

registerCron({
  name: "export-cleanup",
  schedule: "30 3 * * *", // daily at 3:30 AM IST
  handler: async () => {
    await purgeExpiredExports();
  },
});

registerCron({
  name: "export-watchdog",
  schedule: "*/15 * * * *", // every 15 minutes
  handler: async () => {
    await failStalledExports();
  },
});
