import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Tag, Tooltip } from "antd";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  ArrowRight,
  Search,
  Package,
  Send,
  Truck,
  CheckCircle2,
  RotateCcw,
  IndianRupee,
  MapPin,
  ClipboardCheck,
  ClipboardList,
  X,
  Eye,
  FileText,
  Receipt,
  Download,
  Loader2,
} from "lucide-react";
import { useOrders, useManifestOrders, useCancelOrder, useBulkManifest, useOrderCourierOptions } from "@/queries/useOrders";
import { usePickupAddresses } from "@/pages/settings/pickup-addresses/queries";
import { formatCurrency, formatKeyword, exportToCsv } from "@/lib/utils";
import { ORDER_STATUS_CONFIG } from "@/lib/ordersConfig";
import type { Order } from "@/lib/ordersTypes";
import type { OrderStats } from "@/lib/ordersApi";
import { ordersApi } from "@/lib/ordersApi";
import { CollapsibleFilters, ResponsiveTable, CopyButton } from "@/components/common";
import type { FilterItem, ResponsiveColumnsType } from "@/components/common";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { PAGE_LABELS, STATUS_OPTIONS, PAYMENT_OPTIONS, canManifest, canCancel, canLabel } from "./config";
import FilterSelect from "./components/FilterSelect";
import ActionButton from "./components/ActionButton";

const PAGE_SIZE = 20;

const STATUS_TAG_COLORS: Record<string, string> = {
  created: "default",
  processing: "processing",
  booked: "blue",
  draft: "purple",
  pickup_initiated: "cyan",
  shipped: "blue",
  in_transit: "blue",
  out_for_delivery: "geekblue",
  delivered: "green",
  cancelled: "default",
  rto_initiated: "purple",
  rto_in_transit: "purple",
  rto_delivered: "red",
  ndr: "volcano",
  lost: "red",
};

interface OrdersPageProps {
  type?: "b2b" | "b2c";
}

// ── Stat Card ──

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background-elevated border border-border-light"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground tabular-nums leading-tight truncate">{value}</p>
        <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Main Page ──

