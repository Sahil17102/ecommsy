import { useState, useMemo, Fragment } from "react";
import {
  Select,
  InputNumber,
  Button,
  Popconfirm,
  Popover,
  message,
  Tag,
} from "antd";
import ServiceProviderBadge from "@/components/common/ServiceProviderBadge";
import { Plus, Trash2, Pencil, DollarSign, List, RotateCcw, ChevronDown, Upload as UploadIcon } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useCouriers } from "@/features/couriers/queries";
import { useServiceProviders } from "@/features/service-providers/queries";
import { usePlans } from "@/features/plans/queries";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { PLAN_COLORS } from "@/lib/config";
import {
  useB2cZones,
  useB2cPricingList,
  useDeletePricing,
} from "../queries";
import { MODE_OPTIONS } from "../config";
import type { B2cPricingItem, WeightSlab } from "../types";
import { getSlabColor } from "../slabColors";
import AddPricingModal from "./AddPricingModal";
import ImportPricingCsvModal from "./ImportPricingCsvModal";

function formatGrams(g: number): string {
  return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
}

function formatSlab(slab: WeightSlab): string {
  if (slab.maxWeight === null) return `${formatGrams(slab.minWeight)}+`;
  return `${formatGrams(slab.minWeight)}–${formatGrams(slab.maxWeight)}`;
}

