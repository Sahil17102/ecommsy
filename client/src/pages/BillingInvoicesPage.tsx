import { useState } from "react";
import { Modal, Drawer, DatePicker, Tooltip, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { getThemeVarsStyle } from "@/theme";
import {
  Eye,
  FileText,
  Plus,
  FileDown,
  FileSpreadsheet,
  Receipt,
  Package,
  Calendar,
  X,
  IndianRupee,
  Truck,
} from "lucide-react";
import { ResponsiveTable, CopyButton } from "@/components/common";
import type { ResponsiveColumnsType } from "@/components/common";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useBillingInvoices,
  useInvoiceOrders,
  useGenerateInvoice,
} from "@/queries/useBillingInvoice";
import type { BillingInvoice } from "@/lib/billingInvoiceApi";
import { billingInvoiceApi } from "@/lib/billingInvoiceApi";

const PAGE_SIZE = 10;

const invoiceStatusConfig: Record<string, { bg: string; text: string }> = {
  generated: { bg: "bg-blue-500/10", text: "text-blue-500" },
  void: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
};

const orderStatusColors: Record<string, { bg: string; text: string }> = {
  delivered:        { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  shipped:          { bg: "bg-blue-500/10",    text: "text-blue-600" },
  in_transit:       { bg: "bg-sky-500/10",     text: "text-sky-600" },
  out_for_delivery: { bg: "bg-violet-500/10",   text: "text-violet-600" },
  booked:           { bg: "bg-violet-500/10",  text: "text-violet-600" },
  processing:       { bg: "bg-indigo-500/10",  text: "text-indigo-600" },
  pickup_initiated: { bg: "bg-cyan-500/10",    text: "text-cyan-600" },
  ndr:              { bg: "bg-purple-500/10",   text: "text-purple-600" },
  rto_initiated:    { bg: "bg-rose-500/10",    text: "text-rose-600" },
  rto_in_transit:   { bg: "bg-red-500/10",     text: "text-red-500" },
  rto_delivered:    { bg: "bg-red-500/10",     text: "text-red-600" },
  cancelled:        { bg: "bg-zinc-500/10",    text: "text-zinc-500" },
  lost:             { bg: "bg-zinc-500/10",    text: "text-zinc-400" },
  created:          { bg: "bg-slate-500/10",   text: "text-slate-500" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const c = orderStatusColors[status] ?? { bg: "bg-zinc-500/10", text: "text-zinc-500" };
  return (
    <span className={`inline-block whitespace-nowrap capitalize text-[11px] font-medium leading-none px-2 py-1 rounded-md ${c.bg} ${c.text}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Invoice Detail Modal ──

function InvoiceDetailContent({
  invoice,
  orders,
  onClose,
  isMobile,
}: {
  invoice: BillingInvoice;
  orders: Array<{
    id: string;
    orderId: string;
    orderType: string;
    awb: string;
    status: string;
    rate: { freightCharge: number; codCharges: number; otherCharges?: number; totalCharge: number };
    orderDate: string;
  }>;
  onClose: () => void;
  isMobile: boolean;
}) {
  const cfg = invoiceStatusConfig[invoice.status] || invoiceStatusConfig.generated;

  const taxLines: { label: string; amount: number }[] = [
    { label: "Taxable Value", amount: invoice.taxableValue },
    ...(invoice.cgst > 0 ? [{ label: `CGST (${invoice.gstRate / 2}%)`, amount: invoice.cgst }] : []),
    ...(invoice.sgst > 0 ? [{ label: `SGST (${invoice.gstRate / 2}%)`, amount: invoice.sgst }] : []),
    ...(invoice.igst > 0 ? [{ label: `IGST (${invoice.gstRate}%)`, amount: invoice.igst }] : []),
  ];

  const orderColumns: ColumnsType<(typeof orders)[0]> = [
    {
      title: "Order",
      dataIndex: "orderId",
      key: "orderId",
      width: 180,
      render: (v: string) => <span className="text-xs font-medium text-foreground whitespace-nowrap">{v}</span>,
    },
    {
      title: "AWB",
      dataIndex: "awb",
      key: "awb",
      width: 210,
      ellipsis: true,
      render: (v: string) => (
        <span className="inline-flex items-center gap-1">
          <span className="text-xs font-mono text-muted truncate max-w-[160px]">{v}</span>
          <CopyButton text={v} title="Copy AWB" />
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v: string) => <OrderStatusBadge status={v} />,
    },
    {
      title: "Freight",
      key: "freight",
      width: 100,
      align: "right",
      render: (_: unknown, r: (typeof orders)[0]) => (
        <span className="text-xs tabular-nums text-muted">{formatCurrency(r.rate?.freightCharge)}</span>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 100,
      align: "right",
      render: (_: unknown, r: (typeof orders)[0]) => (
        <span className="text-xs tabular-nums font-semibold text-foreground">{formatCurrency(r.rate?.totalCharge)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex-none px-5 pt-5 pb-4 border-b border-border-light">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-foreground truncate">
                {invoice.invoiceNumber}
              </h3>
              <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
                {invoice.status}
              </span>
            </div>
            <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} className="shrink-0 opacity-60" />
                {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package size={12} className="shrink-0 opacity-60" />
                {invoice.orderCount} orders
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Download buttons */}
        {(invoice.pdfUrl || invoice.csvUrl) && (
          <div className="flex items-center gap-2 mt-3">
            {invoice.pdfUrl && (
              <button
                onClick={() => billingInvoiceApi.downloadDoc(invoice.id, "pdf", invoice.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download PDF"))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-light bg-background hover:bg-surface-muted transition-colors text-foreground"
              >
                <FileDown size={13} className="text-red-500" />
                PDF
              </button>
            )}
            {invoice.csvUrl && (
              <button
                onClick={() => billingInvoiceApi.downloadDoc(invoice.id, "csv", invoice.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download CSV"))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-light bg-background hover:bg-surface-muted transition-colors text-foreground"
              >
                <FileSpreadsheet size={13} className="text-emerald-500" />
                CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Billing Summary */}
        <div className="rounded-xl border border-border-light/20 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-light/20 bg-surface-muted/30 flex items-center gap-2">
            <IndianRupee size={13} className="text-muted" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Billing Summary</span>
          </div>
          <div className="divide-y divide-border-light">
            {taxLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted">{line.label}</span>
                <span className="text-sm tabular-nums font-medium text-foreground">{formatCurrency(line.amount)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-primary/5 border-t border-primary/15 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total Amount</span>
            <span className="text-base font-bold tabular-nums text-primary">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>

        {/* Orders */}
        {orders.length > 0 && (
          <div className="rounded-xl border border-border-light/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-light/10 bg-surface-muted/30 flex items-center gap-2">
              <Truck size={13} className="text-muted" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Orders</span>
              <span className="text-[10px] font-medium text-muted bg-surface-muted rounded-full px-2 py-0.5">{orders.length}</span>
            </div>

            {isMobile ? (
              <div className="divide-y divide-border-light/60">
                {orders.map((order) => (
                  <div key={order.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground block">{order.orderId}</span>
                        <span className="inline-flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-mono text-muted truncate max-w-[180px]">{order.awb}</span>
                          <CopyButton text={order.awb} title="Copy AWB" />
                        </span>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Freight: <span className="tabular-nums text-foreground font-medium">{formatCurrency(order.rate?.freightCharge)}</span></span>
                      <span className="font-semibold tabular-nums text-foreground">{formatCurrency(order.rate?.totalCharge)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="themed-table [&_.ant-table]:!border-0 [&_.ant-table-thead_th]:!bg-surface-muted/40 [&_.ant-table-thead_th]:!text-muted [&_.ant-table-thead_th]:!font-medium [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!border-border-light/60">
                <Table
                  columns={orderColumns}
                  dataSource={orders}
                  rowKey="id"
                  size="small"
                  pagination={orders.length > 10 ? { pageSize: 10, size: "small", showTotal: (t) => `${t} orders` } : false}
                  scroll={{ x: 700 }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="flex-none px-5 py-4 border-t border-border-light">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Total Charged</p>
            <p className="text-xl font-bold tabular-nums text-primary mt-0.5">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <Receipt size={28} className="text-primary/20" />
        </div>
        <p className="text-[11px] text-muted mt-1">
          Already deducted from your wallet at order creation
        </p>
      </div>
    </div>
  );
}

function InvoiceDetailModal({
  open,
  onClose,
  invoiceId,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
}) {
  const isMobile = useIsMobile();
  const { mode } = useTheme();
  const themeVars = getThemeVarsStyle(mode);
  const { data, isLoading } = useInvoiceOrders(open ? invoiceId : null);
  const invoice = data?.invoice;
  const orders = data?.orders ?? [];

  const content = invoice ? (
    <InvoiceDetailContent invoice={invoice} orders={orders} onClose={onClose} isMobile={isMobile} />
  ) : null;

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="90vh"
        closable={false}
        styles={{
          body: { padding: 0 },
          content: { ...themeVars, background: "var(--color-bg-elevated)" },
        }}
        loading={isLoading}
        className="rounded-t-2xl"
        rootClassName={mode === "dark" ? "dark-themed-portal" : ""}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={820}
      loading={isLoading}
      styles={{
        body: { padding: 0 },
        content: { ...themeVars, background: "var(--color-bg-elevated)" },
      }}
    >
      {content}
    </Modal>
  );
}

// ── Generate Invoice Modal ──

function GenerateInvoiceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<[any, any] | null>(null);
  const generate = useGenerateInvoice();
  const { mode } = useTheme();
  const themeVars = getThemeVarsStyle(mode);

  function handleSubmit() {
    if (!period) return;
    generate.mutate(
      {
        periodStart: period[0].toISOString(),
        periodEnd: period[1].toISOString(),
      },
      {
        onSuccess: (data) => {
          toast.success(`Invoice ${data.invoice.invoiceNumber} generated`);
          setPeriod(null);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error || "Failed to generate invoice");
        },
      },
    );
  }

  return (
    <Modal
      title="Generate Invoice"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={generate.isPending}
      okText="Generate Invoice"
      okButtonProps={{ disabled: !period }}
      destroyOnClose
      styles={{ content: { ...themeVars, background: "var(--color-bg-elevated)" } }}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Select a date range to generate a receipt for all orders shipped within that period.
        </p>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Start Date <span className="text-red-500">*</span></label>
          <DatePicker
            className="w-full"
            placeholder="Select start date"
            value={period?.[0]}
            onChange={(d) => setPeriod((prev) => [d, prev?.[1] ?? null])}
            disabledDate={(d) => d && d.isAfter(new Date())}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">End Date <span className="text-red-500">*</span></label>
          <DatePicker
            className="w-full"
            placeholder="Select end date"
            value={period?.[1]}
            onChange={(d) => setPeriod((prev) => [prev?.[0] ?? null, d])}
            disabledDate={(d) => d && d.isAfter(new Date())}
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ──

export function BillingInvoicesPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const { data, isLoading } = useBillingInvoices({
    page,
    limit: PAGE_SIZE,
    sortField,
    sortOrder,
  });

  const invoices = data?.invoices ?? [];
  const pagination = data?.pagination;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const columns: ResponsiveColumnsType<BillingInvoice> = [
    {
      title: "Invoice #",
      key: "invoiceNumber",
      width: 160,
      mobileTitle: true,
      render: (_, r) => (
        <button
          type="button"
          onClick={() => setDetailId(r.id)}
          className="text-left group"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {r.invoiceNumber}
          </span>
          <span className="block text-[11px] text-muted mt-0.5">
            {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
          </span>
        </button>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      mobileHidden: true,
      render: (_, r) => (
        <span className="text-sm text-muted">
          {formatDate(r.periodStart)} — {formatDate(r.periodEnd)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => {
        const cfg = invoiceStatusConfig[status] || invoiceStatusConfig.generated;
        return (
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
            {status}
          </span>
        );
      },
    },
    {
      title: "Orders",
      dataIndex: "orderCount",
      key: "orderCount",
      width: 80,
      align: "center",
      mobileHidden: true,
      render: (v: number) => <span className="text-sm tabular-nums text-muted">{v}</span>,
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 130,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: number) => <span className="text-sm font-medium tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "right",
      mobileMenu: (r: BillingInvoice) => [
        ...(r.pdfUrl ? [{ key: "pdf", icon: <FileDown size={14} />, label: "Download PDF", onClick: () => billingInvoiceApi.downloadDoc(r.id, "pdf", r.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download PDF")) }] : []),
        ...(r.csvUrl ? [{ key: "csv", icon: <FileSpreadsheet size={14} />, label: "Download CSV", onClick: () => billingInvoiceApi.downloadDoc(r.id, "csv", r.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download CSV")) }] : []),
        { key: "d1", type: "divider" as const },
        { key: "detail", icon: <Eye size={14} />, label: "View Details", onClick: () => setDetailId(r.id) },
      ],
      render: (_, r) => (
        <div className="flex items-center justify-end gap-0.5">
          {r.pdfUrl && (
            <Tooltip title="Download PDF">
              <button
                onClick={() => billingInvoiceApi.downloadDoc(r.id, "pdf", r.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download PDF"))}
                className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-500"
              >
                <FileDown size={15} />
              </button>
            </Tooltip>
          )}
          {r.csvUrl && (
            <Tooltip title="Download CSV">
              <button
                onClick={() => billingInvoiceApi.downloadDoc(r.id, "csv", r.invoiceNumber).catch((e: Error) => toast.error(e.message || "Failed to download CSV"))}
                className="p-1.5 rounded hover:bg-emerald-500/10 transition-colors text-emerald-400 hover:text-emerald-500"
              >
                <FileSpreadsheet size={15} />
              </button>
            </Tooltip>
          )}
          <Tooltip title="View Details">
            <button
              onClick={() => setDetailId(r.id)}
              className="p-1.5 rounded hover:bg-blue-500/10 transition-colors text-blue-400 hover:text-blue-500"
            >
              <Eye size={15} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Billing Invoices
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Periodic receipts of shipping charges deducted from your wallet
          </p>
        </div>
        {!isMobile && (
          <button
            onClick={() => setGenerateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Generate Invoice
          </button>
        )}
      </div>

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        dataSource={invoices}
        rowKey="id"
        loading={isLoading}
        size="middle"
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            setSortField(sorter.columnKey as string);
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        pagination={
          pagination
            ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (p: number) => setPage(p),
              showTotal: (total: number, range: [number, number]) =>
                `${range[0]}–${range[1]} of ${total}`,
            }
            : false
        }
        scroll={{ x: 800 }}
        locale={{ emptyText: "No invoices yet" }}
      />

      {/* Modals */}
      <InvoiceDetailModal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        invoiceId={detailId}
      />
      <GenerateInvoiceModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
      />
    </div>
  );
}
