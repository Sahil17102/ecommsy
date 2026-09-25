import { Routes, Route } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { ProtectedRoute, SuperadminRoute } from "@/components/auth/ProtectedRoute";
import LoginPage from "@/features/auth/LoginPage";
import DashboardPage from "@/features/dashboard";
import ComingSoon from "@/components/common/ComingSoon";
import OrdersPage from "@/features/orders";
import OrderDetailPage from "@/features/orders/components/OrderDetailPage";
import ServiceProvidersPage from "@/features/service-providers";
import CouriersPage from "@/features/couriers";
import UsersPage from "@/features/users";
import UserDetailPage from "@/features/users/components/UserDetailPage";
import ServiceabilityPage from "@/features/serviceability";
import B2cPricingPage from "@/features/b2c-pricing";
import B2bPricingPage from "@/features/b2b-pricing";
import PlansPage from "@/features/plans";
import WalletsPage from "@/features/wallets";
import NdrPage from "@/features/ndr";
import RtoPage from "@/features/rto";
import CodRemittancePage from "@/features/cod-remittance";
import BillingInvoicesPage from "@/features/billing-invoices";
import RateCalculatorPage from "@/features/rate-calculator";
import OrderTrackingPage from "@/features/order-tracking";
import ReportsPage from "@/features/reports";
import { BlogsListPage, BlogEditorPage } from "@/features/blogs";
import SupportTicketsPage from "@/features/support-tickets";
import SupportTicketDetailPage from "@/features/support-tickets/components/SupportTicketDetailPage";
import NotificationSettingsPage from "@/features/notification-settings";
import NotificationsInboxPage from "@/features/notifications";
import AccountSettingsPage from "@/features/account";
import WebhooksPage from "@/features/webhooks";

export default function App() {
  return (
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
  );
}