export default function PricingTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<B2cPricingItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const filters = useDeferredFilters(
    {
      courier: undefined as string | undefined,
      serviceProvider: undefined as string | undefined,
      mode: undefined as string | undefined,
      plan: undefined as string | undefined,
      minWeight: undefined as number | undefined,
    },
    () => setPage(1),
  );

  const { data: couriersData } = useCouriers({ limit: 250, businessType: "b2c" });
  const { data: spData } = useServiceProviders();
  const { data: zonesData } = useB2cZones({ limit: 250 });
  const { data: plansData } = usePlans();
  const { data: pricingListData, isLoading: pricingLoading } = useB2cPricingList({
    courier: filters.applied.courier,
    serviceProvider: filters.applied.serviceProvider,
    mode: filters.applied.mode,
    minWeight: filters.applied.minWeight,
    plan: filters.applied.plan,
    page,
    limit: pageSize,
  });
  const deletePricing = useDeletePricing();

  const couriers = couriersData?.couriers ?? [];
  const providers = spData?.providers ?? [];
  const allZones = zonesData?.zones ?? [];
  const pricingList = pricingListData?.pricing ?? [];
  const pagination = pricingListData?.pagination;
  const activePlans = plansData?.plans ?? [];

  const spDisplayNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sp of providers) map[sp.serviceProvider] = sp.displayName;
    return map;
  }, [providers]);

  const activeFilterCount = [filters.draft.courier, filters.draft.serviceProvider, filters.draft.mode, filters.draft.plan, filters.draft.minWeight !== undefined ? filters.draft.minWeight : undefined].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  function handleEdit(item: B2cPricingItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleDeletePricing(id: string) {
    deletePricing.mutate(id, {
      onSuccess: () => message.success("Pricing deleted"),
    });
  }

  function handleCloseModal() {
    setEditingItem(null);
    setModalOpen(false);
  }

  const columns: ResponsiveColumnsType<B2cPricingItem> = useMemo(() => [
    {
      title: "Courier",
      key: "courier",
      width: 200,
      render: (_, record) => (
        <span className="text-sm font-medium text-foreground">
          {record.courier?.name ?? "—"}
        </span>
      ),
    },
    {
      title: "Service Provider",
      key: "serviceProvider",
      mobileHidden: true,
      width: 140,
      render: (_, record) => {
        const slug = record.courier?.serviceProvider;
        if (!slug) return <span className="text-muted">—</span>;
        return (
          <ServiceProviderBadge slug={slug} label={spDisplayNameMap[slug]} />
        );
      },
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      width: 90,
      render: (plan: string) => (
        <Tag color={PLAN_COLORS[plan] ?? "default"} bordered={false}>
          {plan?.charAt(0).toUpperCase() + plan?.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Mode",
      dataIndex: "mode",
      key: "mode",
      width: 70,
      render: (mode: string) => (
        <Tag color={mode === "air" ? "blue" : "green"} bordered={false}>
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Slabs",
      key: "slabs",
      width: 240,
      render: (_, record) => {
        const slabs = record.weightSlabs ?? [];
        if (slabs.length === 0) return <span className="text-muted text-xs">—</span>;
        return <SlabsCell slabs={slabs} />;
      },
    },
    {
      title: "Other Charges",
      dataIndex: "otherCharges",
      key: "otherCharges",
      mobileHidden: true,
      width: 120,
      render: (v: number) => (
        <span className="text-sm text-foreground">{v}</span>
      ),
    },
    {
      title: "Zones",
      key: "zoneCount",
      width: 80,
      align: "center",
      render: (_, record) => (
        <span className="text-sm text-foreground">{record.zoneRates?.length ?? 0}</span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 90,
      fixed: "right",
      align: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
            onClick={() => handleEdit(record)}
          >
            <Pencil size={15} />
          </button>
          <Popconfirm
            title="Delete pricing?"
            description="Remove this pricing configuration?"
            onConfirm={() => handleDeletePricing(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <button className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-red-500">
              <Trash2 size={15} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ], [spDisplayNameMap]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={List}
        title="Courier Pricing"
        subtitle="Configure per-courier pricing with weight slabs and zone rates"
        card={false}
        stats={[
          { icon: DollarSign, iconColor: "text-emerald-500", value: pagination?.total ?? 0, label: "configured" },
        ]}
        filters={
          <CollapsibleFilters
            activeCount={activeFilterCount}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "courier",
                label: "Courier",
                render: (
                  <Select
                    allowClear
                    showSearch
                    placeholder="All couriers"
                    value={filters.draft.courier}
                    onChange={(val) => filters.setFilter("courier", val || undefined)}
                    className="w-full"
                    size="middle"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={couriers.map((c) => ({ label: c.name, value: c.id }))}
                  />
                ),
              },
              {
                key: "serviceProvider",
                label: "Service Provider",
                render: (
                  <Select
                    allowClear
                    showSearch
                    placeholder="All providers"
                    value={filters.draft.serviceProvider}
                    onChange={(val) => filters.setFilter("serviceProvider", val || undefined)}
                    className="w-full"
                    size="middle"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={providers.map((sp) => ({ label: sp.displayName, value: sp.serviceProvider }))}
                  />
                ),
              },
              {
                key: "mode",
                label: "Mode",
                width: "130px",
                render: (
                  <Select
                    allowClear
                    placeholder="All modes"
                    value={filters.draft.mode}
                    onChange={(val) => filters.setFilter("mode", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[...MODE_OPTIONS]}
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
                    placeholder="All plans"
                    value={filters.draft.plan}
                    onChange={(val) => filters.setFilter("plan", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={activePlans.map((p) => ({ label: p.name, value: p.slug }))}
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "minWeight",
                label: "First Slab Min Weight",
                width: "180px",
                render: (
                  <InputNumber
                    placeholder="≥ grams"
                    value={filters.draft.minWeight}
                    onChange={(val) => filters.setFilter("minWeight", val ?? undefined)}
                    min={0}
                    step={0.1}
                    className="!w-full"
                    size="middle"
                  />
                ),
              },
            ]}
            extra={
              <>
                {hasActiveFilters && (
                  <button
                    onClick={filters.clearAll}
                    className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <RotateCcw size={12} />
                    Clear all
                  </button>
                )}
                <span className="text-xs font-medium text-muted tabular-nums">
                  {pagination?.total ?? 0} result{(pagination?.total ?? 0) !== 1 ? "s" : ""}
                </span>
                <Button
                  size="middle"
                  icon={<UploadIcon size={14} />}
                  onClick={() => setImportModalOpen(true)}
                >
                  Import CSV
                </Button>
                <Button
                  type="primary"
                  size="middle"
                  icon={<Plus size={14} />}
                  onClick={() => setModalOpen(true)}
                >
                  Add Pricing
                </Button>
              </>
            }
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={pricingList}
        rowKey="id"
        size="middle"
        pagination={
          pagination
            ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (p, size) => {
                if (size !== pageSize) {
                  setPageSize(size);
                  setPage(1);
                } else {
                  setPage(p);
                }
              },
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
            }
            : false
        }
        loading={pricingLoading}
        locale={{ emptyText: "No pricing configured yet" }}
        scroll={{ x: 1100 }}
        expandable={{
          expandedRowKeys: expandedRowKey ? [expandedRowKey] : [],
          onExpand: (expanded, record) =>
            setExpandedRowKey(expanded ? record.id : null),
          expandedRowRender: (record) => (
            <ZoneRatesDetail record={record} allZones={allZones} />
          ),
        }}
        mobileCard={(record) => (
          <PricingMobileCard
            record={record}
            allZones={allZones}
            spDisplayNameMap={spDisplayNameMap}
            onEdit={() => handleEdit(record)}
            onDelete={() => handleDeletePricing(record.id)}
          />
        )}
      />

      <AddPricingModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingItem={editingItem}
      />

      <ImportPricingCsvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}

/* ── Compact slab summary cell ── */
function SlabsCell({ slabs }: { slabs: WeightSlab[] }) {
  const TAGS_VISIBLE = 4;
  const renderAllTags = (
    <div className="flex flex-wrap gap-1 max-w-[420px]">
      {slabs.map((s, i) => {
        const c = getSlabColor(i);
        return (
          <Tag key={i} bordered={false} color={c.tag} className="!m-0 !text-[10px]">
            {formatSlab(s)}
          </Tag>
        );
      })}
    </div>
  );

  if (slabs.length <= TAGS_VISIBLE + 1) {
    return renderAllTags;
  }

  const last = slabs[slabs.length - 1];
  const rangeLabel =
    last.maxWeight === null
      ? `${formatGrams(slabs[0].minWeight)} – ${formatGrams(last.minWeight)}+`
      : `${formatGrams(slabs[0].minWeight)} – ${formatGrams(last.maxWeight)}`;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {slabs.slice(0, TAGS_VISIBLE).map((s, i) => {
        const c = getSlabColor(i);
        return (
          <Tag key={i} bordered={false} color={c.tag} className="!m-0 !text-[10px]">
            {formatSlab(s)}
          </Tag>
        );
      })}
      <Popover
        title={
          <span className="text-xs font-medium">
            {slabs.length} weight slabs · {rangeLabel}
          </span>
        }
        content={renderAllTags}
        trigger="click"
      >
        <button
          type="button"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-bg text-primary hover:bg-primary-bg/70 transition-colors"
        >
          +{slabs.length - TAGS_VISIBLE} more
        </button>
      </Popover>
    </div>
  );
}

/* ── Expanded zone × slab matrix for desktop rows ── */
function ZoneRatesDetail({
  record,
  allZones,
}: {
  record: B2cPricingItem;
  allZones: { id: string; name: string; code: string }[];
}) {
  const slabs = record.weightSlabs ?? [];
  const zoneRates = record.zoneRates ?? [];

  if (zoneRates.length === 0 || slabs.length === 0) {
    return <p className="text-xs text-muted">No zone rates configured.</p>;
  }

  const zoneNameById: Record<string, { name: string; code: string }> = {};
  for (const z of allZones) zoneNameById[z.id] = { name: z.name, code: z.code };
  for (const zr of zoneRates) {
    if (zr.zone && typeof zr.zone === "object") {
      zoneNameById[zr.zone.id] = { name: zr.zone.name, code: zr.zone.code };
    }
  }

  const ZONE_COL_WIDTH = 200;
  const FIELD_WIDTH = 56;
  const SLAB_GROUP_WIDTH = FIELD_WIDTH * 4;
  const tableMinWidth = ZONE_COL_WIDTH + slabs.length * SLAB_GROUP_WIDTH;

  return (
    <div className="overflow-x-auto rounded-md border border-border-light">
      <table
        className="text-xs border-collapse"
        style={{ minWidth: tableMinWidth, width: "100%" }}
      >
        <colgroup>
          <col style={{ width: ZONE_COL_WIDTH }} />
          {slabs.map((_, i) => (
            <Fragment key={i}>
              <col style={{ width: FIELD_WIDTH }} />
              <col style={{ width: FIELD_WIDTH }} />
              <col style={{ width: FIELD_WIDTH }} />
              <col style={{ width: FIELD_WIDTH }} />
            </Fragment>
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border-light">
            <th
              className="text-left py-1.5 px-2 font-medium text-muted bg-background-elevated sticky left-0 z-10"
              rowSpan={2}
            >
              Zone
            </th>
            {slabs.map((s, i) => {
              const c = getSlabColor(i);
              return (
                <th
                  key={i}
                  colSpan={4}
                  className={`text-center py-1.5 px-2 font-semibold border-l-2 ${c.border} ${c.header} ${c.text} whitespace-nowrap`}
                >
                  Slab {i + 1} · {formatSlab(s)}
                </th>
              );
            })}
          </tr>
          <tr className="border-b border-border-light">
            {slabs.map((_, i) => {
              const c = getSlabColor(i);
              return (
                <Fragment key={i}>
                  <th
                    className={`px-1 py-1 text-center text-[10px] font-normal text-muted border-l-2 ${c.border} ${c.bg}`}
                  >
                    Fwd
                  </th>
                  <th className={`px-1 py-1 text-center text-[10px] font-normal text-muted ${c.bg}`}>
                    RTO
                  </th>
                  <th className={`px-1 py-1 text-center text-[10px] font-normal text-muted ${c.bg}`}>
                    COD ₹
                  </th>
                  <th className={`px-1 py-1 text-center text-[10px] font-normal text-muted ${c.bg}`}>
                    COD %
                  </th>
                </Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {zoneRates.map((zr) => {
            const zoneId =
              typeof zr.zone === "object" && zr.zone
                ? zr.zone.id
                : (zr.zone as unknown as string);
            const meta = zoneNameById[zoneId];
            return (
              <tr key={zoneId} className="border-b border-border-light/40">
                <td className="py-1.5 px-2 bg-background-elevated sticky left-0 z-10">
                  <div className="flex items-center gap-2">
                    <Tag bordered={false} color="purple" className="!m-0 !text-[10px] font-mono">
                      {meta?.code ?? "—"}
                    </Tag>
                    <span className="text-foreground whitespace-nowrap">{meta?.name ?? "—"}</span>
                  </div>
                </td>
                {slabs.map((_, i) => {
                  const c = getSlabColor(i);
                  const sr = zr.slabRates?.[i];
                  return (
                    <Fragment key={i}>
                      <td className={`px-1 py-1 text-center tabular-nums text-foreground border-l-2 ${c.border} ${c.bg}`}>
                        {sr?.forward ?? 0}
                      </td>
                      <td className={`px-1 py-1 text-center tabular-nums text-foreground ${c.bg}`}>
                        {sr?.rto ?? 0}
                      </td>
                      <td className={`px-1 py-1 text-center tabular-nums text-foreground ${c.bg}`}>
                        {sr?.codCharges ?? 0}
                      </td>
                      <td className={`px-1 py-1 text-center tabular-nums text-foreground ${c.bg}`}>
                        {sr?.codPercent ?? 0}%
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Mobile card ── */

function PricingMobileCard({
  record,
  allZones,
  spDisplayNameMap,
  onEdit,
  onDelete,
}: {
  record: B2cPricingItem;
  allZones: { id: string; name: string; code: string }[];
  spDisplayNameMap: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showZones, setShowZones] = useState(false);
  const slug = record.courier?.serviceProvider;
  const zoneRates = record.zoneRates ?? [];
  const slabs = record.weightSlabs ?? [];

  const zoneNameById: Record<string, { name: string; code: string }> = {};
  for (const z of allZones) zoneNameById[z.id] = { name: z.name, code: z.code };
  for (const zr of zoneRates) {
    if (zr.zone && typeof zr.zone === "object") {
      zoneNameById[zr.zone.id] = { name: zr.zone.name, code: zr.zone.code };
    }
  }

  return (
    <div className="rounded-xl border border-border-light bg-background-elevated overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {record.courier?.name ?? "—"}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil size={15} />
            </button>
            <Popconfirm
              title="Delete pricing?"
              description="Remove this pricing configuration?"
              onConfirm={onDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <button className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </Popconfirm>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {slug && (
            <ServiceProviderBadge slug={slug} label={spDisplayNameMap[slug]} />
          )}
          <Tag color={PLAN_COLORS[record.plan] ?? "default"} bordered={false} className="!text-xs !m-0">
            {record.plan?.charAt(0).toUpperCase() + record.plan?.slice(1)}
          </Tag>
          <Tag color={record.mode === "air" ? "blue" : "green"} bordered={false} className="!text-xs !m-0">
            {record.mode.charAt(0).toUpperCase() + record.mode.slice(1)}
          </Tag>
        </div>

        {slabs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {slabs.map((s, i) => {
              const c = getSlabColor(i);
              return (
                <Tag key={i} bordered={false} color={c.tag} className="!m-0 !text-[10px]">
                  {formatSlab(s)}
                </Tag>
              );
            })}
          </div>
        )}
      </div>

      {zoneRates.length > 0 && slabs.length > 0 && (
        <>
          <button
            onClick={() => setShowZones(!showZones)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border-light/60 text-xs font-medium text-primary hover:bg-primary-bg/50 transition-colors"
          >
            {showZones ? "Hide" : "View"} zone rates ({zoneRates.length})
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showZones ? "rotate-180" : ""}`}
            />
          </button>
          {showZones && (
            <div className="px-3 pb-3 border-t border-border-light/60 space-y-3">
              {zoneRates.map((zr) => {
                const zoneId =
                  typeof zr.zone === "object" && zr.zone
                    ? zr.zone.id
                    : (zr.zone as unknown as string);
                const meta = zoneNameById[zoneId];
                return (
                  <div key={zoneId} className="rounded-md border border-border-light/60 p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Tag bordered={false} color="purple" className="!m-0 !text-[10px] font-mono">
                        {meta?.code ?? "—"}
                      </Tag>
                      <span className="text-xs font-medium text-foreground">
                        {meta?.name ?? "—"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {slabs.map((s, i) => {
                        const c = getSlabColor(i);
                        const sr = zr.slabRates?.[i];
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-[11px] px-1.5 py-1 rounded border ${c.border} ${c.bg}`}
                          >
                            <Tag bordered={false} color={c.tag} className="!m-0 !text-[9px] !leading-4 !px-1">
                              S{i + 1}
                            </Tag>
                            <span className={`font-medium ${c.text} min-w-0 flex-1 truncate`}>
                              {formatSlab(s)}
                            </span>
                            <span className="tabular-nums">Fwd ₹{sr?.forward ?? 0}</span>
                            <span className="tabular-nums text-muted">RTO ₹{sr?.rto ?? 0}</span>
                            <span className="tabular-nums">
                              COD ₹{sr?.codCharges ?? 0}
                              {(sr?.codPercent ?? 0) > 0 ? ` + ${sr?.codPercent}%` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
