import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute, SuperadminRoute } from "@/components/auth/ProtectedRoute";
import LoginPage from "@/features/auth/LoginPage";
import FullPageLoader from "@/components/common/FullPageLoader";

// Keep the login screen in the entry bundle, but load the much larger admin
// screens only after authentication and only when their route is visited.
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));
const DashboardPage = lazy(() => import("@/features/dashboard"));
const ComingSoon = lazy(() => import("@/components/common/ComingSoon"));
const OrdersPage = lazy(() => import("@/features/orders"));
const OrderDetailPage = lazy(() => import("@/features/orders/components/OrderDetailPage"));
const ServiceProvidersPage = lazy(() => import("@/features/service-providers"));
const CouriersPage = lazy(() => import("@/features/couriers"));
const UsersPage = lazy(() => import("@/features/users"));
const UserDetailPage = lazy(() => import("@/features/users/components/UserDetailPage"));
const ServiceabilityPage = lazy(() => import("@/features/serviceability"));
const B2cPricingPage = lazy(() => import("@/features/b2c-pricing"));
const B2bPricingPage = lazy(() => import("@/features/b2b-pricing"));
const PlansPage = lazy(() => import("@/features/plans"));
const WalletsPage = lazy(() => import("@/features/wallets"));
const NdrPage = lazy(() => import("@/features/ndr"));
const RtoPage = lazy(() => import("@/features/rto"));
const CodRemittancePage = lazy(() => import("@/features/cod-remittance"));
const BillingInvoicesPage = lazy(() => import("@/features/billing-invoices"));
const RateCalculatorPage = lazy(() => import("@/features/rate-calculator"));
const OrderTrackingPage = lazy(() => import("@/features/order-tracking"));
const ReportsPage = lazy(() => import("@/features/reports"));
const BlogsListPage = lazy(() => import("@/features/blogs").then((module) => ({ default: module.BlogsListPage })));
const BlogEditorPage = lazy(() => import("@/features/blogs").then((module) => ({ default: module.BlogEditorPage })));
const SupportTicketsPage = lazy(() => import("@/features/support-tickets"));
const SupportTicketDetailPage = lazy(() => import("@/features/support-tickets/components/SupportTicketDetailPage"));
const NotificationSettingsPage = lazy(() => import("@/features/notification-settings"));
const NotificationsInboxPage = lazy(() => import("@/features/notifications"));
const AccountSettingsPage = lazy(() => import("@/features/account"));
const WebhooksPage = lazy(() => import("@/features/webhooks"));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* Orders & Reports */}
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Operations */}
        <Route path="ops/ndr" element={<NdrPage />} />
        <Route path="ops/rto" element={<RtoPage />} />

        {/* Management */}
        <Route path="users-management" element={<UsersPage />} />
        <Route path="users-management/:id" element={<UserDetailPage />} />
        <Route path="plans" element={<SuperadminRoute><PlansPage /></SuperadminRoute>} />

        {/* Shipping Management — superadmin only */}
        <Route path="couriers" element={<SuperadminRoute><CouriersPage /></SuperadminRoute>} />
        <Route path="service-providers" element={<SuperadminRoute><ServiceProvidersPage /></SuperadminRoute>} />
        <Route path="serviceability" element={<SuperadminRoute><ServiceabilityPage /></SuperadminRoute>} />
        <Route path="pricing/b2c" element={<SuperadminRoute><B2cPricingPage /></SuperadminRoute>} />
        <Route path="pricing/b2b" element={<SuperadminRoute><B2bPricingPage /></SuperadminRoute>} />

        {/* Billing */}
        <Route path="billing-invoices" element={<BillingInvoicesPage />} />
        <Route path="cod-remittance" element={<CodRemittancePage />} />
        <Route path="wallet" element={<WalletsPage />} />

        {/* Reconciliation */}
        <Route path="weight-reconciliation" element={<ComingSoon title="Weight Discrepancies" />} />
        <Route path="dispute-management" element={<ComingSoon title="Dispute Management" />} />

        {/* Tools */}
        <Route path="rate-calculator" element={<RateCalculatorPage />} />
        <Route path="order-tracking" element={<OrderTrackingPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />

        {/* Blogs — superadmin only */}
        <Route path="blogs" element={<SuperadminRoute><BlogsListPage /></SuperadminRoute>} />
        <Route path="create-blog" element={<SuperadminRoute><BlogEditorPage /></SuperadminRoute>} />
        <Route path="blogs/:id/edit" element={<SuperadminRoute><BlogEditorPage /></SuperadminRoute>} />

        {/* Support */}
        <Route path="support-tickets" element={<SupportTicketsPage />} />
        <Route path="support-tickets/:id" element={<SupportTicketDetailPage />} />
        <Route path="support" element={<SupportTicketsPage />} />

        {/* Settings — available to every admin */}
        <Route path="account" element={<AccountSettingsPage />} />
        <Route path="notifications" element={<NotificationsInboxPage />} />
        <Route path="notifications/settings" element={<NotificationSettingsPage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