export function OrdersPage({ type }: OrdersPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { title, description, icon } = PAGE_LABELS[type ?? "all"];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  // Redirect NDR/RTO statuses to their dedicated pages
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus === "ndr") {
      navigate("/operations/ndr", { replace: true });
      return;
    }
    if (urlStatus?.startsWith("rto")) {
      navigate("/operations/rto", { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  // Read initial filter values from URL params
  const initialStatus = searchParams.get("status") ?? "";
  const initialPayment = searchParams.get("payment") ?? "";
  const initialSearch = searchParams.get("search") ?? "";

  const filters = useDeferredFilters(
    {
      search: initialSearch,
      status: initialStatus,
      payment: initialPayment,
      courier: "" as string,
      pickup: "" as string,
      startDate: (searchParams.get("startDate") ?? "") as string,
      endDate: (searchParams.get("endDate") ?? "") as string,
    },
    () => setPage(1),
  );

  // Sync filters back to URL (keep URL in sync when filters change)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.applied.status) params.set("status", filters.applied.status);
    if (filters.applied.payment) params.set("payment", filters.applied.payment);
    if (filters.applied.search) params.set("search", filters.applied.search);
    if (filters.applied.startDate) params.set("startDate", filters.applied.startDate);
    if (filters.applied.endDate) params.set("endDate", filters.applied.endDate);
    setSearchParams(params, { replace: true });
  }, [filters.applied.status, filters.applied.payment, filters.applied.search, filters.applied.startDate, filters.applied.endDate, setSearchParams]);

  const debouncedSearch = useDebounce(filters.applied.search, 400);

  const params = {
    search: debouncedSearch || undefined,
    status: filters.applied.status || undefined,
    orderType: type?.toUpperCase() || undefined,
    paymentType: filters.applied.payment || undefined,
    pickupAddressId: filters.applied.pickup || undefined,
    courierId: filters.applied.courier || undefined,
    startDate: filters.applied.startDate || undefined,
    endDate: filters.applied.endDate || undefined,
    page,
    limit: pageSize,
    sortField,
    sortOrder,
  };

  const { data, isLoading, isFetching } = useOrders(params);
  const { data: pickupAddresses = [] } = usePickupAddresses();
  const { data: sellerCouriers = [] } = useOrderCourierOptions(type?.toUpperCase());
  const orders = data?.orders ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  const manifestOrders = useManifestOrders();
  const bulkManifest = useBulkManifest();
  const cancelOrder = useCancelOrder();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkLabelLoading, setBulkLabelLoading] = useState(false);
  const [manifestDocLoading, setManifestDocLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Bulk initiate-pickup: any number of orders (up to a generous safety cap),
  // across any mix of couriers. The server processes each order against its own
  // courier and produces one manifest per courier.
  const BULK_MANIFEST_MAX = 500;
  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedRowKeys.includes(o.id)),
    [orders, selectedRowKeys],
  );
  const manifestableSelected = useMemo(
    () => selectedOrders.filter((o) => canManifest(o)),
    [selectedOrders],
  );
  const selectedProviders = useMemo(
    () => new Set(manifestableSelected.map((o) => o.serviceProvider)),
    [manifestableSelected],
  );
  const canBulkManifest = manifestableSelected.length > 0
    && manifestableSelected.length <= BULK_MANIFEST_MAX;

  // Bulk labels: any selected order with an AWB, merged into one printable PDF.
  const BULK_LABEL_MAX = 300;
  const labellableSelected = useMemo(
    () => selectedOrders.filter((o) => canLabel(o)),
    [selectedOrders],
  );
  const canBulkLabels = labellableSelected.length > 0
    && labellableSelected.length <= BULK_LABEL_MAX;

  // Bulk manifest: the printable hand-off sheet for whatever is selected —
  // every order with an AWB qualifies, whether or not its pickup was already
  // raised (couriers routinely ask for the sheet again at the door). One sheet
  // per courier, all in one PDF. Downloading never raises a pickup and never
  // marks orders manifested — that stays with "Initiate Pickup".
  const manifestableDocSelected = labellableSelected;
  const manifestDocProviders = useMemo(
    () => new Set(manifestableDocSelected.map((o) => o.courierName || formatKeyword(o.serviceProvider))),
    [manifestableDocSelected],
  );
  const canDownloadManifest = manifestableDocSelected.length > 0
    && manifestableDocSelected.length <= BULK_MANIFEST_MAX;

  async function handleBulkManifest() {
    if (!canBulkManifest) return;
    const ids = manifestableSelected.map((o) => o.id);
    try {
      await bulkManifest.mutateAsync(ids);
      setSelectedRowKeys([]);
    } catch {
      // toast handled in hook
    }
  }

  async function handleBulkManifestDownload() {
    if (!canDownloadManifest || manifestDocLoading) return;
    setManifestDocLoading(true);
    try {
      await ordersApi.downloadBulkManifest(manifestableDocSelected.map((o) => o.id));
    } catch (err) {
      toast.error("Failed to download manifest", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setManifestDocLoading(false);
    }
  }

  async function handleBulkLabels() {
    if (!canBulkLabels || bulkLabelLoading) return;
    setBulkLabelLoading(true);
    try {
      await ordersApi.downloadBulkLabels(labellableSelected.map((o) => o.id));
      setSelectedRowKeys([]);
    } catch (err) {
      toast.error("Failed to download labels", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBulkLabelLoading(false);
    }
  }

  // Export all orders matching the active filters (not just the current page).
  // Pages through the API at the max page size and flattens each order into a
  // spreadsheet-friendly row.
  async function handleExportOrders() {
    if (exporting) return;
    setExporting(true);
    try {
      const EXPORT_PAGE_SIZE = 500;
      const EXPORT_HARD_CAP = 20000; // safety bound
      const all: Order[] = [];
      let exportPage = 1;
      // Reuse the active filters; override pagination + drop sort cost.
      const baseParams = { ...params, page: 1, limit: EXPORT_PAGE_SIZE };
      for (;;) {
        const res = await ordersApi.getAll({ ...baseParams, page: exportPage });
        all.push(...res.orders);
        const totalPages = res.pagination?.totalPages ?? 1;
        if (exportPage >= totalPages || res.orders.length === 0 || all.length >= EXPORT_HARD_CAP) break;
        exportPage++;
      }

      if (all.length === 0) {
        toast.info("No orders to export for the current filters");
        return;
      }

      const rows = all.map((o) => ({
        orderId: o.orderId,
        status: o.status,
        type: o.orderType,
        payment: o.paymentType,
        courier: o.courierName || formatKeyword(o.serviceProvider),
        awb: o.awb || "",
        customer: o.deliveryAddress?.contactName || "",
        phone: o.deliveryAddress?.phone || "",
        city: o.deliveryAddress?.city || "",
        state: o.deliveryAddress?.state || "",
        pincode: o.deliveryAddress?.pincode || "",
        // Stored in grams — convert so the "(kg)" column headers are honest.
        weightKg: o.weight != null ? (o.weight / 1000).toFixed(3) : "",
        chargeableWeightKg: o.chargeableWeight != null ? (o.chargeableWeight / 1000).toFixed(3) : "",
        orderAmount: o.orderAmount ?? "",
        codAmount: o.codAmount ?? "",
        freightCharge: o.rate?.freightCharge ?? "",
        totalCharge: o.rate?.totalCharge ?? "",
        createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
      }));

      const stamp = new Date().toISOString().slice(0, 10);
      exportToCsv(rows, `orders-${type ?? "all"}-${stamp}`, [
        { key: "orderId", label: "Order ID" },
        { key: "status", label: "Status" },
        { key: "type", label: "Type" },
        { key: "payment", label: "Payment" },
        { key: "courier", label: "Courier" },
        { key: "awb", label: "AWB" },
        { key: "customer", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "pincode", label: "Pincode" },
        { key: "weightKg", label: "Weight (kg)" },
        { key: "chargeableWeightKg", label: "Chargeable Weight (kg)" },
        { key: "orderAmount", label: "Order Amount" },
        { key: "codAmount", label: "COD Amount" },
        { key: "freightCharge", label: "Freight Charge" },
        { key: "totalCharge", label: "Total Charge" },
        { key: "createdAt", label: "Created At" },
      ]);
      toast.success(`Exported ${all.length} order${all.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  // Courier options come from the couriers this seller has actually shipped
  // with (server-side), not from the orders on screen — deriving them from the
  // current page meant the dropdown changed every time you paged.
  const courierOptions = useMemo(
    () => [
      { value: "", label: "All Couriers" },
      ...sellerCouriers.map((c) => ({ value: c.id, label: c.name })),
    ],
    [sellerCouriers],
  );

  // Pickup-address filter options (server-side filter)
  const pickupOptions = useMemo(
    () => [
      { value: "", label: "All Pickup Locations" },
      ...pickupAddresses.map((a) => ({
        value: a.id,
        label: a.nickname || [a.city, a.state].filter(Boolean).join(", ") || a.contactName || a.id,
      })),
    ],
    [pickupAddresses],
  );

  const activeFilterCount = [
    filters.applied.status,
    filters.applied.payment,
    filters.applied.courier,
    filters.applied.pickup,
    filters.applied.startDate || filters.applied.endDate,
  ].filter(Boolean).length + (filters.applied.search ? 1 : 0);


  // ── Filters ──

  const primaryFilters: FilterItem[] = [
    {
      key: "search",
      label: "Search",
      width: "240px",
      render: (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary" />
          <input
            type="text"
            placeholder="Order ID, AWB, customer..."
            value={filters.draft.search}
            onChange={(e) => filters.setFilter("search", e.target.value)}
            className="w-full h-[34px] pl-8 pr-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "160px",
      render: <FilterSelect value={filters.draft.status} onChange={(v) => filters.setFilter("status", v)} options={STATUS_OPTIONS} />,
    },
    {
      key: "pickup",
      label: "Pickup Location",
      width: "200px",
      render: <FilterSelect value={filters.draft.pickup} onChange={(v) => filters.setFilter("pickup", v)} options={pickupOptions} />,
    },

  ];

  const secondaryFilters: FilterItem[] = [
    {
      key: "courier",
      label: "Courier",
      width: "160px",
      render: <FilterSelect value={filters.draft.courier} onChange={(v) => filters.setFilter("courier", v)} options={courierOptions} />,
    },
    {
      key: "payment",
      label: "Payment",
      width: "140px",
      render: <FilterSelect value={filters.draft.payment} onChange={(v) => filters.setFilter("payment", v)} options={PAYMENT_OPTIONS} />,
    },
    {
      key: "startDate",
      label: "From Date",
      width: "150px",
      render: (
        <input
          type="date"
          value={filters.draft.startDate}
          max={filters.draft.endDate || undefined}
          onChange={(e) => filters.setFilter("startDate", e.target.value)}
          className="w-full h-[34px] px-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      ),
    },
    {
      key: "endDate",
      label: "To Date",
      width: "150px",
      render: (
        <input
          type="date"
          value={filters.draft.endDate}
          min={filters.draft.startDate || undefined}
          onChange={(e) => filters.setFilter("endDate", e.target.value)}
          className="w-full h-[34px] px-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      ),
    },

  ];

  // ── Stats ──

  function buildStats(s: OrderStats) {
    const inTransit = s.shipped + s.in_transit + s.out_for_delivery;
    const rto = s.rto_initiated + s.rto_in_transit + s.rto_delivered;
    return [
      { icon: Package, label: "Total", value: s.total, color: "bg-violet-500/10 text-violet-500" },
      { icon: Truck, label: "In Transit", value: inTransit, color: "bg-blue-500/10 text-blue-500" },
      { icon: CheckCircle2, label: "Delivered", value: s.delivered, color: "bg-emerald-500/10 text-emerald-500" },
      { icon: RotateCcw, label: "RTO", value: rto, color: "bg-purple-500/10 text-purple-500" },
      { icon: IndianRupee, label: "Revenue", value: formatCurrency(s.totalRevenue), color: "bg-violet-500/10 text-violet-600" },
    ];
  }

  // ── Download helpers ──

  async function handleDownload(kind: "label" | "invoice" | "manifest", order: Order) {
    try {
      if (kind === "label") await ordersApi.downloadLabel(order.id, order.awb);
      else if (kind === "manifest") await ordersApi.downloadManifest(order.id, order.orderId);
      else await ordersApi.downloadInvoice(order.id, order.orderId);
    } catch (err) {
      toast.error(`Failed to download ${kind}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  /**
   * Guards the mobile three-dot menu the same way ActionButton guards the
   * desktop row: antd closes the dropdown on click but nothing stops the user
   * reopening it and firing the same mutation again while the first is still
   * in flight. Keyed by `${orderId}:${action}`.
   */
  const inFlightActions = useRef(new Set<string>());
  async function runOnce(key: string, fn: () => Promise<unknown>) {
    if (inFlightActions.current.has(key)) return;
    inFlightActions.current.add(key);
    try {
      await fn();
    } catch {
      // Mutation hooks and handleDownload surface their own errors.
    } finally {
      inFlightActions.current.delete(key);
    }
  }

  // ── Table columns ──

  const columns: ResponsiveColumnsType<Order> = [
    {
      title: "Order",
      key: "order",
      width: 180,
      mobileTitle: true,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, r) => {
        const date = new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        return (
          <div className="min-w-0">
            <Link to={`/orders/${r.id}`} className="text-sm font-medium text-primary hover:text-primary/80 block truncate no-underline">
              {r.orderId}
            </Link>
            <span className="text-xs text-muted block mt-0.5">{date}</span>
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, r) => {
        const cfg = ORDER_STATUS_CONFIG[r.status];
        return (
          <Tag color={STATUS_TAG_COLORS[r.status] ?? "default"} bordered={false}>
            {cfg?.label ?? r.status}
          </Tag>
        );
      },
    },
    {
      title: "Payment",
      key: "payment",
      width: 90,
      render: (_, r) => (
        <Tag bordered={false} color={r.paymentType === "cod" ? "orange" : "green"}>
          {r.paymentType.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Destination",
      key: "destination",
      width: 150,
      render: (_, r) => (
        <span className="text-xs text-muted flex items-center gap-1.5">
          <MapPin size={13} className="text-muted shrink-0" />
          <span className="truncate">{r.deliveryAddress.city}, {r.deliveryAddress.state}</span>
        </span>
      ),
    },
    {
      title: "Courier",
      key: "courier",
      width: 170,
      // Courier names run long ("Delhivery Surface International & Domestic"),
      // and an antd Tag never wraps or shrinks — it just bleeds over the next
      // column. Clamp the tag itself and keep the full name in a tooltip.
      render: (_, r) => {
        const name = r.courierName || formatKeyword(r.serviceProvider);
        return (
          <Tooltip title={name}>
            <Tag bordered={false} className="max-w-full !mr-0 align-middle">
              <span className="block truncate">{name}</span>
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "AWB",
      key: "awb",
      width: 160,
      render: (_, r) =>
        r.awb ? (
          // `min-w-0` is what actually lets the AWB truncate — without it the
          // flex item keeps its full intrinsic width and overlaps Amount.
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-mono text-foreground truncate">{r.awb}</span>
            <CopyButton text={r.awb} title="Copy AWB" />
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 100,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, r) => (
        <span className="text-sm font-medium text-foreground tabular-nums">
          {formatCurrency(r.rate?.totalCharge)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      // Wide enough for the worst case: "Initiate Pickup" + "Cancel" + the
      // label / invoice / manifest icon buttons side by side, without the fixed
      // column clipping them.
      width: 300,
      align: "right",
      fixed: "right",
      mobileMenu: (r: Order) => {
        const items: any[] = [
          {
            key: "view",
            icon: <Eye size={14} />,
            label: "View Details",
            onClick: () => navigate(`/orders/${r.id}`),
          },
          { key: "d1", type: "divider" as const },
          {
            key: "label",
            icon: <FileText size={14} />,
            label: "Download Label",
            onClick: () => runOnce(`${r.id}:label`, () => handleDownload("label", r)),
          },
          {
            key: "invoice",
            icon: <Receipt size={14} />,
            label: "Download Invoice",
            onClick: () => runOnce(`${r.id}:invoice`, () => handleDownload("invoice", r)),
          },
        ];
        if (r.status === "draft") {
          items.splice(1, 0, {
            key: "ship-draft",
            icon: <Send size={14} />,
            label: "Ship Draft",
            onClick: () => navigate(`/orders/create?draftId=${r.id}`),
          });
        }
        // Manifest needs an AWB to list, but not a pickup — couriers ask for the
        // sheet again at the door, so it stays available after pickup too.
        if (canLabel(r)) {
          items.push({
            key: "manifest-doc",
            icon: <ClipboardList size={14} />,
            label: "Download Manifest",
            onClick: () => runOnce(`${r.id}:manifest-doc`, () => handleDownload("manifest", r)),
          });
        }
        if (canManifest(r)) {
          items.splice(1, 0, {
            key: "manifest",
            icon: <ClipboardCheck size={14} />,
            label: "Initiate Pickup",
            onClick: () => runOnce(`${r.id}:manifest`, () => manifestOrders.mutateAsync([r.id])),
          });
        }
        if (canCancel(r)) {
          items.splice(canManifest(r) ? 2 : 1, 0, {
            key: "cancel",
            icon: <X size={14} />,
            label: "Cancel Order",
            danger: true,
            onClick: () => runOnce(`${r.id}:cancel`, () => cancelOrder.mutateAsync({ id: r.id })),
          });
        }
        return items;
      },
      // Every button here fires a mutation or a download, so each one owns its
      // in-flight state (see ActionButton) — otherwise a row can be manifested
      // or cancelled several times over by repeated clicks.
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status === "draft" && (
            <ActionButton
              label="Ship Draft"
              icon={<Send size={13} />}
              variant="primary"
              size="xs"
              onClick={() => {
                navigate(`/orders/create?draftId=${r.id}`);
                return Promise.resolve();
              }}
            />
          )}
          {canManifest(r) && (
            <ActionButton
              label="Initiate Pickup"
              icon={<ClipboardCheck size={13} />}
              variant="primary"
              size="xs"
              onClick={() => manifestOrders.mutateAsync([r.id]).then(() => undefined)}
            />
          )}
          {canCancel(r) && (
            <ActionButton
              label="Cancel"
              icon={<X size={13} />}
              variant="danger"
              size="xs"
              onClick={() => cancelOrder.mutateAsync({ id: r.id }).then(() => undefined)}
            />
          )}
          <Tooltip title="Download Label">
            <span>
              <ActionButton
                icon={<FileText size={14} />}
                variant="ghost"
                size="icon"
                onClick={() => handleDownload("label", r)}
              />
            </span>
          </Tooltip>
          <Tooltip title="Download Invoice">
            <span>
              <ActionButton
                icon={<Receipt size={14} />}
                variant="ghost"
                size="icon"
                onClick={() => handleDownload("invoice", r)}
              />
            </span>
          </Tooltip>
          {canLabel(r) && (
            <Tooltip title="Download Manifest">
              <span>
                <ActionButton
                  icon={<ClipboardList size={14} />}
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload("manifest", r)}
                />
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  // ── Empty States ──

  if (!isLoading && stats?.total === 0) {
    return (
      <motion.div
        key={type ?? "all"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            <p className="text-xs text-muted mt-0.5">{description}</p>
          </div>
        </div>
        <div className="bg-background-elevated rounded-2xl border border-border-light p-12 sm:p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            {icon}
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">
            No {type ? `${type.toUpperCase()} ` : ""}orders yet
          </h2>
          <p className="text-sm text-muted max-w-sm mb-6">
            Once you create your first shipping order, it will appear here.
          </p>
          <Link
            to="/orders/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary border-2 border-primary/20 hover:bg-primary/[0.04] transition-colors no-underline"
          >
            Create your first order
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={type ?? "all"}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportOrders}
            disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-foreground border border-border-light hover:bg-surface-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting…" : "Export"}
          </button>
          {(type === "b2c" || type === "b2b") && (
            <Link
              to={`/orders/${type}/bulk-upload`}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-foreground border border-border-light hover:bg-surface-muted transition-colors no-underline"
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </Link>
          )}
          <Link
            to="/orders/create"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover shadow-sm hover:shadow-md transition-shadow no-underline flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      </div>

      {/* Selection action bar */}
      {selectedRowKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl bg-primary/[0.04] border border-primary/20 text-xs">
          <span className="font-medium text-foreground">
            {selectedRowKeys.length} selected
          </span>
          {manifestableSelected.length > 0 && (
            <>
              <span className="text-muted">
                · {manifestableSelected.length} manifestable
              </span>
              {selectedProviders.size > 1 && (
                <span className="text-muted">
                  · {selectedProviders.size} couriers ({[...selectedProviders].map(formatKeyword).join(", ")}) — one manifest per courier
                </span>
              )}
              {manifestableSelected.length > BULK_MANIFEST_MAX && (
                <span className="text-violet-600">
                  · max {BULK_MANIFEST_MAX} per request
                </span>
              )}
            </>
          )}
          {labellableSelected.length > 0 && (
            <span className="text-muted">
              · {labellableSelected.length} printable
              {labellableSelected.length > BULK_LABEL_MAX && (
                <span className="text-violet-600"> · max {BULK_LABEL_MAX} labels at once</span>
              )}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSelectedRowKeys([])}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear
            </button>
            <Tooltip
              title={
                labellableSelected.length === 0
                  ? "Select orders that already have an AWB"
                  : labellableSelected.length > BULK_LABEL_MAX
                    ? `Select at most ${BULK_LABEL_MAX}`
                    : ""
              }
            >
              <button
                onClick={handleBulkLabels}
                disabled={!canBulkLabels || bulkLabelLoading}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border-light text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
              >
                {bulkLabelLoading ? "Preparing…" : `Download Labels ${labellableSelected.length || ""}`}
              </button>
            </Tooltip>
            <Tooltip
              title={
                !canDownloadManifest
                  ? manifestableDocSelected.length > BULK_MANIFEST_MAX
                    ? `Select at most ${BULK_MANIFEST_MAX} orders per manifest`
                    : "Select orders that already have an AWB"
                  : manifestDocProviders.size > 1
                    ? `One sheet per courier (${manifestDocProviders.size}) in a single PDF`
                    : ""
              }
            >
              <button
                onClick={handleBulkManifestDownload}
                disabled={!canDownloadManifest || manifestDocLoading}
                className="px-3 py-1.5 rounded-md text-xs font-semibold border border-border-light text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-muted transition-colors"
              >
                {manifestDocLoading ? "Preparing…" : `Download Manifest ${manifestableDocSelected.length || ""}`}
              </button>
            </Tooltip>
            <Tooltip
              title={
                !canBulkManifest
                  ? manifestableSelected.length > BULK_MANIFEST_MAX
                    ? `Select at most ${BULK_MANIFEST_MAX} orders per request`
                    : "Select orders that are ready for pickup"
                  : ""
              }
            >
              <button
                onClick={handleBulkManifest}
                disabled={!canBulkManifest || bulkManifest.isPending}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {bulkManifest.isPending ? "Initiating…" : `Initiate Pickup ${manifestableSelected.length || ""}`}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {buildStats(stats).map((s, i) => (
            <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} index={i} />
          ))}
        </div>
      )}

      {/* Filters */}
      <CollapsibleFilters
        primary={primaryFilters}
        secondary={secondaryFilters}
        activeCount={activeFilterCount}
        onApply={filters.apply}
        onClearAll={filters.clearAll}
        extra={
          pagination ? (
            <span className="text-[11px] font-medium text-muted tabular-nums">
              {pagination.total} order{pagination.total !== 1 ? "s" : ""}
            </span>
          ) : null
        }
      />

      {/* Table */}

      <ResponsiveTable
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isFetching}
        size="small"
        rowSelection={
          type === "b2c"
            ? {
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (r: Order) => ({ disabled: !canManifest(r) && !canLabel(r) && !selectedRowKeys.includes(r.id) }),
            }
            : undefined
        }
        onChange={(_pagination, _filters, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            const fieldMap: Record<string, string> = { order: "createdAt", amount: "rate.totalCharge" };
            setSortField(fieldMap[sorter.columnKey as string] ?? "createdAt");
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
        pagination={
          pagination
            ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (p: number, size: number) => {
                if (size !== pageSize) {
                  setPageSize(size);
                  setPage(1);
                } else {
                  setPage(p);
                }
              },
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100", "500"],
              showTotal: (total: number, range: [number, number]) =>
                `${range[0]}–${range[1]} of ${total}`,
            }
            : false
        }
        // Must be >= the sum of the column widths (1230 + the selection column).
        // When it's smaller antd squeezes the columns below their declared width
        // and header/body drift out of alignment.
        scroll={{ x: 1300 }}
        locale={{ emptyText: "No matching orders" }}
      />
    </motion.div>
  );
}
