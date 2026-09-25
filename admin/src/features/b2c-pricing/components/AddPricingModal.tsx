import { useState, useEffect } from "react";
import { Modal, Select, InputNumber, Table, Tag, Button, Tooltip, Popover, message } from "antd";
import { Plus, Trash2, Copy, Wand2, Infinity as InfinityIcon } from "lucide-react";
import { useCouriers } from "@/features/couriers/queries";
import { usePlans } from "@/features/plans/queries";
import {
  useB2cZones,
  useAllPricingByCourier,
  useBatchUpsertPricing,
} from "../queries";
import { MODE_OPTIONS } from "../config";
import { getSlabColor } from "../slabColors";
import type { B2cPricingItem, WeightSlab, ZoneRate } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  editingItem?: B2cPricingItem | null;
}

interface SlabRateRow {
  forward: number;
  rto: number;
  codCharges: number;
  codPercent: number;
}

interface ZoneFormRow {
  slabRates: SlabRateRow[];
}

interface PricingForm {
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlab[];
  // planRates[planSlug][zoneId] = { slabRates: [{ forward, rto, codCharges, codPercent } x slabCount] }
  planRates: Record<string, Record<string, ZoneFormRow>>;
}

const DEFAULT_SLABS: WeightSlab[] = [
  { minWeight: 0, maxWeight: 500 },
  { minWeight: 500, maxWeight: null },
];

const EMPTY_SLAB_RATE: SlabRateRow = {
  forward: 0,
  rto: 0,
  codCharges: 0,
  codPercent: 0,
};

const DEFAULT_FORM: PricingForm = {
  mode: "surface",
  otherCharges: 0,
  weightSlabs: DEFAULT_SLABS,
  planRates: {},
};

function emptyZoneRow(slabCount: number): ZoneFormRow {
  return { slabRates: Array.from({ length: slabCount }, () => ({ ...EMPTY_SLAB_RATE })) };
}

function formatGrams(g: number): string {
  return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
}

function formatSlabRange(slab: WeightSlab): string {
  if (slab.maxWeight === null) return `${formatGrams(slab.minWeight)}+`;
  return `${formatGrams(slab.minWeight)} – ${formatGrams(slab.maxWeight)}`;
}

