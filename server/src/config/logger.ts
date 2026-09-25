import winston from "winston";
import chalk from "chalk";

const isDev = process.env.NODE_ENV !== "production";

// ── Level icons & colors ──

const levelStyles: Record<string, { icon: string; color: (s: string) => string }> = {
  error: { icon: "✖", color: chalk.red },
  warn: { icon: "⚠", color: chalk.yellow },
  info: { icon: "●", color: chalk.cyan },
  http: { icon: "→", color: chalk.magenta },
  debug: { icon: "◌", color: chalk.gray },
};

// ── Service provider colors ──

const providerColors: Record<string, (s: string) => string> = {
  Xpressbees:         chalk.hex("#6C3EC1"),   // purple
  Delhivery:          chalk.hex("#2196F3"),   // blue
  Ekart:              chalk.hex("#F7CA18"),   // yellow-gold
  Shipex:             chalk.hex("#00AEEF"),   // sky blue
  Ecom:               chalk.hex("#FF6F00"),   // orange
  DTDC:               chalk.hex("#00B875"),   // green
  Serviceability:     chalk.hex("#FF79C6"),   // pink
  CourierAvailability: chalk.hex("#50FA7B"),  // bright green
  WebhookProcessor:   chalk.hex("#FF6B6B"),  // coral red
  CourierWebhook:     chalk.hex("#4ECDC4"),   // teal
  ManifestService:    chalk.hex("#45B7D1"),   // sky
  OrderCancellation:  chalk.hex("#F9A825"),   // amber
  NdrService:         chalk.hex("#E91E63"),   // pink
  RtoService:         chalk.hex("#9C27B0"),   // deep purple
  TrackingPoller:     chalk.hex("#00BCD4"),   // cyan
  Wallet:             chalk.hex("#8BC34A"),   // light green
  Webhook:            chalk.hex("#FF5722"),   // deep orange
};

// ── Tag / context detection ──

function styleTags(msg: string, levelColor: (s: string) => string): string {
  return msg.replace(/\[([^\]]+)]/g, (_, name: string) => {
    const color = providerColors[name] ?? levelColor;
    return chalk.gray("[") + chalk.bold(color(name)) + chalk.gray("]");
  });
}

// ── Arrow & keyword highlights ──

function highlightKeywords(msg: string): string {
  return msg
    .replace(/→/g, chalk.dim("→"))
    // Full phrase highlights (order matters — check NOT SERVICEABLE before SERVICEABLE)
    .replace(/Serviceability check FAILED/g, chalk.red.bold("Serviceability check FAILED"))
    .replace(/Serviceability check PASSED/g, chalk.green.bold("Serviceability check PASSED"))
    .replace(/NOT SERVICEABLE/g, chalk.red.bold("NOT SERVICEABLE"))
    .replace(/NOT serviceable/g, chalk.red.bold("NOT serviceable"))
    .replace(/(?<!NOT )SERVICEABLE/g, chalk.green.bold("SERVICEABLE"))
    .replace(/(FAILED)/g, chalk.red.bold("$1"))
    // Serviceability summary: YES / NO
    .replace(/:\s*YES/g, ": " + chalk.green.bold("YES"))
    .replace(/:\s*NO/g, ": " + chalk.red.bold("NO"))
    // Webhook / status flow highlights
    .replace(/status (\w+) → (\w+)/g, `status ${chalk.yellow("$1")} → ${chalk.green("$2")}`)
    .replace(/AWB=(\S+)/g, `AWB=${chalk.bold("$1")}`)
    .replace(/Duplicate/g, chalk.dim("Duplicate"))
    .replace(/stale webhook/g, chalk.red("stale webhook"))
    // Values
    .replace(/₹([\d,.]+)/g, chalk.yellow("₹$1"))
    .replace(/(\d+)ms\b/g, chalk.dim("$1ms"))
    .replace(/(\d+)g\b/g, chalk.dim("$1g"));
}

// ── Dev format ──

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const style = levelStyles[level] ?? levelStyles.info;
    const icon = style.color(style.icon);
    const ts = chalk.dim(timestamp as string);
    const lvl = style.color(level.toUpperCase().padEnd(5));

    let msg = String(message);
    msg = styleTags(msg, style.color);
    msg = highlightKeywords(msg);

    // Metadata
    const metaKeys = Object.keys(meta);
    const metaStr = metaKeys.length
      ? "\n" + chalk.dim("  ╰─ ") + chalk.dim(JSON.stringify(meta, null, 2).replace(/\n/g, "\n     "))
      : "";

    return `  ${icon} ${ts} ${lvl} ${msg}${metaStr}`;
  }),
);

// ── Prod format (structured JSON — unchanged) ──

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// ── Create logger ──

const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: isDev ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
