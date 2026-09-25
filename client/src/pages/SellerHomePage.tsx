import { motion } from "framer-motion";
import {
  Package,
  Truck,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Plus,
  ShieldCheck,
  Building2,
  Landmark,
  MapPin,
  Tag,
  Calculator,
  BarChart3,
  IndianRupee,
  CheckCircle2,
  CircleDot,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

// ── Skeleton primitives ──
function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-border-light/60 ${className}`} />;
}

function SkeletonStatCard() {
  return (
    <div className="bg-background-elevated rounded-xl border border-border-light overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-border-light/80" />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <Bone className="h-3 w-16" />
          <Bone className="h-3.5 w-3.5 rounded" />
        </div>
        <Bone className="h-6 w-12" />
      </div>
    </div>
  );
}

function SkeletonWalletCard() {
  return (
    <div className="col-span-2 sm:col-span-1 rounded-xl border border-border-light bg-background-elevated overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-border-light/80" />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <Bone className="h-3 w-12" />
          <Bone className="h-3.5 w-3.5 rounded" />
        </div>
        <Bone className="h-6 w-24" />
        <Bone className="h-3 w-16 mt-2" />
      </div>
    </div>
  );
}

function SkeletonAttentionCard() {
  return (
    <div className="bg-background-elevated rounded-xl border border-border-light p-5">
      <Bone className="h-4 w-32 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border-light">
            <Bone className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-2.5 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonQuickActions() {
  return (
    <div className="lg:col-span-2 bg-background-elevated rounded-xl border border-border-light p-5">
      <Bone className="h-4 w-28 mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border-light">
            <Bone className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-2.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonRecentOrders() {
  return (
    <div className="lg:col-span-2 bg-background-elevated rounded-xl border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-4 w-28" />
        <Bone className="h-3 w-16" />
      </div>
      <div className="space-y-0">
        {/* Header row */}
        <div className="flex items-center gap-3 pb-2.5 border-b border-border-light">
          {["w-16", "w-20", "w-14", "w-16", "w-12"].map((w, i) => (
            <Bone key={i} className={`h-3 ${w} ${i === 1 || i === 4 ? "hidden sm:block" : ""} ${i === 4 ? "ml-auto" : ""}`} />
          ))}
        </div>
        {/* Body rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border-light/50 last:border-0">
            <div className="space-y-1">
              <Bone className="h-3 w-28" />
              <Bone className="h-2.5 w-36" />
            </div>
            <Bone className="h-3 w-20 hidden sm:block" />
            <Bone className="h-3 w-16" />
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-3 w-12 ml-auto hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <Bone className="h-6 w-56 mb-1.5" />
        <Bone className="h-4 w-44" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
        <SkeletonWalletCard />
      </div>

      {/* Profile Setup skeleton */}
      <div className="bg-background-elevated rounded-xl border border-border-light p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bone className="w-6 h-6 rounded-full" />
            <Bone className="h-4 w-32" />
          </div>
          <Bone className="h-3 w-8" />
        </div>
        <Bone className="h-1.5 w-full rounded-full mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-light">
              <Bone className="w-5 h-5 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Bone className="h-3 w-16" />
                <Bone className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attention + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonAttentionCard />
        <SkeletonQuickActions />
      </div>

      {/* Recent Orders */}
      <SkeletonRecentOrders />
    </div>
  );
}
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { KycBanner } from "@/components/dashboard/KycBanner";
import { useHome } from "@/queries/useHome";
import { useKyc } from "@/pages/settings/kyc/queries";
import { usePickupAddresses } from "@/pages/settings/pickup-addresses/queries";
import { useBankAccounts } from "@/pages/settings/bank-details/queries";
import { useCompanyProfile } from "@/pages/settings/company-profile/queries";
import { useLabelSettings } from "@/pages/settings/label-configuration/queries";
import { formatCurrency, formatKeyword } from "@/lib/utils";

// ── Status color map ──
const STATUS_COLORS: Record<string, string> = {
  created: "#6B7280",
  processing: "#3B82F6",
  booked: "#3B82F6",
  pickup_initiated: "#8B5CF6",
  shipped: "#6366F1",
  in_transit: "#0EA5E9",
  out_for_delivery: "#F59E0B",
  delivered: "#10B981",
  ndr: "#EF4444",
  rto_initiated: "#F97316",
  rto_in_transit: "#F97316",
  rto_delivered: "#DC2626",
  cancelled: "#9CA3AF",
  lost: "#7C3AED",
};

// ── Quick Actions ──
const quickActions = [
  { label: "Create Order", href: "/orders/create", icon: Plus, description: "Ship a new package", iconColor: "#fff", iconBg: "#6C5CE7" },
  { label: "All Orders", href: "/orders", icon: Truck, description: "View all shipments", iconColor: "#3B82F6", iconBg: "#3B82F614" },
  { label: "NDR Actions", href: "/operations/ndr", icon: RefreshCw, description: "Handle failed deliveries", iconColor: "#EF4444", iconBg: "#EF444414" },
  { label: "COD Remittance", href: "/cod-remittance", icon: IndianRupee, description: "Track COD payouts", iconColor: "#F59E0B", iconBg: "#F59E0B14" },
  { label: "Rate Calculator", href: "/tools", icon: Calculator, description: "Compare courier rates", iconColor: "#10B981", iconBg: "#10B98114" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, description: "Shipping insights", iconColor: "#8B5CF6", iconBg: "#8B5CF614" },
];

// ── Setup Step Interface ──
interface SetupStep {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  isComplete: boolean;
}

// ── Main Home Page ──
export function SellerHomePage() {
  const { user } = useAuth();
  const { data: homeData, isLoading } = useHome();
  const { data: kyc } = useKyc();
  const { data: pickupAddresses } = usePickupAddresses();
  const { data: bankAccounts } = useBankAccounts();
  const { data: companyProfile } = useCompanyProfile();
  const { data: labelSettings } = useLabelSettings();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Setup checklist ──
  const kycVerified = kyc?.status === "approved";
  const hasPickupAddress = Array.isArray(pickupAddresses) && pickupAddresses.length > 0;
  const hasBankAccount = Array.isArray(bankAccounts) && bankAccounts.length > 0;
  const hasCompanyProfile = !!(companyProfile?.businessName && companyProfile?.address && companyProfile?.city);
  const hasLabelSettings = !!labelSettings;

  const setupSteps: SetupStep[] = [
    { key: "kyc", label: "Complete KYC", description: "Verify identity to unlock all features", href: "/settings/kyc", icon: <ShieldCheck className="w-4 h-4" />, isComplete: kycVerified },
    { key: "profile", label: "Company Profile", description: "Add business details", href: "/settings/company-profile", icon: <Building2 className="w-4 h-4" />, isComplete: hasCompanyProfile },
    { key: "bank", label: "Bank Account", description: "Required for COD payouts", href: "/settings/bank-details", icon: <Landmark className="w-4 h-4" />, isComplete: hasBankAccount },
    { key: "address", label: "Pickup Address", description: "Set up warehouse location", href: "/settings/pickup-addresses", icon: <MapPin className="w-4 h-4" />, isComplete: hasPickupAddress },
    { key: "label", label: "Label Config", description: "Customize shipping labels", href: "/settings/label-configuration", icon: <Tag className="w-4 h-4" />, isComplete: hasLabelSettings },
  ];
  const completedSteps = setupSteps.filter((s) => s.isComplete).length;
  const allComplete = completedSteps === setupSteps.length;
  const completionPercent = Math.round((completedSteps / setupSteps.length) * 100);

  const stats = homeData?.quickStats;
  const wallet = homeData?.wallet;
  const recentOrders = homeData?.recentOrders ?? [];
  const statusDistribution = homeData?.statusDistribution ?? [];

  // Prepare chart data for order status distribution
  const statusChartData = statusDistribution
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: formatKeyword(s.status),
      status: s.status,
      count: s.count,
      fill: STATUS_COLORS[s.status] ?? "#6B7280",
    }));

  if (isLoading) return <HomePageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <KycBanner />

      {/* ── Welcome ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-xl font-bold text-foreground">
          {greeting()}, {user?.name ?? user?.firstName ?? "there"}!
        </h2>
        <p className="text-sm text-muted mt-0.5">Here's your daily overview.</p>
      </motion.div>

      {/* ── Row 1: Stat Cards (left-accent style, compact) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Orders Today", value: stats?.ordersToday ?? 0, icon: <Package className="w-3.5 h-3.5" />, color: "#6C5CE7" },
          { label: "In Transit", value: stats?.inTransit ?? 0, icon: <Truck className="w-3.5 h-3.5" />, color: "#3B82F6" },
          { label: "NDR Pending", value: stats?.ndrPending ?? 0, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "#EF4444" },
          { label: "RTO Active", value: stats?.rtoPending ?? 0, icon: <RotateCcw className="w-3.5 h-3.5" />, color: "#F97316" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="relative bg-background-elevated rounded-xl border border-border-light overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: card.color }} />
            <div className="pl-4 pr-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-muted">{card.label}</span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <p className="text-xl font-bold text-foreground leading-none">{card.value}</p>
            </div>
          </motion.div>
        ))}

        {/* Wallet — distinct, clearly clickable */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="col-span-2 sm:col-span-1"
        >
          <Link
            to="/wallet"
            className="group relative block rounded-xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-accent/[0.04] hover:border-primary/35 hover:shadow-sm transition-all no-underline"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary to-accent" />
            <div className="pl-4 pr-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-muted">Wallet</span>
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground leading-none">{formatCurrency(wallet?.balance ?? 0)}</p>
              <span className="inline-flex items-center gap-0.5 mt-1.5 text-[10px] font-semibold text-primary group-hover:gap-1 transition-all">
                <Plus className="w-2.5 h-2.5" /> Recharge
              </span>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* ── Profile Setup (if incomplete) ── */}
      {!allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-background-elevated rounded-xl border border-primary/15 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Complete Your Profile</h3>
            </div>
            <span className="text-xs font-semibold text-primary">{completionPercent}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-border-light mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {setupSteps.map((step) => (
              <Link
                key={step.key}
                to={step.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all no-underline group ${
                  step.isComplete
                    ? "border-success/20 bg-success/[0.04]"
                    : "border-border-light hover:border-primary/20 hover:bg-primary/[0.04]"
                }`}
              >
                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  step.isComplete
                    ? "bg-success text-white"
                    : "border-2 border-border-light text-transparent group-hover:border-primary/30"
                }`}>
                  {step.isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDot className="w-3 h-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${step.isComplete ? "text-muted line-through" : "text-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted truncate">{step.description}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Row 3: Order Status Chart + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-background-elevated rounded-xl border border-border-light p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Orders by Status</h3>
            </div>
            <span className="text-[11px] text-muted">
              {statusChartData.reduce((s, d) => s + d.count, 0)} total
            </span>
          </div>

          {statusChartData.length > 0 ? (
            <div className="space-y-1.5">
              {statusChartData.map((item) => {
                const maxCount = statusChartData[0]?.count ?? 1;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <Link
                    key={item.status}
                    to={item.status === "ndr" ? "/operations/ndr" : item.status.startsWith("rto") ? "/operations/rto" : `/orders?status=${item.status}`}
                    className="flex items-center gap-2.5 group no-underline"
                  >
                    <span className="text-[11px] text-muted w-[90px] text-right truncate shrink-0 group-hover:text-foreground transition-colors">
                      {item.name}
                    </span>
                    <div className="flex-1 h-5 bg-border-light/40 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all group-hover:opacity-80"
                        style={{ width: `${pct}%`, backgroundColor: item.fill, minWidth: 4 }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-foreground w-6 text-right shrink-0">{item.count}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Package className="w-6 h-6 text-muted mb-2" />
              <p className="text-xs text-muted">No orders yet</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 bg-background-elevated rounded-xl border border-border-light p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border-light bg-background hover:border-primary/15 hover:bg-primary/[0.03] transition-all no-underline group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: action.iconBg, color: action.iconColor }}
                >
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{action.label}</p>
                  <p className="text-[11px] text-muted truncate">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Recent Orders ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-background-elevated rounded-xl border border-border-light p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
            <Link to="/orders" className="text-xs text-primary font-medium no-underline hover:underline">
              View all &rarr;
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No orders yet</p>
              <p className="text-xs text-muted max-w-xs mb-4">Create your first order to start shipping.</p>
              <Link
                to="/orders/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors no-underline"
              >
                <Plus className="w-4 h-4" /> Create Order
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left text-xs font-medium text-muted pb-2.5 pr-3">Order</th>
                    <th className="text-left text-xs font-medium text-muted pb-2.5 px-3 hidden sm:table-cell">Customer</th>
                    <th className="text-left text-xs font-medium text-muted pb-2.5 px-3">Courier</th>
                    <th className="text-left text-xs font-medium text-muted pb-2.5 px-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted pb-2.5 pl-3 hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border-light/50 last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link to={`/orders/${order.id}`} className="text-primary font-medium text-xs no-underline hover:underline">
                          {order.orderId}
                        </Link>
                        <p className="text-[10px] text-muted mt-0.5">{order.awb}</p>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <p className="text-xs text-foreground truncate max-w-[120px]">{order.contactName}</p>
                        <p className="text-[10px] text-muted">{order.city}</p>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-foreground">
                        {order.serviceProvider ? formatKeyword(order.serviceProvider) : "Not booked yet"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (STATUS_COLORS[order.status] ?? "#6B7280") + "14",
                            color: STATUS_COLORS[order.status] ?? "#6B7280",
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[order.status] ?? "#6B7280" }} />
                          {formatKeyword(order.status)}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right text-[11px] text-muted hidden sm:table-cell">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
}
