import { useState } from "react";
import { Link } from "react-router-dom";
import { Input, Tag, Tooltip, Button, Dropdown, message } from "antd";
import {
  FileText,
  Search,
  Plus,
  Eye,
  FileDown,
  FileSpreadsheet,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useBillingInvoices, useVoidInvoice } from "./queries";
import { billingInvoicesApi } from "./api";
import type { BillingInvoiceItem, ListInvoicesParams } from "./types";
import StatementDrawer from "./components/StatementDrawer";
import GenerateInvoiceModal from "./components/GenerateInvoiceModal";

const statusColors: Record<string, string> = {
  generated: "blue",
  void: "default",
};

export default function BillingInvoicesPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    { search: "" as string },
    () => setPage(1),
  );

  const debouncedSearch = useDebounce(filters.applied.search, 400);

  const params: ListInvoicesParams = {
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
    sortField,
    sortOrder,
  };

  const { data, isLoading } = useBillingInvoices(params);
  const invoices = data?.invoices ?? [];
  const pagination = data?.pagination;

  const [statementId, setStatementId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const voidInvoice = useVoidInvoice();

  function handleVoid(id: string) {
    voidInvoice.mutate(id, {
      onSuccess: () => message.success("Invoice voided"),
      onError: (err: any) => message.error(err?.response?.data?.error || "Cannot void invoice"),
    });
  }

  const columns: ResponsiveColumnsType<BillingInvoiceItem> = [
    {
      title: "Invoice #",
      key: "invoiceNumber",
      width: 160,
      render: (_, r) => (
        <button type="button" onClick={() => setStatementId(r.id)} className="text-left group">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.invoiceNumber}</span>
        </button>
      ),
    },
    {
      title: "User",
      key: "user",
      width: 180,
      render: (_, r) => (
        <Link to={`/users-management/${r.userId}`} className="block min-w-0 group" onClick={(e) => e.stopPropagation()}>
          <div className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{r.user?.email || "—"}</div>
          <div className="text-xs text-muted truncate">{r.user?.businessName || ""}</div>
        </Link>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 220,
      mobileHidden: true,
      render: (_, r) => (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-muted/50 text-muted border border-border-light/40">
            {formatDate(r.periodStart)}
          </span>
          <span className="text-muted/50">→</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-muted/50 text-muted border border-border-light/40">
            {formatDate(r.periodEnd)}
          </span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]} bordered={false} className="capitalize">
          {status}
        </Tag>
      ),
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
      render: (v: number) => <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(v)}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "right",
      fixed: "right",
      mobileMenu: (r: BillingInvoiceItem) => [
        ...(r.pdfUrl ? [{ key: "pdf", icon: <FileDown size={14} />, label: "Download PDF", onClick: () => billingInvoicesApi.downloadDoc(r.id, "pdf", r.invoiceNumber).catch((e: Error) => message.error(e.message || "Failed to download PDF")) }] : []),
        ...(r.csvUrl ? [{ key: "csv", icon: <FileSpreadsheet size={14} />, label: "Download CSV", onClick: () => billingInvoicesApi.downloadDoc(r.id, "csv", r.invoiceNumber).catch((e: Error) => message.error(e.message || "Failed to download CSV")) }] : []),
        { key: "d1", type: "divider" as const },
        { key: "view", icon: <Eye size={14} />, label: "View Details", onClick: () => setStatementId(r.id) },
        ...(r.status === "generated"
          ? [{ key: "void", icon: <XCircle size={14} />, label: "Void Invoice", onClick: () => handleVoid(r.id) }]
          : []),
      ],
      render: (_, r) => {
        const menuItems = r.status === "generated"
          ? [{ key: "void", icon: <XCircle size={14} />, label: "Void Invoice", onClick: () => handleVoid(r.id) }]
          : [];

        return (
          <div className="flex items-center justify-end gap-0.5">
            {r.pdfUrl && (
              <Tooltip title="Download PDF">
                <button
                  type="button"
                  onClick={() => billingInvoicesApi.downloadDoc(r.id, "pdf", r.invoiceNumber).catch((e: Error) => message.error(e.message || "Failed to download PDF"))}
                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-500"
                >
                  <FileDown size={14} />
                </button>
              </Tooltip>
            )}
            {r.csvUrl && (
              <Tooltip title="Download CSV">
                <button
                  type="button"
                  onClick={() => billingInvoicesApi.downloadDoc(r.id, "csv", r.invoiceNumber).catch((e: Error) => message.error(e.message || "Failed to download CSV"))}
                  className="p-1.5 rounded hover:bg-emerald-500/10 transition-colors text-emerald-400 hover:text-emerald-500"
                >
                  <FileSpreadsheet size={14} />
                </button>
              </Tooltip>
            )}
            <Tooltip title="View Details">
              <button
                type="button"
                onClick={() => setStatementId(r.id)}
                className="p-1.5 rounded hover:bg-teal-500/10 transition-colors text-teal-400 hover:text-teal-500"
              >
                <Eye size={14} />
              </button>
            </Tooltip>
            {menuItems.length > 0 && (
              <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
                >
                  <MoreVertical size={14} />
                </button>
              </Dropdown>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title="Billing Invoices"
        subtitle="Periodic receipts of charges deducted from seller wallets"
        titleExtra={
          !isMobile ? (
            <Button icon={<Plus size={14} />} onClick={() => setGenerateOpen(true)}>
              Generate Invoice
            </Button>
          ) : undefined
        }
        filters={
          <CollapsibleFilters
            activeCount={0}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "260px",
                render: (
                  <Input
                    placeholder="Invoice #, email, or business..."
                    prefix={<Search size={14} className="text-muted" />}
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    size="middle"
                  />
                ),
              },
            ]}
            extra={
              isMobile ? (
                <Button
                  icon={<Plus size={14} />}
                  onClick={() => setGenerateOpen(true)}
                  size="middle"
                >
                  Generate
                </Button>
              ) : undefined
            }
          />
        }
      />

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
        pagination={{
          current: pagination?.page ?? 1,
          pageSize: pagination?.limit ?? 20,
          total: pagination?.total ?? 0,
          showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
          onChange: (p, ps) => {
            if (ps !== pageSize) {
              setPageSize(ps);
              setPage(1);
            } else {
              setPage(p);
            }
          },
          showSizeChanger: true,
        }}
        scroll={{ x: 1100 }}
        locale={{ emptyText: "No invoices found" }}
      />

      <StatementDrawer
        open={!!statementId}
        onClose={() => setStatementId(null)}
        invoiceId={statementId}
      />

      <GenerateInvoiceModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
      />
    </div>
  );
}
