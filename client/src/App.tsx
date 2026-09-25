import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/common";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { OnboardingRoute } from "./components/auth/OnboardingRoute";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { HomePage } from "./pages/landing/HomePage";
import { PlatformPage } from "./pages/landing/PlatformPage";
import { SalesChannelsPage } from "./pages/landing/SalesChannelsPage";
import { CourierPartnersPage } from "./pages/landing/CourierPartnersPage";
import { RateCalculatorPage } from "./pages/landing/RateCalculatorPage";
import { WeightEstimatorPage } from "./pages/landing/WeightEstimatorPage";
import { TrackShipmentPage } from "./pages/landing/TrackShipmentPage";
import { BlogsPage } from "./pages/landing/BlogsPage";
import { BlogDetailPage } from "./pages/landing/BlogDetailPage";
import { AboutPage } from "./pages/landing/AboutPage";
import { CareersPage } from "./pages/landing/CareersPage";
import { ContactPage } from "./pages/landing/ContactPage";
import { PartnersPage } from "./pages/landing/PartnersPage";
import { PrivacyPage } from "./pages/landing/PrivacyPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SellerHomePage } from "./pages/SellerHomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { CreateOrderPage } from "./pages/CreateOrderPage";
import { OrdersPage } from "./pages/OrdersPage";
import BulkB2CPage from "./pages/BulkUpload/BulkB2CPage";
import BulkB2BPage from "./pages/BulkUpload/BulkB2BPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import PickupAddressesPage from "./pages/settings/pickup-addresses";
import LabelConfigurationPage from "./pages/settings/label-configuration";
import KycPage from "./pages/settings/kyc";
import CompanyProfilePage from "./pages/settings/company-profile";
import BankDetailsPage from "./pages/settings/bank-details";
import BillingPreferencesPage from "./pages/settings/billing-preferences";
import UserManagementPage from "./pages/settings/user-management";
import ChangePasswordPage from "./pages/settings/change-password";
import WebhooksPage from "./pages/settings/webhooks";
import { WalletPage } from "./pages/WalletPage";
import { NdrPage } from "./pages/NdrPage";
import { RtoPage } from "./pages/RtoPage";
import { CodRemittancePage } from "./pages/CodRemittancePage";
import { BillingInvoicesPage } from "./pages/BillingInvoicesPage";
import { RateCardPage } from "./pages/tools/RateCardPage";
import { RateCalculatorPage as SellerRateCalculatorPage } from "./pages/tools/RateCalculatorPage";
import { OrderTrackingPage } from "./pages/tools/OrderTrackingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import NotificationPreferencesPage from "./pages/settings/notifications";
import { SupportListPage } from "./pages/support/SupportListPage";
import { SupportDetailPage } from "./pages/support/SupportDetailPage";
function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/signup" element={<SignUpPage />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />

      {/* Public marketing site */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/signup" replace />} />
        <Route path="platform" element={<PlatformPage />} />
        <Route path="integrations/sales-channels" element={<SalesChannelsPage />} />
        <Route path="integrations/courier-partners" element={<CourierPartnersPage />} />
        <Route path="resources/rate-calculator" element={<RateCalculatorPage />} />
        <Route path="resources/weight-estimator" element={<WeightEstimatorPage />} />
        <Route path="track" element={<TrackShipmentPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/:slug" element={<BlogDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
      </Route>

      {/* Protected app — no /dashboard prefix */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<SellerHomePage />} />
        <Route path="/analytics" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/b2b" element={<OrdersPage type="b2b" />} />
        <Route path="/orders/b2c" element={<OrdersPage type="b2c" />} />
        <Route path="/orders/create" element={<CreateOrderPage />} />
        <Route path="/orders/b2c/bulk-upload" element={<BulkB2CPage />} />
        <Route path="/orders/b2b/bulk-upload" element={<BulkB2BPage />} />
        <Route path="/orders/bulk-upload" element={<Navigate to="/orders/b2c/bulk-upload" replace />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/operations" element={<ComingSoon title="Operations" />} />
        <Route path="/operations/ndr" element={<NdrPage />} />
        <Route path="/operations/rto" element={<RtoPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/cod-remittance" element={<CodRemittancePage />} />
        <Route path="/billings" element={<BillingInvoicesPage />} />
        <Route path="/reconciliation" element={<ComingSoon title="Reconciliation" />} />
        <Route path="/tools" element={<Navigate to="/tools/rate-card" replace />} />
        <Route path="/tools/rate-card" element={<RateCardPage />} />
        <Route path="/tools/rate-calculator" element={<SellerRateCalculatorPage />} />
        <Route path="/tools/order-tracking" element={<OrderTrackingPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/pickup-addresses" element={<PickupAddressesPage />} />
        <Route path="/settings/label-configuration" element={<LabelConfigurationPage />} />
        <Route path="/settings/kyc" element={<KycPage />} />
        <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
        <Route path="/settings/bank-details" element={<BankDetailsPage />} />
        <Route path="/settings/billing-preferences" element={<BillingPreferencesPage />} />
        <Route path="/settings/change-password" element={<ChangePasswordPage />} />
        <Route path="/settings/user-management" element={<UserManagementPage />} />
        <Route path="/settings/invoice-preferences" element={<ComingSoon title="Invoice Preferences" />} />
        <Route path="/settings/manage-channels" element={<ComingSoon title="Manage Channels" />} />
        <Route path="/settings/courier-priority" element={<ComingSoon title="Courier Priority" />} />
        <Route path="/settings/webhooks" element={<WebhooksPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
        <Route path="/support" element={<SupportListPage />} />
        <Route path="/support/:id" element={<SupportDetailPage />} />
      </Route>
    </Routes>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted">This page is coming soon.</p>
    </div>
  );
}

export default App;
