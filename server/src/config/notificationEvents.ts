/**
 * Notification event registry — single source of truth.
 *
 * Each event defines its templates (email / in-app / whatsapp), categories,
 * default per-channel enablement, and which channels are supported.
 *
 * To add a new notification: add a new entry here. No other code changes needed.
 *
 * Template interpolation: `{{var}}` tokens are replaced from the payload passed
 * to `notify()`. Missing vars render as empty strings. Global variables
 * (`{{brand}}`, `{{appUrl}}`, `{{adminUrl}}`, `{{supportEmail}}`, `{{year}}`,
 * `{{name}}`) are injected automatically by `notificationService.ts`.
 */

export type EventChannel = "email" | "whatsapp" | "inApp";

export type EventAudience = "seller" | "admin";

export interface EventDefinition {
  key: string;
  category: "orders" | "payments" | "account" | "support" | "system";
  /** Who sees this event in preferences UI. Default: "seller". */
  audience?: EventAudience;
  label: string; // human label for preferences UI
  description: string;
  channels: EventChannel[]; // supported channels
  defaultEnabled: Record<EventChannel, boolean>;
  /** If true, user cannot opt out (transactional / security). */
  mandatory?: boolean;
  email?: { subject: string; html: string };
  inApp?: { title: string; body: string; link?: string };
  whatsapp?: { body: string };
}

// ── Shared HTML email shell ────────────────────────────────────────────────
// Table-based layout for maximum client compatibility (Gmail, Outlook, Apple
// Mail, etc). Inline styles only — <style> blocks are stripped by many clients.

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#475569";
const TEXT_MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const SURFACE = "#FFFFFF";
const PAGE_BG = "#F4F5F7";
// Brand palette sourced from client/src/theme/theme.ts — keep in sync.
// Note: emails lead with magenta (accent in the app) for stronger contrast on
// white email backgrounds; orange is demoted to the gradient end accent only.
const BRAND_PRIMARY = "#96286E"; // Deep Magenta — primary CTA / link color in emails
const BRAND_ACCENT = "#EF5C20";  // Vermilion Orange — gradient accent only

// Hosted logo URL. Email clients can't reach {{appUrl}} when CLIENT_URL is
// localhost, so the logo is referenced by its absolute deployed URL (kept
// independent of CLIENT_URL on purpose). Served from client/public/box-and-beyond-logo.png
// on the production frontend.
const BRAND_LOGO_URL = "https://boxandbeyond.in/box-and-beyond-logo.png";