export default function AddPricingModal({ open, onClose, editingItem }: Props) {
  const [selectedCourier, setSelectedCourier] = useState<string | undefined>();
  const [form, setForm] = useState<PricingForm>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<string>("");

  const { data: couriersData } = useCouriers({ limit: 250, businessType: "b2c" });
  const { data: zonesData } = useB2cZones({ limit: 250 });
  const { data: plansData } = usePlans({ isActive: true });
  const { data: courierPricing, isFetching: loadingPricing } =
    useAllPricingByCourier(selectedCourier);
  const batchUpsert = useBatchUpsertPricing();

  const couriers = couriersData?.couriers ?? [];
  const zones = (zonesData?.zones ?? []).filter((z) => z.isActive);
  const plans = plansData?.plans ?? [];

  useEffect(() => {
    if (plans.length > 0 && !activeTab) {
      setActiveTab(plans[0].slug);
    }
  }, [plans, activeTab]);

  useEffect(() => {
    if (open && editingItem) {
      setSelectedCourier(editingItem.courier?.id);
      if (editingItem.plan) setActiveTab(editingItem.plan);
    }
  }, [open, editingItem]);

  // Hydrate form when courier pricing loads
  useEffect(() => {
    if (!selectedCourier) {
      setForm(DEFAULT_FORM);
      return;
    }

    const pricingDocs = courierPricing?.pricing;
    if (pricingDocs && Array.isArray(pricingDocs) && pricingDocs.length > 0) {
      const first = pricingDocs[0];
      const slabs = first.weightSlabs?.length ? first.weightSlabs : DEFAULT_SLABS;
      const planRates: Record<string, Record<string, ZoneFormRow>> = {};

      for (const doc of pricingDocs) {
        const zoneRows: Record<string, ZoneFormRow> = {};
        for (const zr of doc.zoneRates) {
          const zoneId =
            zr.zone && typeof zr.zone === "object"
              ? zr.zone.id
              : (zr.zone as unknown as string);
          zoneRows[zoneId] = {
            slabRates: slabs.map((_, i) => ({
              forward: zr.slabRates?.[i]?.forward ?? 0,
              rto: zr.slabRates?.[i]?.rto ?? 0,
              codCharges: zr.slabRates?.[i]?.codCharges ?? 0,
              codPercent: zr.slabRates?.[i]?.codPercent ?? 0,
            })),
          };
        }
        planRates[doc.plan] = zoneRows;
      }

      setForm({
        mode: first.mode,
        otherCharges: first.otherCharges,
        weightSlabs: slabs,
        planRates,
      });
    } else if (!loadingPricing) {
      setForm(DEFAULT_FORM);
    }
  }, [courierPricing, selectedCourier, loadingPricing]);

  // ── Validation + save ────────────────────────────────────────────────
  function handleSave() {
    if (!selectedCourier) {
      message.warning("Please select a courier");
      return;
    }
    if (form.weightSlabs.length === 0) {
      message.warning("Add at least one weight slab");
      return;
    }
    for (let i = 0; i < form.weightSlabs.length; i++) {
      const s = form.weightSlabs[i];
      if (s.maxWeight !== null && s.maxWeight <= s.minWeight) {
        message.error(`Slab ${i + 1}: max weight must be greater than min weight`);
        return;
      }
      if (i > 0) {
        const prev = form.weightSlabs[i - 1];
        if (prev.maxWeight === null) {
          message.error(`Slab ${i}: only the last slab can be open-ended`);
          return;
        }
        if (s.minWeight !== prev.maxWeight) {
          message.error(`Slab ${i + 1} must start at ${prev.maxWeight}g (where slab ${i} ends)`);
          return;
        }
      }
    }

    const planRates: Record<string, ZoneRate[]> = {};
    for (const plan of plans) {
      planRates[plan.slug] = zones.map((z) => {
        const row = form.planRates[plan.slug]?.[z.id];
        return {
          zone: z.id,
          slabRates: form.weightSlabs.map((_, i) => ({
            forward: row?.slabRates?.[i]?.forward ?? 0,
            rto: row?.slabRates?.[i]?.rto ?? 0,
            codCharges: row?.slabRates?.[i]?.codCharges ?? 0,
            codPercent: row?.slabRates?.[i]?.codPercent ?? 0,
          })),
        };
      });
    }

    batchUpsert.mutate(
      {
        courierId: selectedCourier,
        mode: form.mode,
        otherCharges: form.otherCharges,
        weightSlabs: form.weightSlabs,
        planRates,
      },
      {
        onSuccess: () => {
          message.success("Pricing saved for all plans");
          handleClose();
        },
      },
    );
  }

  function handleClose() {
    setSelectedCourier(undefined);
    setForm(DEFAULT_FORM);
    setActiveTab(plans[0]?.slug ?? "");
    onClose();
  }

  // ── Slab editing ─────────────────────────────────────────────────────
  function updateSlab(index: number, patch: Partial<WeightSlab>) {
    setForm((prev) => {
      const nextSlabs = prev.weightSlabs.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      return { ...prev, weightSlabs: nextSlabs };
    });
  }

  function addSlab() {
    setForm((prev) => {
      const last = prev.weightSlabs[prev.weightSlabs.length - 1];
      const nextSlabs: WeightSlab[] = [...prev.weightSlabs];
      const startWeight =
        last?.maxWeight !== null && last?.maxWeight !== undefined
          ? last.maxWeight
          : (last?.minWeight ?? 0) + 500;
      if (last && last.maxWeight === null) {
        nextSlabs[nextSlabs.length - 1] = { ...last, maxWeight: startWeight };
      }
      nextSlabs.push({ minWeight: startWeight, maxWeight: null });

      // Extend slabRates for every existing zone row by appending an empty rate.
      const planRates: Record<string, Record<string, ZoneFormRow>> = {};
      for (const plan of Object.keys(prev.planRates)) {
        const zoneRows = prev.planRates[plan];
        const nextZoneRows: Record<string, ZoneFormRow> = {};
        for (const zid of Object.keys(zoneRows)) {
          nextZoneRows[zid] = {
            slabRates: [...zoneRows[zid].slabRates, { ...EMPTY_SLAB_RATE }],
          };
        }
        planRates[plan] = nextZoneRows;
      }
      return { ...prev, weightSlabs: nextSlabs, planRates };
    });
  }

  function generateSlabs(start: number, step: number, count: number, openEnded: boolean) {
    if (count < 1 || step < 1) return;
    const newSlabs: WeightSlab[] = [];
    let current = start;
    for (let i = 0; i < count; i++) {
      newSlabs.push({ minWeight: current, maxWeight: current + step });
      current += step;
    }
    if (openEnded && newSlabs.length > 0) {
      const last = newSlabs[newSlabs.length - 1];
      newSlabs[newSlabs.length - 1] = { ...last, maxWeight: null };
    }

    setForm((prev) => {
      const planRates: Record<string, Record<string, ZoneFormRow>> = {};
      for (const plan of Object.keys(prev.planRates)) {
        const zoneRows = prev.planRates[plan];
        const nextZoneRows: Record<string, ZoneFormRow> = {};
        for (const zid of Object.keys(zoneRows)) {
          const old = zoneRows[zid].slabRates;
          nextZoneRows[zid] = {
            slabRates: newSlabs.map((_, i) => old[i] ?? { ...EMPTY_SLAB_RATE }),
          };
        }
        planRates[plan] = nextZoneRows;
      }
      return { ...prev, weightSlabs: newSlabs, planRates };
    });
    message.success(`Generated ${newSlabs.length} slabs`);
  }

  function removeSlab(index: number) {
    setForm((prev) => {
      if (prev.weightSlabs.length <= 1) return prev;
      const nextSlabs = prev.weightSlabs.filter((_, i) => i !== index);
      for (let i = 1; i < nextSlabs.length; i++) {
        const previous = nextSlabs[i - 1];
        if (previous.maxWeight !== null && nextSlabs[i].minWeight !== previous.maxWeight) {
          nextSlabs[i] = { ...nextSlabs[i], minWeight: previous.maxWeight };
        }
      }
      const last = nextSlabs[nextSlabs.length - 1];
      if (last && index === prev.weightSlabs.length - 1) {
        nextSlabs[nextSlabs.length - 1] = { ...last, maxWeight: null };
      }

      const planRates: Record<string, Record<string, ZoneFormRow>> = {};
      for (const plan of Object.keys(prev.planRates)) {
        const zoneRows = prev.planRates[plan];
        const nextZoneRows: Record<string, ZoneFormRow> = {};
        for (const zid of Object.keys(zoneRows)) {
          nextZoneRows[zid] = {
            slabRates: zoneRows[zid].slabRates.filter((_, i) => i !== index),
          };
        }
        planRates[plan] = nextZoneRows;
      }
      return { ...prev, weightSlabs: nextSlabs, planRates };
    });
  }

  // ── Single-cell update ───────────────────────────────────────────────
  function updateSlabRate(
    planSlug: string,
    zoneId: string,
    slabIndex: number,
    field: keyof SlabRateRow,
    value: number | null,
  ) {
    setForm((prev) => {
      const existing =
        prev.planRates[planSlug]?.[zoneId] ?? emptyZoneRow(prev.weightSlabs.length);
      const nextSlabRates = existing.slabRates.map((sr, i) =>
        i === slabIndex ? { ...sr, [field]: value ?? 0 } : sr,
      );
      return {
        ...prev,
        planRates: {
          ...prev.planRates,
          [planSlug]: {
            ...prev.planRates[planSlug],
            [zoneId]: { slabRates: nextSlabRates },
          },
        },
      };
    });
  }

  // ── Bulk-fill helpers ────────────────────────────────────────────────
  /** Copy one zone row's full slab matrix to every other zone in the same plan. */
  function copyZoneToAll(planSlug: string, sourceZoneId: string) {
    setForm((prev) => {
      const sourceRow =
        prev.planRates[planSlug]?.[sourceZoneId] ?? emptyZoneRow(prev.weightSlabs.length);
      const next: Record<string, ZoneFormRow> = {};
      for (const z of zones) {
        next[z.id] =
          z.id === sourceZoneId
            ? sourceRow
            : {
                slabRates: sourceRow.slabRates.map((sr) => ({ ...sr })),
              };
      }
      return {
        ...prev,
        planRates: { ...prev.planRates, [planSlug]: next },
      };
    });
    message.success("Copied to all zones in this plan");
  }

  /** For one slab column, copy the previous slab's value (× multiplier) into every zone. */
  function copyPreviousSlab(planSlug: string, targetSlabIdx: number, multiplier: number) {
    if (targetSlabIdx === 0) return;
    setForm((prev) => {
      const planRates = { ...prev.planRates };
      const zoneRows = { ...(planRates[planSlug] ?? {}) };
      for (const z of zones) {
        const row = zoneRows[z.id] ?? emptyZoneRow(prev.weightSlabs.length);
        const prevRate = row.slabRates[targetSlabIdx - 1] ?? EMPTY_SLAB_RATE;
        const nextRates = row.slabRates.map((sr, i) =>
          i === targetSlabIdx
            ? {
                forward: round2(prevRate.forward * multiplier),
                rto: round2(prevRate.rto * multiplier),
                codCharges: round2(prevRate.codCharges * multiplier),
                codPercent: round2(prevRate.codPercent * multiplier),
              }
            : sr,
        );
        zoneRows[z.id] = { slabRates: nextRates };
      }
      planRates[planSlug] = zoneRows;
      return { ...prev, planRates };
    });
    message.success(
      `Slab ${targetSlabIdx + 1} filled from slab ${targetSlabIdx}${multiplier !== 1 ? ` × ${multiplier}` : ""}`,
    );
  }

  /** Clone an entire plan's zone × slab matrix into the active plan. */
  function copyFromOtherPlan(targetPlanSlug: string, sourcePlanSlug: string) {
    setForm((prev) => {
      const source = prev.planRates[sourcePlanSlug];
      if (!source) {
        message.warning("Source plan has no rates yet");
        return prev;
      }
      const next: Record<string, ZoneFormRow> = {};
      for (const z of zones) {
        const row = source[z.id] ?? emptyZoneRow(prev.weightSlabs.length);
        next[z.id] = { slabRates: row.slabRates.map((sr) => ({ ...sr })) };
      }
      return {
        ...prev,
        planRates: { ...prev.planRates, [targetPlanSlug]: next },
      };
    });
    message.success(`Copied rates from ${sourcePlanSlug} into the current plan`);
  }

  // ── Render: zone × slab table per plan ───────────────────────────────
  function renderZoneRatesTable(planSlug: string) {
    if (zones.length === 0) {
      return (
        <p className="text-sm text-muted">
          No active zones found. Create zones in the Zones tab first.
        </p>
      );
    }

    const slabFieldColumns = (slabIdx: number) =>
      (
        [
          { key: "forward", label: "Fwd" },
          { key: "rto", label: "RTO" },
          { key: "codCharges", label: "COD ₹" },
          { key: "codPercent", label: "COD %" },
        ] as const
      ).map(({ key, label }, fieldIdx) => {
        const color = getSlabColor(slabIdx);
        return {
          title: <span className={`text-[10px] font-medium ${color.text}`}>{label}</span>,
          key: `slab_${slabIdx}_${key}`,
          width: 78,
          align: "center" as const,
          className: `${color.bg}${fieldIdx === 0 ? ` border-l-2 ${color.border}` : ""}`,
          onHeaderCell: () => ({ className: color.bg }),
          render: (_: unknown, zone: { id: string }) => (
            <InputNumber
              value={form.planRates[planSlug]?.[zone.id]?.slabRates?.[slabIdx]?.[key] ?? 0}
              onChange={(val) => updateSlabRate(planSlug, zone.id, slabIdx, key, val)}
              min={0}
              max={key === "codPercent" ? 100 : undefined}
              className="w-full"
              size="small"
              variant="filled"
            />
          ),
        };
      });

    const slabGroups = form.weightSlabs.map((slab, slabIdx) => {
      const color = getSlabColor(slabIdx);
      return {
        title: (
          <div className={`text-center ${color.header} -mx-2 -my-2 px-2 py-1.5 border-b-2 ${color.border}`}>
            <div className="flex items-center justify-center gap-1.5">
              <Tag bordered={false} color={color.tag} className="!m-0 !text-[10px] !leading-4 !px-1.5">
                Slab {slabIdx + 1}
              </Tag>
              <span className={`text-[11px] font-semibold ${color.text}`}>
                {formatSlabRange(slab)}
              </span>
              {slabIdx > 0 && (
                <Popover
                  trigger="click"
                  content={
                    <CopyPreviousSlabPanel
                      onApply={(mult) => copyPreviousSlab(planSlug, slabIdx, mult)}
                    />
                  }
                >
                  <button
                    className={`text-[10px] ${color.text} hover:underline inline-flex items-center gap-0.5`}
                    title={`Copy from slab ${slabIdx}`}
                  >
                    <Wand2 size={10} />
                    fill
                  </button>
                </Popover>
              )}
            </div>
          </div>
        ),
        key: `slab_group_${slabIdx}`,
        children: slabFieldColumns(slabIdx),
      };
    });

    return (
      <div className="themed-table rounded-lg border border-border-light overflow-hidden overflow-x-auto">
        <Table
          dataSource={zones}
          rowKey="id"
          size="small"
          pagination={false}
          bordered
          scroll={{ x: 220 + form.weightSlabs.length * 320 + 60 }}
          columns={[
            {
              title: "Zone",
              key: "zone",
              fixed: "left",
              width: 180,
              render: (_, zone) => (
                <div className="flex items-center gap-2">
                  <Tag
                    bordered={false}
                    className="!m-0 !text-[10px] !font-semibold !px-1.5 !leading-5 font-mono"
                    color="purple"
                  >
                    {zone.code}
                  </Tag>
                  <span className="text-sm text-foreground">{zone.name}</span>
                </div>
              ),
            },
            ...slabGroups,
            {
              title: "",
              key: "row_actions",
              width: 40,
              fixed: "right",
              render: (_, zone) => (
                <Tooltip title="Copy this row to all zones in this plan">
                  <button
                    onClick={() => copyZoneToAll(planSlug, zone.id)}
                    className="p-1 rounded hover:bg-background text-muted hover:text-primary transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </Tooltip>
              ),
            },
          ]}
          locale={{ emptyText: "No active zones" }}
        />
      </div>
    );
  }

  // ── Plan-tab toolbar (cross-plan copy) ──────────────────────────────
  function renderPlanToolbar(currentPlanSlug: string) {
    const otherPlans = plans.filter((p) => p.slug !== currentPlanSlug);
    if (otherPlans.length === 0) return null;
    return (
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-muted">Pre-fill from another plan:</span>
        <Select<string>
          size="small"
          placeholder="Select plan"
          className="!w-36"
          options={otherPlans.map((p) => ({ label: p.name, value: p.slug }))}
          onSelect={(val) => {
            if (val) copyFromOtherPlan(currentPlanSlug, val);
          }}
          value={undefined}
          allowClear
        />
      </div>
    );
  }

  return (
    <Modal
      title={editingItem ? "Edit Pricing" : "Add Pricing"}
      open={open}
      onCancel={handleClose}
      onOk={handleSave}
      confirmLoading={batchUpsert.isPending}
      okText={editingItem ? "Save Changes" : "Add Pricing"}
      width="98vw"
      style={{ maxWidth: 1280 }}
      destroyOnClose
    >
      <div className="space-y-5 pt-2">
        {/* Courier + basic details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Courier (B2C)
            </label>
            <Select
              showSearch
              placeholder="Choose a B2C courier"
              value={selectedCourier}
              onChange={(val) => setSelectedCourier(val)}
              className="w-full"
              allowClear
              loading={loadingPricing}
              disabled={!!editingItem}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={couriers.map((c) => ({
                label: `${c.name} (${c.serviceProviderDisplayName})`,
                value: c.id,
              }))}
              notFoundContent="No B2C couriers found"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Mode</label>
            <Select
              value={form.mode}
              onChange={(val) => setForm((prev) => ({ ...prev, mode: val }))}
              options={[...MODE_OPTIONS]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Other Charges (₹)
            </label>
            <InputNumber
              value={form.otherCharges}
              onChange={(val) => setForm((prev) => ({ ...prev, otherCharges: val ?? 0 }))}
              min={0}
              className="!w-full"
            />
          </div>
        </div>

        {/* Weight slabs editor */}
        <div className="rounded-lg border border-border-light p-3 bg-background-elevated/30">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Weight Slabs
                <span className="ml-2 text-[11px] font-normal text-muted">
                  ({form.weightSlabs.length})
                </span>
              </div>
              <div className="text-[11px] text-muted">
                Define weight ranges in grams. Last slab is open-ended (e.g. 2000 g+).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover
                trigger="click"
                placement="bottomRight"
                content={
                  <GenerateSlabsPanel
                    onApply={(start, step, count, openEnded) =>
                      generateSlabs(start, step, count, openEnded)
                    }
                  />
                }
              >
                <Button size="small" icon={<Wand2 size={12} />}>
                  Generate
                </Button>
              </Popover>
              <Button size="small" icon={<Plus size={12} />} onClick={addSlab}>
                Add Slab
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {form.weightSlabs.map((slab, idx) => {
              const isLast = idx === form.weightSlabs.length - 1;
              const color = getSlabColor(idx);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md border ${color.border} ${color.bg}`}
                >
                  <Tag
                    bordered={false}
                    color={color.tag}
                    className="!m-0 !text-[10px] !leading-5 !px-1.5 shrink-0 !min-w-[34px] text-center"
                  >
                    S{idx + 1}
                  </Tag>
                  <InputNumber
                    value={slab.minWeight}
                    onChange={(val) => updateSlab(idx, { minWeight: val ?? 0 })}
                    min={0}
                    size="small"
                    controls={false}
                    className="!w-full !min-w-0"
                    disabled={idx > 0}
                  />
                  <span className="text-xs text-muted shrink-0">–</span>
                  <InputNumber
                    value={slab.maxWeight ?? undefined}
                    onChange={(val) => updateSlab(idx, { maxWeight: val ?? null })}
                    min={slab.minWeight + 1}
                    size="small"
                    controls={false}
                    className="!w-full !min-w-0"
                    placeholder={isLast ? "∞" : ""}
                  />
                  <span className="text-[10px] text-muted shrink-0">g</span>
                  {isLast && (
                    <Tooltip
                      title={
                        slab.maxWeight === null
                          ? "Open-ended (e.g. 19 kg+)"
                          : "Make open-ended"
                      }
                    >
                      <button
                        onClick={() =>
                          updateSlab(idx, {
                            maxWeight: slab.maxWeight === null ? slab.minWeight + 1000 : null,
                          })
                        }
                        className={`p-0.5 rounded transition-colors shrink-0 ${
                          slab.maxWeight === null
                            ? "text-primary"
                            : "text-muted hover:text-primary"
                        }`}
                      >
                        <InfinityIcon size={13} />
                      </button>
                    </Tooltip>
                  )}
                  <button
                    onClick={() => removeSlab(idx)}
                    disabled={form.weightSlabs.length <= 1}
                    className="p-0.5 rounded hover:bg-background-elevated/80 dark:hover:bg-background/60 text-muted hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan tabs with zone × slab matrix */}
        {plans.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-xs font-medium text-muted">
                Zone Rates by Plan — each slab has Fwd / RTO / COD ₹ / COD %
              </label>
              <span className="text-[11px] text-muted hidden sm:inline">
                Tip: use the <Copy size={10} className="inline -mt-0.5" /> action on a row to fill all zones, or the <Wand2 size={10} className="inline -mt-0.5" /> on a slab to copy from the previous slab.
              </span>
            </div>
            <div
              role="tablist"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-muted border border-border-light mb-3"
            >
              {plans.map((plan) => {
                const isActive = activeTab === plan.slug;
                return (
                  <button
                    key={plan.slug}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(plan.slug)}
                    className={
                      isActive
                        ? "px-4 py-1.5 text-xs font-semibold rounded-md bg-primary text-white shadow-sm transition-all"
                        : "px-4 py-1.5 text-xs font-medium rounded-md text-muted hover:text-foreground hover:bg-background-elevated transition-all"
                    }
                  >
                    {plan.name}
                  </button>
                );
              })}
            </div>
            {activeTab && (
              <>
                {renderPlanToolbar(activeTab)}
                {renderZoneRatesTable(activeTab)}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No active plans found. Create plans in Plan Management first.
          </p>
        )}
      </div>
    </Modal>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Popover content for "generate N slabs of step grams from start"
function GenerateSlabsPanel({
  onApply,
}: {
  onApply: (start: number, step: number, count: number, openEnded: boolean) => void;
}) {
  const [start, setStart] = useState<number>(0);
  const [step, setStep] = useState<number>(500);
  const [count, setCount] = useState<number>(10);
  const [openEnded, setOpenEnded] = useState<boolean>(true);
  const lastEnd = start + step * count;
  return (
    <div className="space-y-2 w-64">
      <div className="text-xs text-muted">
        Generate evenly-spaced slabs. Replaces existing slabs.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-muted mb-0.5">Start (g)</div>
          <InputNumber
            value={start}
            onChange={(v) => setStart(v ?? 0)}
            min={0}
            size="small"
            className="!w-full"
          />
        </div>
        <div>
          <div className="text-[10px] text-muted mb-0.5">Step (g)</div>
          <InputNumber
            value={step}
            onChange={(v) => setStep(v ?? 500)}
            min={1}
            size="small"
            className="!w-full"
          />
        </div>
        <div>
          <div className="text-[10px] text-muted mb-0.5">Count</div>
          <InputNumber
            value={count}
            onChange={(v) => setCount(v ?? 1)}
            min={1}
            max={50}
            size="small"
            className="!w-full"
          />
        </div>
        <div className="flex items-end">
          <label className="text-[11px] text-muted flex items-center gap-1">
            <input
              type="checkbox"
              checked={openEnded}
              onChange={(e) => setOpenEnded(e.target.checked)}
            />
            Open-ended last
          </label>
        </div>
      </div>
      <div className="text-[10px] text-muted">
        Range: {start} g – {openEnded ? `${lastEnd - step} g+` : `${lastEnd} g`}
      </div>
      <Button
        size="small"
        type="primary"
        block
        onClick={() => onApply(start, step, count, openEnded)}
      >
        Generate {count} slab{count !== 1 ? "s" : ""}
      </Button>
    </div>
  );
}

// Popover content for "copy from previous slab × multiplier"
function CopyPreviousSlabPanel({ onApply }: { onApply: (multiplier: number) => void }) {
  const [mult, setMult] = useState<number>(1);
  return (
    <div className="space-y-2 w-48">
      <div className="text-xs text-muted">
        Copy values from the previous slab. Optionally scale by a multiplier
        (e.g. 1.2 if each next slab is 20% pricier).
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs">×</span>
        <InputNumber
          value={mult}
          onChange={(v) => setMult(v ?? 1)}
          min={0}
          step={0.1}
          size="small"
          className="!w-24"
        />
        <Button size="small" type="primary" onClick={() => onApply(mult)}>
          Apply
        </Button>
      </div>
    </div>
  );
}
