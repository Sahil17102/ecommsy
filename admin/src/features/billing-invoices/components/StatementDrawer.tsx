import { Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Calendar, Receipt, Package, IndianRupee, Truck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CopyButton } from "@/components/common/CopyButton";
import { useInvoiceOrders } from "../queries";

interface Props {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
}

const invoiceStatusConfig: Record<string, { color: string; bg: string }> = {
  generated: { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
  void: { color: "text-zinc-400", bg: "bg-zinc-500/15 border-zinc-500/30" },
};

const orderStatusColors: Record<string, { bg: string; text: string }> = {
  delivered:        { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  shipped:          { bg: "bg-blue-500/15",    text: "text-blue-400" },
  in_transit:       { bg: "bg-sky-500/15",     text: "text-sky-400" },
  out_for_delivery: { bg: "bg-violet-500/15",   text: "text-violet-400" },
  booked:           { bg: "bg-violet-500/15",  text: "text-violet-400" },
  processing:       { bg: "bg-indigo-500/15",  text: "text-indigo-400" },
  pickup_initiated: { bg: "bg-cyan-500/15",    text: "text-cyan-400" },
  ndr:              { bg: "bg-purple-500/15",   text: "text-purple-400" },
  rto_initiated:    { bg: "bg-rose-500/15",    text: "text-rose-400" },
  rto_in_transit:   { bg: "bg-red-500/15",     text: "text-red-400" },
  rto_delivered:    { bg: "bg-red-500/15",     text: "text-red-400" },
  cancelled:        { bg: "bg-zinc-500/15",    text: "text-zinc-400" },
  lost:             { bg: "bg-zinc-500/15",    text: "text-zinc-500" },
  created:          { bg: "bg-slate-500/15",   text: "text-slate-400" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const c = orderStatusColors[status] ?? { bg: "bg-zinc-500/15", text: "text-zinc-400" };
  return (
    <span className={`inline-block whitespace-nowrap capitalize text-[11px] font-medium leading-none px-2 py-1 rounded-md ${c.bg} ${c.text}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function StatementDrawer({ open, onClose, invoiceId }: Props) {
  const { data, isLoading } = useInvoiceOrders(open ? invoiceId : null);
  const invoice = data?.invoice;
  const orders = data?.orders ?? [];
  const sc = invoiceStatusConfig[invoice?.status ?? "generated"];

  type OrderRow = (typeof orders)[0];

  const orderColumns: ColumnsType<OrderRow> = [
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
      width: 220,
      ellipsis: true,
      render: (v: string) => (
        <span className="inline-flex items-center gap-1">
          <span className="text-xs font-mono text-muted truncate max-w-[170px]">{v}</span>
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
      render: (_: unknown, r: OrderRow) => (
        <span className="text-xs tabular-nums text-muted">{formatCurrency(r.rate?.freightCharge)}</span>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 100,
      align: "right",
      render: (_: unknown, r: OrderRow) => (
        <span className="text-xs tabular-nums font-semibold text-foreground">{formatCurrency(r.rate?.totalCharge)}</span>
      ),
    },
  ];

  const taxLines: { label: string; amount: number }[] = invoice
    ? [
        { label: "Taxable Value", amount: invoice.taxableValue },
        ...(invoice.cgst > 0 ? [{ label: `CGST (${invoice.gstRate / 2}%)`, amount: invoice.cgst }] : []),
        ...(invoice.sgst > 0 ? [{ label: `SGST (${invoice.gstRate / 2}%)`, amount: invoice.sgst }] : []),
        ...(invoice.igst > 0 ? [{ label: `IGST (${invoice.gstRate}%)`, amount: invoice.igst }] : []),
      ]
    : [];

  return (
    <Drawer
      title={null}
      open={open}
      onClose={onClose}
      width={800}
      loading={isLoading}
      styles={{
        header: { display: "none" },
        body: { padding: 0 },
      }}
    >
      {invoice && (
        <div className="flex flex-col h-full">
          {/* ── Header ── */}
          <div className="px-6 pt-5 pb-4 border-b border-border-light/10 bg-surface-muted/40">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-1">Invoice Receipt</p>
                <h3 className="text-lg font-semibold text-foreground truncate">{invoice.invoiceNumber}</h3>
              </div>
              <span
                className={`capitalize shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${sc.bg} ${sc.color}`}
              >
                {invoice.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="opacity-60" />
                {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
              </span>
              <span className="flex items-center gap-1.5">
                <Package size={12} className="opacity-60" />
                {invoice.orderCount} orders
              </span>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Billing Summary */}
            <div className="rounded-xl border border-border-light/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border-light/10 bg-surface-muted/30 flex items-center gap-2">
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
                <div className="themed-table [&_.ant-table]:!border-0 [&_.ant-table-thead_th]:!bg-surface-muted/40 [&_.ant-table-thead_th]:!text-muted [&_.ant-table-thead_th]:!font-medium [&_.ant-table-thead_th]:!text-xs [&_.ant-table-thead_th]:!border-border-light/60">
                  <Table
                    columns={orderColumns}
                    dataSource={orders}
                    rowKey="id"
                    size="small"
                    pagination={orders.length > 10 ? { pageSize: 10, size: "small", showTotal: (t) => `${t} orders` } : false}
                    scroll={{ x: 720 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky total footer ── */}
          <div className="px-6 py-4 border-t border-border-light bg-surface-muted/40">
            <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/10">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Total Charged</span>
              </div>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
            <p className="text-[10px] text-muted text-center mt-2">
              Already deducted from seller's wallet at order creation
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
