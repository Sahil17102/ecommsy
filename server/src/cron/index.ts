import cron, { type ScheduledTask } from "node-cron";
import logger from "../config/logger.js";

const TAG = "[CronManager]";

interface CronJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  timezone?: string;
}

const registry: CronJob[] = [];
const tasks: ScheduledTask[] = [];

/**
 * Register a cron job. Call this before `startAllCrons()`.
 *
 * @example
 *   registerCron({
 *     name: "invoice-generation",
 *     schedule: "0 2 * * *",
 *     handler: async () => { ... },
 *   });
 */
export function registerCron(job: CronJob): void {
  if (!cron.validate(job.schedule)) {
    logger.error(`${TAG} Invalid cron expression for "${job.name}": ${job.schedule}`);
    return;
  }
  registry.push(job);
}

/** Start all registered cron jobs. Call once after DB is connected. */
export function startAllCrons(): void {
  for (const job of registry) {
    const task = cron.schedule(
      job.schedule,
      async () => {
        const start = Date.now();
        logger.info(`${TAG} [${job.name}] Running...`);
        try {
          await job.handler();
          logger.info(`${TAG} [${job.name}] Completed (${Date.now() - start}ms)`);
        } catch (err) {
          logger.error(`${TAG} [${job.name}] FAILED — ${(err as Error).message} (${Date.now() - start}ms)`);
        }
      },
      { timezone: job.timezone ?? "Asia/Kolkata" },
    );
    tasks.push(task);
    logger.info(`${TAG} Registered "${job.name}" — ${job.schedule}`);
  }

  logger.info(`${TAG} ${tasks.length} cron job(s) started`);
}

/** Stop all running cron jobs (useful for graceful shutdown / tests). */
export function stopAllCrons(): void {
  for (const task of tasks) {
    task.stop();
  }
  tasks.length = 0;
  logger.info(`${TAG} All cron jobs stopped`);
}
