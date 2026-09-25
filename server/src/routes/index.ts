import { Router } from "express";
import ratesRouter from "./rates.js";
import authRouter from "./auth.js";
import serviceProvidersRouter, { publicServiceProvidersRouter } from "./serviceProviders.js";
import couriersRouter, { sellerCouriersRouter } from "./couriers.js";
import usersRouter from "./users.js";
import locationsRouter from "./locations.js";
import b2cZonesRouter from "./b2cZones.js";
import b2cPricingRouter from "./b2cPricing.js";
import adminAuthRouter from "./adminAuth.js";
import adminOrdersRouter from "./adminOrders.js";
import plansRouter from "./plans.js";
import pickupAddressesRouter from "./pickupAddresses.js";
import ordersRouter from "./orders.js";
import webhooksRouter from "./webhooks.js";
import { adminWalletRouter, customerWalletRouter } from "./wallets.js";
import labelSettingsRouter from "./labelSettings.js";
import kycRouter from "./kyc.js";
import adminKycRouter from "./adminKyc.js";
import courierWebhooksRouter from "./courierWebhooks.js";
import { customerCodRemittanceRouter, adminCodRemittanceRouter } from "./codRemittance.js";
import { customerInvoiceRouter, adminInvoiceRouter } from "./billingInvoice.js";
import profileRouter from "./profile.js";
import { customerBankAccountRouter, adminBankAccountRouter } from "./bankAccounts.js";
import dashboardRouter from "./dashboard.js";
import adminDashboardRouter from "./adminDashboard.js";
import b2bAdminRouter from "./b2bAdmin.js";
import reportsRouter from "./reports.js";
import adminReportsRouter from "./adminReports.js";
import { publicBlogsRouter, adminBlogsRouter } from "./blogs.js";
import teamMembersRouter from "./teamMembers.js";
import notificationsRouter from "./notifications.js";
import { sellerSupportRouter, adminSupportRouter } from "./supportTickets.js";
import adminNotificationsRouter from "./adminNotifications.js";
import adminWebhooksRouter from "./adminWebhooks.js";
import { publicTrackingRouter } from "./publicTracking.js";
import externalOrdersRouter from "./externalOrders.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "searchcraft-api" });
});

// Courier webhook receivers (no auth — couriers POST directly)
router.use("/courier-webhooks", courierWebhooksRouter);

router.use("/rates", ratesRouter);
router.use("/auth", authRouter);

// Public blogs (no auth — marketing site reads these)
router.use("/blogs", publicBlogsRouter);

// Public service-provider logos (no auth — browser <img> renders directly)
router.use("/service-providers", publicServiceProvidersRouter);

// Public shipment tracking (no auth — marketing-site "Track Shipment" page)
router.use("/track", publicTrackingRouter);

// Customer routes (authenticated)
router.use("/dashboard", dashboardRouter);
router.use("/pickup-addresses", pickupAddressesRouter);
router.use("/couriers", sellerCouriersRouter);
router.use("/orders", ordersRouter);
router.use("/external", externalOrdersRouter);
router.use("/webhooks", webhooksRouter);
router.use("/wallet", customerWalletRouter);
router.use("/label-settings", labelSettingsRouter);
router.use("/kyc", kycRouter);
router.use("/profile", profileRouter);
router.use("/bank-accounts", customerBankAccountRouter);
router.use("/team-members", teamMembersRouter);
router.use("/notifications", notificationsRouter);
router.use("/support-tickets", sellerSupportRouter);

// Admin routes
router.use("/admin/auth", adminAuthRouter);
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/service-providers", serviceProvidersRouter);
router.use("/admin/couriers", couriersRouter);
router.use("/admin/users", usersRouter);
router.use("/admin/locations", locationsRouter);
router.use("/admin/b2c-zones", b2cZonesRouter);
router.use("/admin/b2c-pricing", b2cPricingRouter);
router.use("/admin/orders", adminOrdersRouter);
router.use("/admin/plans", plansRouter);
router.use("/admin/wallets", adminWalletRouter);
router.use("/admin", adminKycRouter);
router.use("/admin/cod-remittance", adminCodRemittanceRouter);
router.use("/admin/billing-invoices", adminInvoiceRouter);
router.use("/admin/bank-accounts", adminBankAccountRouter);
router.use("/admin/b2b", b2bAdminRouter);
router.use("/admin/reports", adminReportsRouter);
router.use("/admin/blogs", adminBlogsRouter);
router.use("/admin/support-tickets", adminSupportRouter);
router.use("/admin/notifications", adminNotificationsRouter);
router.use("/admin/webhooks", adminWebhooksRouter);

// Customer COD & billing routes
router.use("/cod-remittance", customerCodRemittanceRouter);
router.use("/billing-invoices", customerInvoiceRouter);
router.use("/reports", reportsRouter);

export default router;
