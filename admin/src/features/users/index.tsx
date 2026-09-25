import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tag, Input, Select, Switch, Popconfirm, Tooltip, message } from "antd";
import {
  Users,
  Search,
  Mail,
  Phone,
  Clock,
  Eye,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  ShieldAlert,
  UserX,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { formatDate, timeAgo } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { DEFAULT_PAGE_SIZE, PLAN_COLORS } from "@/lib/config";
import { useUsers, useToggleUserActive } from "./queries";
import type { UserListItem } from "./types";

// ── Tab definitions ──

type TabKey = "all" | "verified" | "pending_kyc" | "kyc_not_started" | "not_onboarded" | "inactive";

interface TabDef {
  key: TabKey;
  label: string;
  /** Server-side filter overrides applied when this tab is active */
  filters: Record<string, string | undefined>;
}

const TABS: TabDef[] = [
  { key: "all", label: "All Users", filters: {} },
  { key: "verified", label: "Verified", filters: { kycStatus: "approved" } },
  { key: "pending_kyc", label: "Pending KYC", filters: { kycStatus: "pending" } },
  { key: "kyc_not_started", label: "KYC Not Started", filters: { kycStatus: "not_submitted" } },
  { key: "not_onboarded", label: "Not Onboarded", filters: { onboardingComplete: "false", kycStatus: "not_submitted" } },
  { key: "inactive", label: "Inactive", filters: { isActive: "false" } },
];

// ── KYC status tag colors ──
const KYC_TAG: Record<string, { color: string; label: string }> = {
  not_submitted: { color: "default", label: "KYC Not Started" },
  pending: { color: "purple", label: "KYC Pending" },
  approved: { color: "green", label: "KYC Verified" },
  rejected: { color: "red", label: "KYC Rejected" },
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>(
    () => (TABS.some((t) => t.key === searchParams.get("tab")) ? (searchParams.get("tab") as TabKey) : "all"),
  );
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    { search: "" as string, status: undefined as string | undefined, isActive: undefined as string | undefined, plan: undefined as string | undefined },
    () => setPage(1),
  );
  const debouncedSearch = useDebounce(filters.applied.search);

  // Map combined status filter to individual params
  const filterParams = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (filters.applied.status === "onboarded") params.onboardingComplete = "true";
    else if (filters.applied.status === "pending") params.onboardingComplete = "false";
    return params;
  }, [filters.applied.status]);

  // Merge tab-level filters with user-selected filters
  const currentTabDef = TABS.find((t) => t.key === activeTab)!;
  const mergedFilters = useMemo(() => {
    const base: Record<string, string | undefined> = {
      ...filterParams,
      isActive: filters.applied.isActive,
      plan: filters.applied.plan,
    };
    // Tab filters override collapsible filter equivalents
    return { ...base, ...currentTabDef.filters };
  }, [filterParams, filters.applied.isActive, filters.applied.plan, currentTabDef]);

  const { data, isLoading } = useUsers({
    search: debouncedSearch || undefined,
    ...mergedFilters,
    page,
    limit: DEFAULT_PAGE_SIZE,
    sortField,
    sortOrder,
  });

  const toggleActive = useToggleUserActive();

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  function handleToggleActive(user: UserListItem) {
    const action = user.isActive ? "deactivate" : "activate";
    toggleActive.mutate(user.id, {
      onSuccess: () => message.success(`User ${action}d`),
    });
  }

  function handleTabChange(key: string) {
    setActiveTab(key as TabKey);
    setPage(1);
  }

  const columns: ResponsiveColumnsType<UserListItem> = [
    {
      title: "User",
      key: "user",
      width: 220,
      render: (_, record) => {
        const displayName =
          record.name || [record.firstName, record.lastName].filter(Boolean).join(" ") || "—";
        const initials =
          displayName !== "—"
            ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
            : "?";

        return (
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${record.isActive
                ? "bg-primary-bg text-primary"
                : "bg-red-50 text-red-400"
                }`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-foreground block truncate leading-tight">
                {displayName}
              </span>
              {record.businessName && (
                <span className="text-xs text-muted truncate block mt-0.5">
                  {record.businessName}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Email",
      key: "email",
      width: 220,
      render: (_, record) =>
        record.email ? (
          <span className="text-sm text-foreground flex items-center gap-1.5">
            <Mail size={13} className="text-muted shrink-0" />
            <span className="truncate">{record.email}</span>
          </span>
        ) : (
          <span className="text-sm text-muted/40">—</span>
        ),
    },
    {
      title: "Phone",
      key: "phone",
      width: 140,
      render: (_, record) =>
        record.phone ? (
          <span className="text-sm text-foreground flex items-center gap-1.5">
            <Phone size={13} className="text-muted shrink-0" />
            {record.phone}
          </span>
        ) : (
          <span className="text-sm text-muted/40">—</span>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 200,
      render: (_, record) => {
        const kyc = KYC_TAG[record.kycStatus] ?? KYC_TAG.not_submitted;
        return (
          <div className="flex flex-wrap gap-1">
            {!record.isActive ? (
              <Tag bordered={false} color="red" className="!text-xs">
                Inactive
              </Tag>
            ) : (
              <Tag
                bordered={false}
                color={record.onboardingComplete ? "green" : "purple"}
                className="!text-xs"
              >
                {record.onboardingComplete ? "Onboarded" : "Not Onboarded"}
              </Tag>
            )}
            <Tag bordered={false} color={kyc.color} className="!text-xs">
              {kyc.label}
            </Tag>
          </div>
        );
      },
    },
    {
      title: "Plan",
      key: "plan",
      width: 100,
      render: (_, record) => {
        const plan = record.plan ?? "basic";
        return (
          <Tag color={PLAN_COLORS[plan] ?? "default"} bordered={false} className="!text-xs capitalize">
            {plan}
          </Tag>
        );
      },
    },
    {
      title: "Last Login",
      key: "lastLogin",
      width: 150,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, record) =>
        record.lastLogin ? (
          <Tooltip title={formatDate(record.lastLogin)}>
            <span className="text-sm text-foreground flex items-center gap-1">
              <Clock size={12} className="text-muted" />
              {timeAgo(record.lastLogin)}
            </span>
          </Tooltip>
        ) : (
          <span className="text-sm text-muted/40">Never</span>
        ),
    },
    {
      title: "Joined",
      key: "createdAt",
      width: 150,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, record) => (
        <span className="text-sm text-muted">{formatDate(record.createdAt)}</span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 100,
      fixed: "right",
      align: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-2">
          <Tooltip title="View details">
            <button
              className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
              onClick={() => navigate(`/users-management/${record.id}`)}
            >
              <Eye size={15} />
            </button>
          </Tooltip>
          <Popconfirm
            title={`${record.isActive ? "Deactivate" : "Activate"} user?`}
            description={`This will ${record.isActive ? "deactivate" : "activate"} "${record.name || record.email || record.phone || "this user"
              }".`}
            onConfirm={() => handleToggleActive(record)}
            okText={record.isActive ? "Deactivate" : "Activate"}
            okButtonProps={{ danger: record.isActive }}
          >
            <Switch
              checked={record.isActive}
              size="small"
              loading={toggleActive.isPending}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Build tab items with badge counts from stats
  const tabItems = useMemo(() => {
    if (!stats) return TABS.map((t) => ({ key: t.key, label: t.label }));

    const countMap: Record<TabKey, number | undefined> = {
      all: stats.total,
      verified: stats.kycVerified,
      pending_kyc: stats.kycPending,
      kyc_not_started: stats.kycNotStarted,
      not_onboarded: stats.notOnboarded,
      inactive: stats.inactive,
    };

    return TABS.map((t) => ({
      key: t.key,
      label: (
        <span className="flex items-center gap-1.5">
          {t.label}
          {countMap[t.key] != null && (
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-medium ${
                t.key === activeTab
                  ? "bg-primary text-white"
                  : "bg-surface-muted text-muted"
              }`}
            >
              {countMap[t.key]}
            </span>
          )}
        </span>
      ),
    }));
  }, [stats, activeTab]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Users"
        subtitle="Manage all registered users"
        stats={
          stats
            ? [
              { icon: Users, iconColor: "text-indigo-500", value: stats.total, label: "total" },
              { icon: ShieldCheck, iconColor: "text-emerald-500", value: stats.kycVerified, label: "KYC verified" },
              { icon: ShieldAlert, iconColor: "text-purple-500", value: stats.kycPending, label: "KYC pending" },
              { icon: ClipboardCheck, iconColor: "text-blue-500", value: stats.onboarded, label: "onboarded" },
              { icon: Activity, iconColor: "text-violet-500", value: stats.active, label: "active" },
              { icon: UserX, iconColor: "text-red-500", value: stats.inactive, label: "inactive" },
            ]
            : undefined
        }
        filters={
          <CollapsibleFilters
            activeCount={[filters.draft.status, filters.draft.isActive, filters.draft.plan].filter(Boolean).length}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "240px",
                render: (
                  <Input
                    prefix={<Search size={14} className="text-muted" />}
                    placeholder="Name, email, phone..."
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                    size="middle"
                  />
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "150px",
                render: (
                  <Select
                    allowClear
                    placeholder="All statuses"
                    value={filters.draft.status}
                    onChange={(val) => filters.setFilter("status", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Onboarded", value: "onboarded" },
                      { label: "Pending", value: "pending" },
                    ]}
                  />
                ),
              },
              {
                key: "plan",
                label: "Plan",
                width: "140px",
                render: (
                  <Select
                    allowClear
                    placeholder="All Plans"
                    value={filters.draft.plan}
                    onChange={(val) => filters.setFilter("plan", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Basic", value: "basic" },
                      { label: "Gold", value: "gold" },
                      { label: "Platinum", value: "platinum" },
                      { label: "Diamond", value: "diamond" },
                    ]}
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "active",
                label: "Active",
                width: "130px",
                render: (
                  <Select
                    allowClear
                    placeholder="All"
                    value={filters.draft.isActive}
                    onChange={(val) => filters.setFilter("isActive", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                  />
                ),
              },
            ]}
            extra={
              pagination ? (
                <span className="text-xs text-muted">
                  {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                </span>
              ) : undefined
            }
          />
        }
      />

      {/* ── Tabs ── */}
      <div className="border-b border-border-light">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={users}
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
          pagination && pagination.totalPages > 1
            ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: setPage,
              showSizeChanger: false,
            }
            : false
        }
        locale={{ emptyText: "No users found" }}
        scroll={{ x: 1050 }}
        mobileHref={(record) => `/users-management/${record.id}`}
        onRow={(record) => ({
          className: !record.isActive ? "opacity-60" : "",
          style: { cursor: "pointer" },
          onClick: (e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button, .ant-switch, .ant-popover, .ant-popconfirm")) return;
            navigate(`/users-management/${record.id}`);
          },
        })}
      />
    </div>
  );
}
