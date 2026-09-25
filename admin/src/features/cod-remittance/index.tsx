import { useState } from "react";
import { Input, InputNumber, Select, Tag, Tooltip, DatePicker, Popover, Dropdown, message } from "antd";
import {
  Banknote,
  IndianRupee,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Upload,
  Download,
  Zap,
  CreditCard,
  StickyNote,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router-dom";

import PageHeader from "@/components/common/PageHeader";
import { useIsMobile } from "@/hooks/useIsMobile";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCodRemittanceStats, useCodRemittances, useAutoCredit } from "./queries";
import { codRemittanceApi } from "./api";
import type { CodRemittanceItem, ListRemittancesParams } from "./types";
import CreditModal from "./components/CreditModal";
import NotesModal from "./components/NotesModal";
import SettlementCsvModal from "./components/SettlementCsvModal";

export default function CodRemittancePage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    {
      search: "" as string,
      status: undefined as string | undefined,
      dateFrom: undefined as string | undefined,
      dateTo: undefined as string | undefined,
    },
    () => setPage(1),
  );

  const debouncedSearch = useDebounce(filters.applied.search, 400);

  const params: ListRemittancesParams = {
    search: debouncedSearch || undefined,
    status: filters.applied.status,
    dateFrom: filters.applied.dateFrom,
    dateTo: filters.applied.dateTo,
    page,
    limit: pageSize,
    sortField,
    sortOrder,
  };

  const { data: statsData } = useCodRemittanceStats();
  const { data, isLoading } = useCodRemittances(params);
  const autoCredit = useAutoCredit();

  const remittances = data?.remittances ?? [];
  const pagination = data?.pagination;

  // Auto-credit state
  const [autoCreditDays, setAutoCreditDays] = useState(30);
  const [autoCreditOpen, setAutoCreditOpen] = useState(false);

  // Modal states
  const [creditTarget, setCreditTarget] = useState<CodRemittanceItem | null>(null);
  const [notesTarget, setNotesTarget] = useState<CodRemittanceItem | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  function handleAutoCredit() {
    autoCredit.mutate(autoCreditDays, {
      onSuccess: (data) => {
        message.success(data.message);
        setAutoCreditOpen(false);
      },
      onError: () => message.error("Auto-credit failed"),
    });
  }

  function handleExport() {
    codRemittanceApi.export({
      status: filters.applied.status,
      dateFrom: filters.applied.dateFrom,
      dateTo: filters.applied.dateTo,
    });
  }

  const columns: ResponsiveColumnsType<CodRemittanceItem> = [
    {
      title: "Order",
      key: "order",
      width: 160,
      render: (_, r) => (
        <Link to={`/orders/${r.orderId}`} className="block group">
          <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.orderNumber}</div>
          <Tooltip title={r.awbNumber}>
            <div className="text-xs text-muted truncate max-w-[140px]">AWB: {r.awbNumber}</div>
          </Tooltip>
        </Link>
      ),
    },
    {
      title: "User",
      key: "user",
      width: 180,
      render: (_, r) => (
        <Link to={`/users-management/${r.userId}`} className="block min-w-0 group" onClick={(e) => e.stopPropagation()}>
          <div className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{r.user?.email || "—"}</div>
          <div className="text-xs text-muted truncate">{r.user?.name || r.user?.businessName || ""}</div>
        </Link>
      ),
    },
    {
      title: "Courier",
      dataIndex: "courierPartner",
      key: "courier",
      width: 110,
      mobileHidden: true,
      render: (v: string) => <Tag bordered={false} className="capitalize">{v}</Tag>,
    },
    {
      title: "COD Amount",
      dataIndex: "codAmount",
      key: "codAmount",
      width: 150,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: number) => <span className="text-sm tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      title: "Remittable",
      dataIndex: "remittableAmount",
      key: "remittable",
      width: 120,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: number) => <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(v)}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag
          color={status === "credited" ? "green" : "purple"}
          bordered={false}
          className="capitalize"
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Collected",
      dataIndex: "collectedAt",
      key: "collected",
      width: 120,
      mobileHidden: true,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: string) => <span className="text-xs text-muted">{formatDate(v)}</span>,
    },
    {
      title: "Credited",
      dataIndex: "creditedAt",
      key: "credited",
      width: 110,
      mobileHidden: true,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: string | undefined) => (
        <span className="text-xs text-muted">{v ? formatDate(v) : "—"}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      align: "right",
      fixed: "right",
      mobileMenu: (_: CodRemittanceItem, __: number) => {
        const r = _ as CodRemittanceItem;
        return [
          ...(r.status === "pending"
            ? [{
                key: "credit",
                icon: <CreditCard size={14} />,
                label: "Credit to Wallet",
                onClick: () => setCreditTarget(r),
              }]
            : []),
          {
            key: "notes",
            icon: <StickyNote size={14} />,
            label: r.notes ? "Edit Notes" : "Add Notes",
            onClick: () => setNotesTarget(r),
          },
        ];
      },
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "pending" && (
            <Tooltip title="Credit">
              <button
                type="button"
                onClick={() => setCreditTarget(r)}
                className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-emerald-600"
              >
                <CreditCard size={15} />
              </button>
            </Tooltip>
          )}
          <Tooltip title={r.notes ? `Notes: ${r.notes}` : "Add notes"}>
            <button
              type="button"
              onClick={() => setNotesTarget(r)}
              className={`p-1.5 rounded hover:bg-background transition-colors ${r.notes ? "text-violet-500" : "text-muted hover:text-foreground"}`}
            >
              <StickyNote size={15} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Banknote}
        title="COD Remittance"
        subtitle="Track and process COD settlements"
        stats={
          statsData
            ? [
                {
                  icon: Clock,
                  iconColor: "text-purple-500",
                  value: statsData.totalPending,
                  label: "pending (₹)",
                },
                {
                  icon: CheckCircle2,
                  iconColor: "text-emerald-500",
                  value: statsData.todayCredited,
                  label: "today credited (₹)",
                },
                {
                  icon: IndianRupee,
                  iconColor: "text-blue-500",
                  value: statsData.totalCredited,
                  label: "total credited (₹)",
                },
                {
                  icon: Users,
                  iconColor: "text-purple-500",
                  value: statsData.usersWithPending,
                  label: "users pending",
                },
              ]
            : undefined
        }
        filtersExtra={
          !isMobile ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCsvModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-light text-muted hover:text-foreground hover:border-foreground/20 bg-background-elevated transition-colors"
              >
                <Upload size={13} />
                Upload CSV
              </button>
              <Popover
                open={autoCreditOpen}
                onOpenChange={setAutoCreditOpen}
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="w-56 space-y-3">
                    <p className="text-xs text-muted">
                      Credit all pending remittances older than:
                    </p>
                    <div className="flex items-center gap-2">
                      <InputNumber
                        min={1}
                        max={365}
                        value={autoCreditDays}
                        onChange={(v) => v && setAutoCreditDays(v)}
                        size="small"
                        className="w-20"
                      />
                      <span className="text-sm text-foreground">days</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAutoCreditOpen(false)}
                        className="px-2.5 py-1 text-xs rounded border border-border-light text-muted hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAutoCredit}
                        disabled={autoCredit.isPending}
                        className="px-2.5 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {autoCredit.isPending ? "Processing…" : "Credit Now"}
                      </button>
                    </div>
                  </div>
                }
              >
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-light text-muted hover:text-foreground hover:border-foreground/20 bg-background-elevated transition-colors"
                >
                  <Zap size={13} />
                  Auto-Credit
                </button>
              </Popover>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-light text-muted hover:text-foreground hover:border-foreground/20 bg-background-elevated transition-colors"
              >
                <Download size={13} />
                Export
              </button>
            </div>
          ) : undefined
        }
        filters={
          <CollapsibleFilters
            activeCount={
              [filters.draft.status, filters.draft.dateFrom, filters.draft.dateTo].filter(Boolean)
                .length
            }
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "260px",
                render: (
                  <Input
                    placeholder="Order, AWB, or email..."
                    prefix={<Search size={14} className="text-muted" />}
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    size="middle"
                  />
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "140px",
                render: (
                  <Select
                    allowClear
                    placeholder="All"
                    value={filters.draft.status}
                    onChange={(v) => filters.setFilter("status", v || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Pending", value: "pending" },
                      { label: "Credited", value: "credited" },
                    ]}
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "dateFrom",
                label: "From Date",
                width: "180px",
                render: (
                  <DatePicker
                    className="w-full"
                    placeholder="From date"
                    onChange={(d) => filters.setFilter("dateFrom", d?.toISOString())}
                    size="middle"
                  />
                ),
              },
              {
                key: "dateTo",
                label: "To Date",
                width: "180px",
                render: (
                  <DatePicker
                    className="w-full"
                    placeholder="To date"
                    onChange={(d) => filters.setFilter("dateTo", d?.toISOString())}
                    size="middle"
                  />
                ),
              },
            ]}
            extra={
              isMobile ? (
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: "csv",
                        icon: <Upload size={14} />,
                        label: "Upload CSV",
                        onClick: () => setCsvModalOpen(true),
                      },
                      {
                        key: "auto",
                        icon: <Zap size={14} />,
                        label: "Auto-Credit",
                        onClick: handleAutoCredit,
                      },
                      {
                        key: "export",
                        icon: <Download size={14} />,
                        label: "Export",
                        onClick: handleExport,
                      },
                    ],
                  }}
                  trigger={["click"]}
                >
                  <button className="p-2 rounded-lg border border-border-light text-muted hover:text-foreground hover:border-foreground/20 bg-background-elevated transition-colors">
                    <MoreVertical size={14} />
                  </button>
                </Dropdown>
              ) : undefined
            }
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={remittances}
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
        scroll={{ x: 1200 }}
        locale={{ emptyText: "No remittances found" }}
      />

      <CreditModal
        open={!!creditTarget}
        onClose={() => setCreditTarget(null)}
        remittance={creditTarget}
      />

      <NotesModal
        open={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        remittance={notesTarget}
      />

      <SettlementCsvModal open={csvModalOpen} onClose={() => setCsvModalOpen(false)} />
    </div>
  );
}
