import "./boot.js";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import logger from "./config/logger.js";
import routes from "./routes/index.js";
import externalOrdersRouter from "./routes/externalOrders.js";
import docsRouter from "./routes/docs.js";
import { seedAdminUser } from "./seeds/adminUser.js";
import { seedPlans } from "./services/plan.js";
import { startAllCrons } from "./cron/index.js";
import { initRealtime } from "./services/realtime.js";
import "./cron/invoiceCron.js";
import "./cron/trackingCron.js";
import "./cron/exportCleanupCron.js";
import "./cron/webhookRetryCron.js";
import { recoverInterruptedExports } from "./services/exports/index.js";

dotenv.config({ override: true });

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3001;

const morganStream = { write: (msg: string) => logger.http(msg.trimEnd()) };

app.use(helmet());
app.use(morgan(":method :url :status :res[content-length] – :response-time ms", { stream: morganStream }));

// Public API docs. Mounted ahead of the CORS guard below so any origin — a
// Postman import, a codegen tool, a partner's browser — can read the spec.
app.use("/docs", docsRouter);
app.use("/api/docs", docsRouter);

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  "https://searchcraftdigital.com",
  "https://www.searchcraftdigital.com",
  "https://ecommsy-83qx.onrender.com",
  "https://ecommsy-admin.onrender.com",
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
}));

app.use(express.json({
  limit: "5mb",
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
  },
}));
app.use(cookieParser());

app.use("/api", routes);
// Compatibility mount for partner integrations that use the documented host
// without the global /api prefix. The router retains the same auth and validation.
app.use("/external", externalOrdersRouter);

async function start() {
  await connectDB();
  await seedAdminUser();
  await seedPlans();
  startAllCrons();
  // Exports interrupted by a restart go back in the queue rather than sitting
  // in "processing" forever.
  await recoverInterruptedExports();
  const httpServer = createServer(app);
  initRealtime(httpServer);
  httpServer.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  process.stderr.write(`[boot] Failed to start server: ${err?.stack ?? err}\n`);
  logger.error("Failed to start server", err);
  setTimeout(() => process.exit(1), 100);
});
