import { useMemo, useState } from "react";
import { Select, Segmented, Tag, Tooltip } from "antd";
import { Truck } from "lucide-react";
import type { ColumnGroupType } from "antd/es/table";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import { useRateCard } from "@/queries/useDelhiveryRate";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import type { WeightSlabItem } from "@/lib/ratesApi";

interface FlatRow {
  key: string;
  courierName: string;
  serviceProvider: string;
  logo: string | null;
  mode: "air" | "surface";
  slabLabel: string;
  otherCharges: number;
  // codCharges/codPercent are now per-zone, surfaced as "<min> / <max>%"
  codSummary: string;
  [zoneKey: string]: string | number | null | undefined;
}

function formatGrams(g: number): string {
  return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
}

function formatSlab(slab: WeightSlabItem): string {
  if (slab.maxWeight === null) return `${formatGrams(slab.minWeight)}+`;
  return `${formatGrams(slab.minWeight)}–${formatGrams(slab.maxWeight)}`;
}

export function RateCardPage() {
  const { data, isLoading } = useRateCard();
  const [modeFilter, setModeFilter] = useState<"all" | "air" | "surface">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [slabIndex, setSlabIndex] = useState<number>(0);

  const pricing = data?.pricing ?? [];

  const providers = useMemo(
    () => [...new Set(pricing.map((p) => p.courier.serviceProvider))],
    [pricing],
  );

  // Take the union of slabs across pricing docs (in practice all docs share slabs per plan).
  // The first doc wins; if it has no slabs we fall back to an empty array.
  const slabs = useMemo<WeightSlabItem[]>(() => {
    return pricing[0]?.weightSlabs ?? [];
  }, [pricing]);

  const safeSlabIndex = Math.min(slabIndex, Math.max(0, slabs.length - 1));

  // Collect all unique zones sorted by code
  const allZones = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const p of pricing) {
      for (const zr of p.zoneRates) {
        if (!map.has(zr.zone.code)) map.set(zr.zone.code, zr.zone);
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [pricing]);

  // Flatten pricing into table rows for the currently-selected slab
  const rows = useMemo<FlatRow[]>(() => {
    return pricing
      .filter((p) => {
        if (modeFilter !== "all" && p.mode !== modeFilter) return false;
        if (providerFilter !== "all" && p.courier.serviceProvider !== providerFilter) return false;
        return true;
      })
      .map((p) => {
        const slab = p.weightSlabs?.[safeSlabIndex];
        // COD now lives on each (zone, slab) cell. For the row summary we aggregate
        // COD across zones at the *currently-selected slab* only.
        const codCharges = p.zoneRates
          .map((zr) => zr.slabRates?.[safeSlabIndex]?.codCharges)
          .filter((v): v is number => typeof v === "number");
        const codPercents = p.zoneRates
          .map((zr) => zr.slabRates?.[safeSlabIndex]?.codPercent)
          .filter((v): v is number => typeof v === "number");
        const codChargeMin = codCharges.length ? Math.min(...codCharges) : 0;
        const codChargeMax = codCharges.length ? Math.max(...codCharges) : 0;
        const codPctMin = codPercents.length ? Math.min(...codPercents) : 0;
        const codPctMax = codPercents.length ? Math.max(...codPercents) : 0;
        const codSummary =
          codChargeMin === codChargeMax && codPctMin === codPctMax
            ? `${formatCurrency(codChargeMin)}${codPctMin > 0 ? ` + ${codPctMin}%` : ""}`
            : `${formatCurrency(codChargeMin)}–${formatCurrency(codChargeMax)} + ${codPctMin}–${codPctMax}%`;

        const row: FlatRow = {
          key: p.id,
          courierName: p.courier.name,
          serviceProvider: p.courier.serviceProvider,
          logo: p.courier.logo ?? null,
          mode: p.mode,
          slabLabel: slab ? formatSlab(slab) : "—",
          otherCharges: p.otherCharges,
          codSummary,
        };

        for (const zr of p.zoneRates) {
          const slabRate = zr.slabRates?.[safeSlabIndex];
          row[`fwd_${zr.zone.code}`] = slabRate?.forward ?? null;
          row[`rto_${zr.zone.code}`] = slabRate?.rto ?? null;
        }

        return row;
      });
  }, [pricing, modeFilter, providerFilter, safeSlabIndex]);

  // Build columns dynamically
  const columns = useMemo(() => {
    const cols: (ResponsiveColumnsType<FlatRow>[number] | ColumnGroupType<FlatRow>)[] = [
      {
        title: "Courier",
        dataIndex: "courierName",
        key: "courierName",
        width: 220,
        mobileTitle: true,
        sorter: (a: FlatRow, b: FlatRow) => a.courierName.localeCompare(b.courierName),
        render: (_: unknown, row: FlatRow) => (
          <div className="flex items-center gap-2.5">
            {row.logo ? (
              <img src={row.logo} alt={row.courierName} className="w-7 h-7 rounded object-contain bg-background p-0.5 border border-border-light shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded bg-background border border-border-light flex items-center justify-center shrink-0">
                <Truck className="w-3.5 h-3.5 text-muted" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{row.courierName}</div>
              <div className="text-xs text-muted">{formatKeyword(row.serviceProvider)}</div>
            </div>
          </div>
        ),
      },
      {
        title: "Mode",
        dataIndex: "mode",
        key: "mode",
        width: 100,
        render: (_: unknown, row: FlatRow) => (
          <Tag color={row.mode === "air" ? "blue" : "green"}>
            {row.mode === "air" ? "Air" : "Surface"}
          </Tag>
        ),
      },
      {
        title: "Slab",
        dataIndex: "slabLabel",
        key: "slabLabel",
        width: 120,
        render: (_: unknown, row: FlatRow) => (
          <span className="text-xs text-foreground">{row.slabLabel}</span>
        ),
      },
    ];

    // Zone columns — each zone gets a grouped column with Forward & RTO
    for (const zone of allZones) {
      const fwdKey = `fwd_${zone.code}`;
      const rtoKey = `rto_${zone.code}`;

      cols.push({
        title: (
          <Tooltip title={zone.name}>
            <span>{formatKeyword(zone.code)}</span>
          </Tooltip>
        ),
        key: zone.code,
        children: [
          {
            title: "Fwd",
            dataIndex: fwdKey,
            key: fwdKey,
            width: 90,
            align: "right" as const,
            sorter: (a: FlatRow, b: FlatRow) =>
              (Number(a[fwdKey]) || 0) - (Number(b[fwdKey]) || 0),
            render: (v: unknown) =>
              v != null ? (
                <span className="font-medium text-foreground">{formatCurrency(Number(v))}</span>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          {
            title: "RTO",
            dataIndex: rtoKey,
            key: rtoKey,
            width: 90,
            align: "right" as const,
            sorter: (a: FlatRow, b: FlatRow) =>
              (Number(a[rtoKey]) || 0) - (Number(b[rtoKey]) || 0),
            render: (v: unknown) =>
              v != null ? (
                <span className="text-muted">{formatCurrency(Number(v))}</span>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
        ],
      } as ColumnGroupType<FlatRow>);
    }

    // Extra charges columns
    cols.push(
      {
        title: "COD (per zone)",
        dataIndex: "codSummary",
        key: "codSummary",
        width: 160,
        render: (_: unknown, row: FlatRow) => (
          <span className="text-xs text-foreground">{row.codSummary}</span>
        ),
      },
      {
        title: "Other",
        dataIndex: "otherCharges",
        key: "otherCharges",
        width: 90,
        align: "right" as const,
        sorter: (a: FlatRow, b: FlatRow) => a.otherCharges - b.otherCharges,
        render: (_: unknown, row: FlatRow) => formatCurrency(row.otherCharges),
      },
    );

    return cols as ResponsiveColumnsType<FlatRow>;
  }, [allZones]);

  if (isLoading) return <Loading tip="Loading rate card..." />;

  return (
    <div>
      <PageHeader
        title="Rate Card"
        subtitle={`Your current pricing plan: ${formatKeyword(data?.plan ?? "basic")}`}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          value={modeFilter}
          onChange={(v) => setModeFilter(v as "all" | "air" | "surface")}
          options={[
            { label: "All", value: "all" },
            { label: "Air (Express)", value: "air" },
            { label: "Surface", value: "surface" },
          ]}
        />
        <Select
          value={providerFilter}
          onChange={setProviderFilter}
          className="min-w-[180px]"
          options={[
            { label: "All Providers", value: "all" },
            ...providers.map((p) => ({ label: formatKeyword(p), value: p })),
          ]}
        />
        {slabs.length > 0 && (
          <Select
            value={safeSlabIndex}
            onChange={(v) => setSlabIndex(Number(v))}
            className="min-w-[180px]"
            options={slabs.map((s, i) => ({
              label: `Slab ${i + 1}: ${formatSlab(s)}`,
              value: i,
            }))}
          />
        )}
        <span className="text-sm text-muted ml-auto">
          {rows.length} courier{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState description="No pricing available for your plan yet." />
      ) : (
        <ResponsiveTable<FlatRow>
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: "max-content" }}
          size="middle"
          bordered
          mobileCard={(row) => (
            <MobileRateCard row={row} zones={allZones} />
          )}
        />
      )}
    </div>
  );
}

/** Mobile-friendly card for a single courier's rates */
function MobileRateCard({
  row,
  zones,
}: {
  row: FlatRow;
  zones: { id: string; name: string; code: string }[];
}) {
  return (
    <div className="rounded-xl border border-border-light bg-background-elevated p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {row.logo ? (
            <img src={row.logo} alt={row.courierName} className="w-8 h-8 rounded object-contain bg-background p-0.5 border border-border-light" />
          ) : (
            <div className="w-8 h-8 rounded bg-background border border-border-light flex items-center justify-center">
              <Truck className="w-4 h-4 text-muted" />
            </div>
          )}
          <div>
            <div className="font-medium text-foreground">{row.courierName}</div>
            <div className="text-xs text-muted">{formatKeyword(row.serviceProvider)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tag color={row.mode === "air" ? "blue" : "green"} className="!m-0">
            {row.mode === "air" ? "Air" : "Surface"}
          </Tag>
          <span className="text-xs text-muted">{row.slabLabel}</span>
        </div>
      </div>

      {/* Zone rates grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="font-medium text-muted">Zone</div>
        <div className="font-medium text-muted text-right">Fwd</div>
        <div className="font-medium text-muted text-right">RTO</div>
        {zones.map((z) => {
          const fwd = row[`fwd_${z.code}`];
          const rto = row[`rto_${z.code}`];
          if (fwd == null && rto == null) return null;
          return (
            <div key={z.code} className="contents">
              <div className="text-foreground">{z.code}</div>
              <div className="text-right font-medium">{fwd != null ? formatCurrency(Number(fwd)) : "—"}</div>
              <div className="text-right text-muted">{rto != null ? formatCurrency(Number(rto)) : "—"}</div>
            </div>
          );
        })}
      </div>

      {/* Extra charges */}
      <div className="flex items-center gap-4 text-xs pt-1 border-t border-border-light">
        <span className="text-muted">
          COD: <strong className="text-foreground">{row.codSummary}</strong>
        </span>
        <span className="text-muted">
          Other: <strong className="text-foreground">{formatCurrency(row.otherCharges)}</strong>
        </span>
      </div>
    </div>
  );
}