const button = (href: string, label: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center" style="border-radius: 10px; background: ${BRAND_PRIMARY};">
        <a href="${href}" target="_blank" rel="noopener"
           style="display: inline-block; padding: 12px 28px; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

const infoRow = (label: string, value: string): string => `
  <tr>
    <td style="padding: 8px 0; font-family: ${FONT}; font-size: 13px; color: ${TEXT_MUTED}; width: 140px;">${label}</td>
    <td style="padding: 8px 0; font-family: ${FONT}; font-size: 13px; color: ${TEXT_PRIMARY}; font-weight: 500;">${value}</td>
  </tr>`;

const detailsBlock = (rows: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background: #F8FAFC; border: 1px solid ${BORDER}; border-radius: 12px; padding: 8px 16px; margin: 16px 0;">
    ${rows}
  </table>`;

interface WrapOptions {
  preheader?: string;
  cta?: { url: string; label: string };
}

const wrap = (bodyHtml: string, opts: WrapOptions = {}): string => {
  const preheader = opts.preheader ?? "";
  const cta = opts.cta ? button(opts.cta.url, opts.cta.label) : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>{{brand}}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${PAGE_BG}; -webkit-font-smoothing: antialiased;">
    <!-- Preheader (hidden preview text) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${PAGE_BG};">
      ${preheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${PAGE_BG}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                 style="max-width: 600px; width: 100%; background: ${SURFACE}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);">
            <!-- Accent bar -->
            <tr>
              <td style="height: 4px; line-height: 0; font-size: 0; background: linear-gradient(90deg, ${BRAND_PRIMARY} 0%, ${BRAND_ACCENT} 100%);">&nbsp;</td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="padding: 28px 32px 4px;">
                <a href="{{appUrl}}" target="_blank" rel="noopener"
                   style="text-decoration: none; display: inline-block;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align: middle; padding-right: 12px;">
                        <img src="${BRAND_LOGO_URL}"
                             width="40" height="40" alt="{{brand}}"
                             style="display: block; width: 40px; height: 40px; border: 0; border-radius: 10px; object-fit: contain;" />
                      </td>
                      <td style="vertical-align: middle; color: ${TEXT_PRIMARY}; font-family: ${FONT}; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
                        Box and Beyond
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 16px 32px 32px; font-family: ${FONT}; font-size: 15px; color: ${TEXT_PRIMARY}; line-height: 1.6;">
                ${bodyHtml}
                ${cta}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 32px; background: #FAFAFC; border-top: 1px solid ${BORDER}; font-family: ${FONT}; font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.6;">
                <p style="margin: 0 0 8px;">
                  You're receiving this email because you have an active {{brand}} account.
                  <a href="{{appUrl}}/settings/notifications" target="_blank" rel="noopener" style="color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 500;">
                    Manage notification preferences
                  </a>.
                </p>
                <p style="margin: 0 0 8px;">
                  Questions? Contact us at
                  <a href="mailto:{{supportEmail}}" style="color: ${BRAND_PRIMARY}; text-decoration: none; font-weight: 500;">{{supportEmail}}</a>.
                </p>
                <p style="margin: 0; color: #B8C0CC;">
                  © {{year}} {{brand}}. All rights reserved. This is a service-related communication
                  sent in connection with your account.
                </p>
              </td>
            </tr>
          </table>

          <!-- Spacer -->
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
            <tr>
              <td style="padding: 16px 32px; font-family: ${FONT}; font-size: 11px; color: ${TEXT_MUTED}; text-align: center; line-height: 1.5;">
                Please do not reply directly to this email — replies are not monitored.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const h1 = (text: string): string =>
  `<h1 style="margin: 0 0 12px; font-family: ${FONT}; font-size: 22px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.3px;">${text}</h1>`;

const p = (text: string): string =>
  `<p style="margin: 0 0 12px; font-family: ${FONT}; font-size: 15px; color: ${TEXT_SECONDARY}; line-height: 1.6;">${text}</p>`;

const muted = (text: string): string =>
  `<p style="margin: 0 0 8px; font-family: ${FONT}; font-size: 13px; color: ${TEXT_MUTED}; line-height: 1.5;">${text}</p>`;

// ── Events ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_EVENTS: Record<string, EventDefinition> = {
  // ══════════════════════════════════════════════════════
  // Auth / account
  // ══════════════════════════════════════════════════════

  "auth.otp": {
    key: "auth.otp",
    category: "account",
    label: "Login OTP",
    description: "One-time passwords for signing in",
    channels: ["email", "whatsapp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: false },
    mandatory: true,
    email: {
      subject: "Your {{brand}} verification code",
      html: wrap(
        `
        ${h1("Verification code")}
        ${p("Use the code below to finish signing in to your {{brand}} account.")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background: #F8FAFC; border: 1px solid ${BORDER}; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td align="center" style="padding: 28px 16px;">
              <div style="font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 700; letter-spacing: 14px; color: ${TEXT_PRIMARY};">
                {{code}}
              </div>
            </td>
          </tr>
        </table>
        ${muted("This code expires in 10 minutes. For your security, never share it with anyone — {{brand}} staff will never ask you for this code.")}
        ${muted("If you didn't request this code, you can safely ignore this email. Someone may have entered your address by mistake.")}
      `,
        { preheader: "Your login code is {{code}} — expires in 10 minutes." },
      ),
    },
    whatsapp: { body: "Your {{brand}} OTP is {{code}}. Valid for 10 minutes. Do not share." },
  },

  "auth.password_reset": {
    key: "auth.password_reset",
    category: "account",
    label: "Password reset",
    description: "Confirmation when your password is reset",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    mandatory: true,
    email: {
      subject: "Your {{brand}} password was reset",
      html: wrap(
        `
        ${h1("Password reset successful")}
        ${p("Hi {{name}},")}
        ${p("This is to confirm that the password on your {{brand}} account was just reset. You can continue to sign in as usual with your new password.")}
        ${p("<strong style=\"color: " + TEXT_PRIMARY + ";\">Didn't do this?</strong> Your account may be at risk. Please reset your password immediately and contact our support team.")}
      `,
        {
          preheader: "Your {{brand}} password was reset.",
          cta: { url: "{{appUrl}}/settings/password", label: "Review account security" },
        },
      ),
    },
    inApp: {
      title: "Password reset",
      body: "Your password was reset successfully.",
      link: "/settings/password",
    },
  },

  "auth.login": {
    key: "auth.login",
    category: "account",
    label: "New sign-in",
    description: "Alert when a new sign-in is detected",
    channels: ["email", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: true },
    email: {
      subject: "New sign-in to your {{brand}} account",
      html: wrap(
        `
        ${h1("New sign-in detected")}
        ${p("Hi {{name}},")}
        ${p("We noticed a new sign-in to your {{brand}} account. If this was you, no further action is needed.")}
        ${detailsBlock(
          infoRow("Device", "{{device}}") + infoRow("Time", "{{time}}") + infoRow("Location", "{{location}}"),
        )}
        ${p("If this wasn't you, please reset your password right away and review recent account activity.")}
      `,
        {
          preheader: "A new sign-in to {{brand}} was just detected.",
          cta: { url: "{{appUrl}}/settings/password", label: "Secure my account" },
        },
      ),
    },
    inApp: { title: "New sign-in", body: "Signed in from {{device}}" },
  },

  // ══════════════════════════════════════════════════════
  // Orders
  // ══════════════════════════════════════════════════════

  "order.created": {
    key: "order.created",
    category: "orders",
    label: "Order created",
    description: "When a new order is placed",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Order {{orderId}} created on {{brand}}",
      html: wrap(
        `
        ${h1("Your order is ready to ship")}
        ${p("Hi {{name}},")}
        ${p("We've received your shipment details and your order is now in the system. You can track its progress or print labels from your dashboard.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("Amount", "₹{{amount}}") +
            infoRow("Courier partner", "{{courier}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} for ₹{{amount}} is created.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "View order" },
        },
      ),
    },
    inApp: {
      title: "Order {{orderId}} created",
      body: "Created successfully with {{courier}}",
      link: "/orders/{{orderObjectId}}",
    },
    whatsapp: {
      body: "Hi {{name}}, your {{brand}} order {{orderId}} (₹{{amount}}) is created.",
    },
  },

  "order.booked": {
    key: "order.booked",
    category: "orders",
    label: "Order booked",
    description: "When courier confirms booking and AWB is generated",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "AWB generated for order {{orderId}}",
      html: wrap(
        `
        ${h1("AWB generated")}
        ${p("Hi {{name}},")}
        ${p("Your order has been booked with the courier and an Air Waybill (AWB) has been generated. Use the AWB below for tracking and reference.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("AWB", "{{awb}}") +
            infoRow("Courier partner", "{{courier}}"),
        )}
        ${muted("You can download the shipping label and manifest from the order details page.")}
      `,
        {
          preheader: "AWB {{awb}} generated for {{orderId}}.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "View order & label" },
        },
      ),
    },
    inApp: {
      title: "AWB generated: {{awb}}",
      body: "Order {{orderId}} booked with {{courier}}",
      link: "/orders/{{orderObjectId}}",
    },
    whatsapp: { body: "Order {{orderId}} booked. AWB: {{awb}}. Courier: {{courier}}." },
  },

  "order.pickup_initiated": {
    key: "order.pickup_initiated",
    category: "orders",
    label: "Pickup initiated",
    description: "When pickup is scheduled with the courier",
    channels: ["email", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: true },
    email: {
      subject: "Pickup scheduled for order {{orderId}}",
      html: wrap(
        `
        ${h1("Pickup scheduled")}
        ${p("Hi {{name}},")}
        ${p("The courier has scheduled a pickup for your order. Please keep the package packed and ready at the pickup address.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("Courier partner", "{{courier}}") +
            infoRow("Pickup date", "{{pickupDate}}"),
        )}
      `,
        {
          preheader: "Pickup scheduled for order {{orderId}}.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "View order" },
        },
      ),
    },
    inApp: { title: "Pickup scheduled", body: "Order {{orderId}}", link: "/orders/{{orderObjectId}}" },
  },

  "order.shipped": {
    key: "order.shipped",
    category: "orders",
    label: "Order shipped",
    description: "When the shipment is handed to the courier",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Order {{orderId}} is on its way",
      html: wrap(
        `
        ${h1("Your shipment is on its way")}
        ${p("Hi {{name}},")}
        ${p("Your shipment has been picked up and is now in transit with the courier. Track the latest status from your dashboard.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("AWB", "{{awb}}") +
            infoRow("Courier partner", "{{courier}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} is on its way.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "Track shipment" },
        },
      ),
    },
    inApp: { title: "Order shipped", body: "{{orderId}} — AWB {{awb}}", link: "/orders/{{orderObjectId}}" },
    whatsapp: { body: "Order {{orderId}} is shipped. Track via AWB {{awb}}." },
  },

  "order.in_transit": {
    key: "order.in_transit",
    category: "orders",
    label: "In transit updates",
    description: "When the shipment moves through transit hubs",
    channels: ["inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: false },
    inApp: { title: "In transit", body: "{{orderId}} at {{location}}", link: "/orders/{{orderObjectId}}" },
  },

  "order.out_for_delivery": {
    key: "order.out_for_delivery",
    category: "orders",
    label: "Out for delivery",
    description: "When the shipment is out for delivery",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: true },
    email: {
      subject: "Order {{orderId}} is out for delivery",
      html: wrap(
        `
        ${h1("Out for delivery today")}
        ${p("Hi {{name}},")}
        ${p("Good news — your shipment is out for delivery and expected to reach the consignee today.")}
        ${detailsBlock(infoRow("Order ID", "{{orderId}}") + infoRow("AWB", "{{awb}}"))}
      `,
        {
          preheader: "Order {{orderId}} is out for delivery.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "Track shipment" },
        },
      ),
    },
    inApp: { title: "Out for delivery", body: "{{orderId}}", link: "/orders/{{orderObjectId}}" },
    whatsapp: { body: "Order {{orderId}} is out for delivery today." },
  },

  "order.delivered": {
    key: "order.delivered",
    category: "orders",
    label: "Order delivered",
    description: "When the shipment is delivered",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Order {{orderId}} delivered",
      html: wrap(
        `
        ${h1("Delivered")}
        ${p("Hi {{name}},")}
        ${p("Your shipment has been delivered successfully. Thank you for shipping with {{brand}}.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("Delivered to", "{{city}}") +
            infoRow("Delivered on", "{{deliveredAt}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} was delivered to {{city}}.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "View delivery details" },
        },
      ),
    },
    inApp: { title: "Delivered", body: "{{orderId}} delivered to {{city}}", link: "/orders/{{orderObjectId}}" },
    whatsapp: { body: "Order {{orderId}} was delivered successfully." },
  },

  "order.ndr": {
    key: "order.ndr",
    category: "orders",
    label: "Delivery failed (NDR)",
    description: "When a delivery attempt fails",
    channels: ["email", "whatsapp", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Action required: delivery failed for {{orderId}}",
      html: wrap(
        `
        ${h1("Delivery attempt failed")}
        ${p("Hi {{name}},")}
        ${p("Unfortunately, the courier could not complete delivery for your order. Please review the reason below and take action from the NDR dashboard so the next attempt can be made promptly.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("AWB", "{{awb}}") +
            infoRow("Reason", "{{reason}}"),
        )}
        ${muted("Orders that remain unactioned for multiple attempts may be returned to origin (RTO).")}
      `,
        {
          preheader: "Delivery failed for order {{orderId}} — action needed.",
          cta: { url: "{{appUrl}}/operations/ndr", label: "Take action on NDR" },
        },
      ),
    },
    inApp: { title: "NDR: {{orderId}}", body: "{{reason}}", link: "/operations/ndr" },
    whatsapp: { body: "Delivery failed for order {{orderId}}. Reason: {{reason}}. Please action." },
  },

  "order.rto_initiated": {
    key: "order.rto_initiated",
    category: "orders",
    label: "RTO initiated",
    description: "When a return-to-origin is triggered",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Return initiated for order {{orderId}}",
      html: wrap(
        `
        ${h1("Return to origin initiated")}
        ${p("Hi {{name}},")}
        ${p("Your shipment is being returned to the origin address. We'll keep you updated as it moves through transit.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("AWB", "{{awb}}") +
            infoRow("Reason", "{{reason}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} is being returned.",
          cta: { url: "{{appUrl}}/operations/rto", label: "View RTO dashboard" },
        },
      ),
    },
    inApp: { title: "RTO initiated", body: "{{orderId}}", link: "/operations/rto" },
  },

  "order.rto_delivered": {
    key: "order.rto_delivered",
    category: "orders",
    label: "RTO delivered",
    description: "When a returned shipment reaches back",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "RTO completed for order {{orderId}}",
      html: wrap(
        `
        ${h1("Return completed")}
        ${p("Hi {{name}},")}
        ${p("Your returned shipment has been delivered back to the origin address. Please verify the package and confirm receipt from the RTO dashboard.")}
        ${detailsBlock(infoRow("Order ID", "{{orderId}}") + infoRow("AWB", "{{awb}}"))}
      `,
        {
          preheader: "Return for order {{orderId}} completed.",
          cta: { url: "{{appUrl}}/operations/rto", label: "Verify return" },
        },
      ),
    },
    inApp: { title: "RTO delivered", body: "{{orderId}}", link: "/operations/rto" },
  },

  "order.cancelled": {
    key: "order.cancelled",
    category: "orders",
    label: "Order cancelled",
    description: "When an order is cancelled",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Order {{orderId}} cancelled",
      html: wrap(
        `
        ${h1("Order cancelled")}
        ${p("Hi {{name}},")}
        ${p("Your order has been cancelled as requested. Any eligible shipping charges will be refunded to your wallet within 3-5 business days.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("Cancelled on", "{{cancelledAt}}") +
            infoRow("Reason", "{{reason}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} has been cancelled.",
          cta: { url: "{{appUrl}}/orders/{{orderObjectId}}", label: "View order" },
        },
      ),
    },
    inApp: { title: "Cancelled", body: "{{orderId}}", link: "/orders/{{orderObjectId}}" },
  },

  // ══════════════════════════════════════════════════════
  // Payments / Wallet
  // ══════════════════════════════════════════════════════

  "wallet.recharged": {
    key: "wallet.recharged",
    category: "payments",
    label: "Wallet recharged",
    description: "When funds are added to your wallet",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Wallet recharged — ₹{{amount}} added",
      html: wrap(
        `
        ${h1("Recharge successful")}
        ${p("Hi {{name}},")}
        ${p("Your {{brand}} wallet has been recharged. You can start booking shipments right away.")}
        ${detailsBlock(
          infoRow("Amount credited", "₹{{amount}}") +
            infoRow("New balance", "₹{{balance}}") +
            infoRow("Transaction ID", "{{txnId}}"),
        )}
      `,
        {
          preheader: "₹{{amount}} credited to your {{brand}} wallet.",
          cta: { url: "{{appUrl}}/wallet", label: "View wallet" },
        },
      ),
    },
    inApp: { title: "Wallet recharged", body: "₹{{amount}} credited", link: "/wallet" },
  },

  "wallet.low_balance": {
    key: "wallet.low_balance",
    category: "payments",
    label: "Low wallet balance",
    description: "When your wallet runs low",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Your {{brand}} wallet is running low",
      html: wrap(
        `
        ${h1("Low wallet balance")}
        ${p("Hi {{name}},")}
        ${p("Your wallet balance is running low. Recharge now to make sure new orders aren't blocked at booking time.")}
        ${detailsBlock(infoRow("Current balance", "₹{{balance}}"))}
      `,
        {
          preheader: "Only ₹{{balance}} left in your wallet.",
          cta: { url: "{{appUrl}}/wallet", label: "Recharge wallet" },
        },
      ),
    },
    inApp: { title: "Low balance", body: "Balance ₹{{balance}}", link: "/wallet" },
  },

  "invoice.generated": {
    key: "invoice.generated",
    category: "payments",
    label: "Invoice generated",
    description: "When a new billing invoice is issued",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Invoice {{invoiceNumber}} is ready",
      html: wrap(
        `
        ${h1("Your invoice is ready")}
        ${p("Hi {{name}},")}
        ${p("A new invoice has been generated for your {{brand}} account. You can download the PDF or view the line items from your billing dashboard.")}
        ${detailsBlock(
          infoRow("Invoice number", "{{invoiceNumber}}") +
            infoRow("Amount", "₹{{amount}}") +
            infoRow("Period", "{{period}}"),
        )}
      `,
        {
          preheader: "Invoice {{invoiceNumber}} for ₹{{amount}} is ready.",
          cta: { url: "{{appUrl}}/billings", label: "View invoice" },
        },
      ),
    },
    inApp: { title: "Invoice generated", body: "{{invoiceNumber}} — ₹{{amount}}", link: "/billings" },
  },

  // ══════════════════════════════════════════════════════
  // KYC
  // ══════════════════════════════════════════════════════

  "kyc.approved": {
    key: "kyc.approved",
    category: "account",
    label: "KYC approved",
    description: "When your KYC is approved",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Your {{brand}} KYC is approved",
      html: wrap(
        `
        ${h1("KYC approved")}
        ${p("Hi {{name}},")}
        ${p("Good news — your KYC verification is complete. All shipping features are now enabled on your account, including high-volume booking and invoicing.")}
      `,
        {
          preheader: "You're verified — all features are unlocked.",
          cta: { url: "{{appUrl}}/settings/kyc", label: "Review KYC details" },
        },
      ),
    },
    inApp: { title: "KYC approved", body: "You're all set", link: "/settings/kyc" },
  },

  "kyc.rejected": {
    key: "kyc.rejected",
    category: "account",
    label: "KYC rejected",
    description: "When your KYC needs changes",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Action needed: your {{brand}} KYC requires changes",
      html: wrap(
        `
        ${h1("KYC update required")}
        ${p("Hi {{name}},")}
        ${p("We reviewed the KYC documents on your {{brand}} account and a few changes are needed before we can approve it.")}
        ${detailsBlock(infoRow("Reason", "{{reason}}"))}
        ${p("Please re-upload the requested documents from your account settings. If anything is unclear, our support team is happy to help.")}
      `,
        {
          preheader: "KYC needs attention: {{reason}}",
          cta: { url: "{{appUrl}}/settings/kyc", label: "Update KYC" },
        },
      ),
    },
    inApp: { title: "KYC rejected", body: "{{reason}}", link: "/settings/kyc" },
  },

  // ══════════════════════════════════════════════════════
  // Support
  // ══════════════════════════════════════════════════════

  "support.ticket_created": {
    key: "support.ticket_created",
    category: "support",
    label: "Support ticket created",
    description: "Confirmation when you open a ticket",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Ticket {{ticketNumber}} received",
      html: wrap(
        `
        ${h1("We've received your ticket")}
        ${p("Hi {{name}},")}
        ${p("Thanks for reaching out. Your ticket is in our queue and a member of the support team will respond within 24 hours on business days.")}
        ${detailsBlock(
          infoRow("Ticket number", "{{ticketNumber}}") + infoRow("Subject", "{{subject}}"),
        )}
      `,
        {
          preheader: "Ticket {{ticketNumber}} received — we'll reply within 24 hours.",
          cta: { url: "{{appUrl}}/support/{{ticketId}}", label: "View ticket" },
        },
      ),
    },
    inApp: {
      title: "Ticket opened",
      body: "{{ticketNumber}} — {{subject}}",
      link: "/support/{{ticketId}}",
    },
  },

  "support.ticket_reply": {
    key: "support.ticket_reply",
    category: "support",
    label: "Ticket reply",
    description: "When support replies to your ticket",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "New reply on ticket {{ticketNumber}}",
      html: wrap(
        `
        ${h1("You have a new reply")}
        ${p("Hi {{name}},")}
        ${p("Our support team has replied on your ticket. Here's a quick preview:")}
        <blockquote style="margin: 16px 0; padding: 12px 16px; background: #F8FAFC; border-left: 3px solid ${BRAND_PRIMARY}; border-radius: 4px; color: ${TEXT_SECONDARY}; font-family: ${FONT}; font-size: 14px; line-height: 1.6;">
          {{preview}}
        </blockquote>
        ${p("Open the ticket to read the full reply and continue the conversation.")}
      `,
        {
          preheader: "New reply on ticket {{ticketNumber}}.",
          cta: { url: "{{appUrl}}/support/{{ticketId}}", label: "Open ticket" },
        },
      ),
    },
    inApp: {
      title: "New reply: {{ticketNumber}}",
      body: "{{preview}}",
      link: "/support/{{ticketId}}",
    },
  },

  "support.ticket_resolved": {
    key: "support.ticket_resolved",
    category: "support",
    label: "Ticket resolved",
    description: "When your ticket is marked resolved",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Ticket {{ticketNumber}} has been resolved",
      html: wrap(
        `
        ${h1("Your ticket is resolved")}
        ${p("Hi {{name}},")}
        ${p("We've marked your ticket as resolved. If the issue isn't fully fixed or if anything else comes up, just reply on the ticket and we'll reopen it.")}
        ${detailsBlock(infoRow("Ticket number", "{{ticketNumber}}"))}
      `,
        {
          preheader: "Ticket {{ticketNumber}} has been marked resolved.",
          cta: { url: "{{appUrl}}/support/{{ticketId}}", label: "View ticket" },
        },
      ),
    },
    inApp: { title: "Ticket resolved", body: "{{ticketNumber}}", link: "/support/{{ticketId}}" },
  },

  // ══════════════════════════════════════════════════════
  // Admin-facing events
  // ══════════════════════════════════════════════════════

  "admin.new_support_ticket": {
    key: "admin.new_support_ticket",
    category: "support",
    audience: "admin",
    label: "New support ticket",
    description: "When a seller opens a new support ticket",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "New support ticket: {{ticketNumber}}",
      html: wrap(
        `
        ${h1("New support ticket")}
        ${p("A seller has just opened a new support ticket and is awaiting a response.")}
        ${detailsBlock(
          infoRow("Ticket", "{{ticketNumber}}") +
            infoRow("Subject", "{{subject}}") +
            infoRow("Seller", "{{sellerName}}") +
            infoRow("Email", "{{sellerEmail}}"),
        )}
      `,
        {
          preheader: "New ticket from {{sellerName}}: {{subject}}",
          cta: { url: "{{adminUrl}}/support-tickets/{{ticketId}}", label: "Open ticket" },
        },
      ),
    },
    inApp: {
      title: "New ticket: {{ticketNumber}}",
      body: "{{subject}} — from {{sellerName}}",
      link: "/support-tickets/{{ticketId}}",
    },
  },

  "admin.support_ticket_reply": {
    key: "admin.support_ticket_reply",
    category: "support",
    audience: "admin",
    label: "Seller replied to ticket",
    description: "When a seller sends a reply on a ticket",
    channels: ["email", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: true },
    email: {
      subject: "Reply on {{ticketNumber}} from {{sellerName}}",
      html: wrap(
        `
        ${h1("Seller replied on a ticket")}
        ${p("{{sellerName}} has sent a reply on ticket {{ticketNumber}}. Preview below:")}
        <blockquote style="margin: 16px 0; padding: 12px 16px; background: #F8FAFC; border-left: 3px solid ${BRAND_PRIMARY}; border-radius: 4px; color: ${TEXT_SECONDARY}; font-family: ${FONT}; font-size: 14px; line-height: 1.6;">
          {{preview}}
        </blockquote>
      `,
        {
          preheader: "{{sellerName}} replied on {{ticketNumber}}.",
          cta: { url: "{{adminUrl}}/support-tickets/{{ticketId}}", label: "Open ticket" },
        },
      ),
    },
    inApp: {
      title: "Reply: {{ticketNumber}}",
      body: "{{preview}}",
      link: "/support-tickets/{{ticketId}}",
    },
  },

  "admin.new_user_registered": {
    key: "admin.new_user_registered",
    category: "account",
    audience: "admin",
    label: "New user registered",
    description: "When a new seller creates an account",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "New seller signed up: {{userName}}",
      html: wrap(
        `
        ${h1("New registration")}
        ${p("A new seller just signed up on {{brand}}.")}
        ${detailsBlock(infoRow("Name", "{{userName}}") + infoRow("Email", "{{userEmail}}"))}
      `,
        {
          preheader: "{{userName}} just signed up.",
          cta: { url: "{{adminUrl}}/users-management", label: "View in admin panel" },
        },
      ),
    },
    inApp: {
      title: "New user registered",
      body: "{{userName}} — {{userEmail}}",
      link: "/users-management",
    },
  },

  "admin.kyc_submitted": {
    key: "admin.kyc_submitted",
    category: "account",
    audience: "admin",
    label: "KYC submitted for review",
    description: "When a seller submits KYC documents",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "KYC submitted by {{userName}}",
      html: wrap(
        `
        ${h1("KYC review needed")}
        ${p("A seller has submitted their KYC documents and is awaiting review.")}
        ${detailsBlock(infoRow("Seller", "{{userName}}") + infoRow("Email", "{{userEmail}}"))}
      `,
        {
          preheader: "{{userName}} submitted KYC for review.",
          cta: { url: "{{adminUrl}}/users-management/{{userId}}", label: "Review KYC" },
        },
      ),
    },
    inApp: {
      title: "KYC submitted",
      body: "{{userName}} needs review",
      link: "/users-management/{{userId}}",
    },
  },

  "admin.new_order": {
    key: "admin.new_order",
    category: "orders",
    audience: "admin",
    label: "New order created",
    description: "When any seller creates an order",
    channels: ["email", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: false },
    email: {
      subject: "New order {{orderId}} by {{sellerName}}",
      html: wrap(
        `
        ${h1("New order created")}
        ${p("A new order has just been booked on {{brand}}.")}
        ${detailsBlock(
          infoRow("Order ID", "{{orderId}}") +
            infoRow("Amount", "₹{{amount}}") +
            infoRow("Seller", "{{sellerName}}") +
            infoRow("Courier", "{{courier}}"),
        )}
      `,
        {
          preheader: "Order {{orderId}} — ₹{{amount}} by {{sellerName}}.",
          cta: { url: "{{adminUrl}}/orders/{{orderObjectId}}", label: "View order" },
        },
      ),
    },
    inApp: {
      title: "New order: {{orderId}}",
      body: "₹{{amount}} — {{sellerName}}",
      link: "/orders/{{orderObjectId}}",
    },
  },

  "admin.low_wallet_alert": {
    key: "admin.low_wallet_alert",
    category: "payments",
    audience: "admin",
    label: "Seller low wallet balance",
    description: "When a seller's wallet drops below threshold",
    channels: ["email", "inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: true },
    email: {
      subject: "Low wallet: {{sellerName}} (₹{{balance}})",
      html: wrap(
        `
        ${h1("Seller wallet running low")}
        ${p("A seller's wallet balance has dropped below the alert threshold.")}
        ${detailsBlock(
          infoRow("Seller", "{{sellerName}}") + infoRow("Current balance", "₹{{balance}}"),
        )}
      `,
        {
          preheader: "{{sellerName}} balance is ₹{{balance}}.",
          cta: { url: "{{adminUrl}}/wallet", label: "Open wallet dashboard" },
        },
      ),
    },
    inApp: { title: "Low wallet: {{sellerName}}", body: "Balance ₹{{balance}}", link: "/wallet" },
  },

  "admin.wallet_recharged": {
    key: "admin.wallet_recharged",
    category: "payments",
    audience: "admin",
    label: "Wallet recharged",
    description: "When a seller recharges their wallet",
    channels: ["inApp"],
    defaultEnabled: { email: false, whatsapp: false, inApp: false },
    inApp: { title: "Wallet recharged", body: "{{sellerName}} added ₹{{amount}}", link: "/wallet" },
  },

  // ══════════════════════════════════════════════════════
  // Staff admin lifecycle (sent to the staff admin themselves)
  // ══════════════════════════════════════════════════════

  "staff.welcome": {
    key: "staff.welcome",
    category: "account",
    audience: "admin",
    label: "Welcome to your team account",
    description: "Sent when a superadmin creates your team admin account",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    mandatory: true,
    email: {
      subject: "Welcome to {{brand}} — your team account is ready",
      html: wrap(
        `
        ${h1("Welcome to the team")}
        ${p("Your team admin account has been created. Use the credentials below to sign in for the first time — you'll be asked to change the password right after.")}
        ${detailsBlock(
          infoRow("Email", "{{email}}") +
            infoRow("Temporary password", "{{tempPassword}}") +
            infoRow("Role", "{{roleLabel}}"),
        )}
        ${muted("If you weren't expecting this email, ignore it or contact your administrator.")}
      `,
        {
          preheader: "Your team admin account is ready.",
          cta: { url: "{{adminUrl}}/login", label: "Sign in" },
        },
      ),
    },
    inApp: {
      title: "Welcome to {{brand}}",
      body: "Your team account is ready. Sign in to get started.",
      link: "/",
    },
  },

  "staff.sellers_assigned": {
    key: "staff.sellers_assigned",
    category: "account",
    audience: "admin",
    label: "Sellers assigned to you",
    description: "When a superadmin gives you access to one or more sellers",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "{{count}} new seller(s) assigned to you",
      html: wrap(
        `
        ${h1("New sellers assigned")}
        ${p("Your administrator has given you access to {{count}} new seller(s). You can now see their data and act on it (subject to your permissions).")}
        ${detailsBlock(infoRow("Sellers", "{{sellerList}}"))}
      `,
        {
          preheader: "{{count}} new seller(s) assigned to you.",
          cta: { url: "{{adminUrl}}/users", label: "Open sellers list" },
        },
      ),
    },
    inApp: {
      title: "{{count}} seller(s) assigned",
      body: "{{sellerList}}",
      link: "/users",
    },
  },

  "staff.sellers_unassigned": {
    key: "staff.sellers_unassigned",
    category: "account",
    audience: "admin",
    label: "Sellers removed from your access",
    description: "When a superadmin removes one or more sellers from your scope",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "{{count}} seller(s) removed from your access",
      html: wrap(
        `
        ${h1("Access updated")}
        ${p("Your administrator has removed {{count}} seller(s) from your access. You will no longer see data for these accounts.")}
        ${detailsBlock(infoRow("Sellers", "{{sellerList}}"))}
      `,
        {
          preheader: "{{count}} seller(s) removed from your access.",
        },
      ),
    },
    inApp: {
      title: "Access updated",
      body: "{{count}} seller(s) removed from your access",
    },
  },

  "staff.permissions_changed": {
    key: "staff.permissions_changed",
    category: "account",
    audience: "admin",
    label: "Your permissions changed",
    description: "When a superadmin updates what you can do",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "Your permissions have been updated",
      html: wrap(
        `
        ${h1("Permissions updated")}
        ${p("Your administrator has updated what you can do on {{brand}}.")}
        ${detailsBlock(infoRow("Role", "{{roleLabel}}") + infoRow("Permissions", "{{permissionCount}} granted"))}
      `,
        {
          preheader: "Your permissions have been updated.",
          cta: { url: "{{adminUrl}}/", label: "Open dashboard" },
        },
      ),
    },
    inApp: {
      title: "Permissions updated",
      body: "Your administrator changed what you can do.",
    },
  },

  "staff.password_reset": {
    key: "staff.password_reset",
    category: "account",
    audience: "admin",
    label: "Your password was reset",
    description: "When a superadmin resets your password",
    channels: ["email"],
    defaultEnabled: { email: true, whatsapp: false, inApp: false },
    mandatory: true,
    email: {
      subject: "Your {{brand}} password was reset",
      html: wrap(
        `
        ${h1("Password reset")}
        ${p("Your administrator has reset your password. Use the temporary password below to sign in — you'll be prompted to set a new one immediately.")}
        ${detailsBlock(infoRow("Temporary password", "{{tempPassword}}"))}
        ${muted("If you didn't expect this, contact your administrator right away.")}
      `,
        {
          preheader: "Your password has been reset.",
          cta: { url: "{{adminUrl}}/login", label: "Sign in" },
        },
      ),
    },
  },

  "admin.password_changed": {
    key: "admin.password_changed",
    category: "account",
    audience: "admin",
    label: "Your password was changed",
    description: "Sent when you change your own password",
    channels: ["email"],
    defaultEnabled: { email: true, whatsapp: false, inApp: false },
    mandatory: true,
    email: {
      subject: "Your {{brand}} password was changed",
      html: wrap(
        `
        ${h1("Password changed")}
        ${p("Your {{brand}} password was just updated. If this was you, no further action is needed.")}
        ${muted("If you didn't make this change, contact your administrator immediately.")}
      `,
      ),
    },
  },

  "staff.deactivated": {
    key: "staff.deactivated",
    category: "account",
    audience: "admin",
    label: "Your account was deactivated",
    description: "When your team admin account is deactivated",
    channels: ["email"],
    defaultEnabled: { email: true, whatsapp: false, inApp: false },
    mandatory: true,
    email: {
      subject: "Your {{brand}} team account has been deactivated",
      html: wrap(
        `
        ${h1("Account deactivated")}
        ${p("Your team admin account has been deactivated by your administrator. You will no longer be able to sign in. If you believe this is a mistake, contact your administrator.")}
      `,
      ),
    },
  },

  "admin.support_ticket_assigned": {
    key: "admin.support_ticket_assigned",
    category: "support",
    audience: "admin",
    label: "Support ticket assigned",
    description: "When a seller you manage opens a support ticket",
    channels: ["email", "inApp"],
    defaultEnabled: { email: true, whatsapp: false, inApp: true },
    email: {
      subject: "New ticket from your seller: {{ticketNumber}}",
      html: wrap(
        `
        ${h1("New ticket from a seller you manage")}
        ${p("{{sellerName}} just opened a support ticket. Please review and respond.")}
        ${detailsBlock(
          infoRow("Ticket", "{{ticketNumber}}") +
            infoRow("Subject", "{{subject}}") +
            infoRow("Seller", "{{sellerName}}"),
        )}
      `,
        {
          preheader: "{{sellerName}} opened {{ticketNumber}}.",
          cta: { url: "{{adminUrl}}/support-tickets/{{ticketId}}", label: "Open ticket" },
        },
      ),
    },
    inApp: {
      title: "New ticket: {{ticketNumber}}",
      body: "{{subject}} — from {{sellerName}}",
      link: "/support-tickets/{{ticketId}}",
    },
  },
};

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;

export function getEvent(key: string): EventDefinition | undefined {
  return NOTIFICATION_EVENTS[key];
}

export function allEvents(audience?: EventAudience): EventDefinition[] {
  const evts = Object.values(NOTIFICATION_EVENTS);
  if (!audience) return evts;
  return evts.filter((e) => (e.audience ?? "seller") === audience);
}

export function eventsByCategory(audience?: EventAudience): Record<string, EventDefinition[]> {
  const out: Record<string, EventDefinition[]> = {};
  for (const evt of allEvents(audience)) {
    (out[evt.category] ??= []).push(evt);
  }
  return out;
}
