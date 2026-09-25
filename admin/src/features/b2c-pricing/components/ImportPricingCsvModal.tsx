import { useMemo, useState } from "react";
import { Modal, Upload, Table, Tag, Alert, Button, message } from "antd";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle } from "lucide-react";
import type { UploadFile } from "antd";
import Papa from "papaparse";
import { useCouriers } from "@/features/couriers/queries";
import { usePlans } from "@/features/plans/queries";
import { useB2cZones, useBatchUpsertPricing } from "../queries";
import type {
  BatchUpsertPricingPayload,
  SlabRate,
  WeightSlab,
  ZoneRate,
} from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ParseError {
  row: number;
  error: string;
}

interface ParsedRow {
  courierId: string;
  courierName: string;
  plan: string;
  zoneId: string;
  mode: "air" | "surface";
  otherCharges: number;
  minWeight: number;
  maxWeight: number | null;
  rate: SlabRate;
}

type Step = "upload" | "preview" | "done";

const OPEN_ENDED = new Set(["", "inf", "infinity", "∞", "+", "open", "none", "null"]);

function toNumber(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return 0;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function slabKey(min: number, max: number | null): string {
  return `${min}_${max == null ? "INF" : max}`;
}

export default function ImportPricingCsvModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [payloads, setPayloads] = useState<BatchUpsertPricingPayload[]>([]);
  const [courierErrors, setCourierErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    couriers: number;
    plansSaved: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: couriersData } = useCouriers({ limit: 250, businessType: "b2c" });
  const { data: zonesData } = useB2cZones({ limit: 250 });
  const { data: plansData } = usePlans({ isActive: true });
  const batchUpsert = useBatchUpsertPricing();

  const couriers = useMemo(() => couriersData?.couriers ?? [], [couriersData]);
  const zones = useMemo(
    () => (zonesData?.zones ?? []).filter((z) => z.isActive),
    [zonesData],
  );
  const plans = useMemo(() => plansData?.plans ?? [], [plansData]);

  // Lookup maps (lower-cased keys → canonical value).
  const courierLookup = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const c of couriers) {
      const entry = { id: c.id, name: c.name };
      [c.name, c.serviceProvider, c.serviceProviderDisplayName]
        .filter(Boolean)
        .forEach((k) => m.set(String(k).trim().toLowerCase(), entry));
    }
    return m;
  }, [couriers]);

  const planLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans) {
      m.set(p.slug.trim().toLowerCase(), p.slug);
      m.set(p.name.trim().toLowerCase(), p.slug);
    }
    return m;
  }, [plans]);

  const zoneLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of zones) {
      m.set(z.code.trim().toLowerCase(), z.id);
      m.set(z.name.trim().toLowerCase(), z.id);
    }
    return m;
  }, [zones]);

  function parseRow(
    row: Record<string, string>,
    i: number,
  ): { parsed: ParsedRow | null; error: ParseError | null } {
    const courierKey = row.courier?.trim().toLowerCase();
    const planKey = row.plan?.trim().toLowerCase();
    const zoneKey = row.zone?.trim().toLowerCase();
    const err = (msg: string): { parsed: null; error: ParseError } => ({
      parsed: null,
      error: { row: i + 1, error: msg },
    });

    if (!courierKey) return err("Missing courier");
    const courier = courierLookup.get(courierKey);
    if (!courier) return err(`Unknown courier "${row.courier}"`);

    if (!planKey) return err("Missing plan");
    const plan = planLookup.get(planKey);
    if (!plan) return err(`Unknown plan "${row.plan}"`);

    if (!zoneKey) return err("Missing zone");
    const zoneId = zoneLookup.get(zoneKey);
    if (!zoneId) return err(`Unknown zone "${row.zone}"`);

    const modeRaw = (row.mode?.trim().toLowerCase() || "surface");
    if (modeRaw !== "air" && modeRaw !== "surface") {
      return err(`Mode must be "air" or "surface" (got "${row.mode}")`);
    }

    const otherCharges = toNumber(row.othercharges);
    if (otherCharges == null || otherCharges < 0) return err("Invalid otherCharges");

    const minWeight = toNumber(row.minweight);
    if (minWeight == null || minWeight < 0) return err("Invalid minWeight");

    const maxRaw = row.maxweight?.trim().toLowerCase() ?? "";
    let maxWeight: number | null;
    if (OPEN_ENDED.has(maxRaw)) {
      maxWeight = null;
    } else {
      const m = Number(maxRaw);
      if (!Number.isFinite(m) || m <= 0) return err(`Invalid maxWeight "${row.maxweight}"`);
      if (m <= minWeight) return err("maxWeight must be greater than minWeight");
      maxWeight = m;
    }

    const forward = toNumber(row.forward);
    const rto = toNumber(row.rto);
    const codCharges = toNumber(row.codcharges);
    const codPercent = toNumber(row.codpercent);
    if (forward == null || rto == null || codCharges == null || codPercent == null) {
      return err("Invalid rate value (forward / rto / codCharges / codPercent)");
    }
    if (forward < 0 || rto < 0 || codCharges < 0) return err("Rates must be non-negative");
    if (codPercent < 0 || codPercent > 100) return err("codPercent must be 0-100");

    return {
      parsed: {
        courierId: courier.id,
        courierName: courier.name,
        plan,
        zoneId,
        mode: modeRaw,
        otherCharges,
        minWeight,
        maxWeight,
        rate: { forward, rto, codCharges, codPercent },
      },
      error: null,
    };
  }

  /** Group parsed rows into one batch-upsert payload per courier. */
  function buildPayloads(parsed: ParsedRow[]): {
    payloads: BatchUpsertPricingPayload[];
    courierErrors: string[];
  } {
    const byCourier = new Map<string, ParsedRow[]>();
    for (const r of parsed) {
      const list = byCourier.get(r.courierId) ?? [];
      list.push(r);
      byCourier.set(r.courierId, list);
    }

    const result: BatchUpsertPricingPayload[] = [];
    const courierErrs: string[] = [];

    for (const [courierId, group] of byCourier) {
      const courierName = group[0].courierName;

      // Derive the courier's weight slabs (distinct min/max), sorted ascending.
      const slabMap = new Map<string, WeightSlab>();
      for (const r of group) {
        slabMap.set(slabKey(r.minWeight, r.maxWeight), {
          minWeight: r.minWeight,
          maxWeight: r.maxWeight,
        });
      }
      const weightSlabs = Array.from(slabMap.values()).sort(
        (a, b) => a.minWeight - b.minWeight,
      );

      // Validate slab contiguity (mirrors server rules).
      let slabError: string | null = null;
      for (let i = 0; i < weightSlabs.length; i++) {
        const s = weightSlabs[i];
        if (i < weightSlabs.length - 1 && s.maxWeight === null) {
          slabError = "only the last weight slab can be open-ended";
          break;
        }
        if (i > 0 && s.minWeight !== weightSlabs[i - 1].maxWeight) {
          slabError = `weight slabs are not contiguous near ${s.minWeight}g`;
          break;
        }
      }
      if (slabError) {
        courierErrs.push(`${courierName}: ${slabError} — skipped`);
        continue;
      }

      const slabIndex = new Map<string, number>();
      weightSlabs.forEach((s, idx) => slabIndex.set(slabKey(s.minWeight, s.maxWeight), idx));

      const emptyRate = (): SlabRate => ({ forward: 0, rto: 0, codCharges: 0, codPercent: 0 });

      // planRates[plan] -> Map<zoneId, SlabRate[]>
      const planRates: Record<string, Map<string, SlabRate[]>> = {};
      for (const r of group) {
        const zoneMap = (planRates[r.plan] ??= new Map());
        let slabRates = zoneMap.get(r.zoneId);
        if (!slabRates) {
          slabRates = weightSlabs.map(() => emptyRate());
          zoneMap.set(r.zoneId, slabRates);
        }
        const idx = slabIndex.get(slabKey(r.minWeight, r.maxWeight))!;
        slabRates[idx] = r.rate;
      }

      const planRatesPayload: Record<string, ZoneRate[]> = {};
      for (const [plan, zoneMap] of Object.entries(planRates)) {
        planRatesPayload[plan] = Array.from(zoneMap.entries()).map(([zone, slabRates]) => ({
          zone,
          slabRates,
        }));
      }

      result.push({
        courierId,
        mode: group[0].mode,
        otherCharges: group[0].otherCharges,
        weightSlabs,
        planRates: planRatesPayload,
      });
    }

    return { payloads: result, courierErrors: courierErrs };
  }

  function handleFileSelect(file: UploadFile) {
    if (couriers.length === 0 || zones.length === 0 || plans.length === 0) {
      message.warning("Couriers, zones and plans must load first. Try again in a moment.");
      return false;
    }
    const rawFile = file as unknown as File;
    Papa.parse(rawFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""),
      complete: (results) => {
        const raw = results.data as Record<string, string>[];
        const parsed: ParsedRow[] = [];
        const parseErrors: ParseError[] = [];
        raw.forEach((r, i) => {
          const { parsed: p, error } = parseRow(r, i);
          if (p) parsed.push(p);
          if (error) parseErrors.push(error);
        });
        const { payloads: built, courierErrors: cErrs } = buildPayloads(parsed);
        setRows(parsed);
        setErrors(parseErrors);
        setPayloads(built);
        setCourierErrors(cErrs);
        setStep("preview");
      },
      error: () => message.error("Failed to parse CSV file"),
    });
    return false;
  }

  async function handleImport() {
    if (payloads.length === 0) return;
    setImporting(true);
    let plansSaved = 0;
    let couriersDone = 0;
    try {
      for (const payload of payloads) {
        const res = await batchUpsert.mutateAsync(payload);
        plansSaved += res.saved ?? 0;
        couriersDone += 1;
      }
      setImportResult({ couriers: couriersDone, plansSaved });
      setStep("done");
    } catch {
      message.error(
        `Import failed after ${couriersDone} courier(s). Some pricing may have been saved.`,
      );
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setStep("upload");
    setRows([]);
    setErrors([]);
    setPayloads([]);
    setCourierErrors([]);
    setImportResult(null);
    onClose();
  }

  const zoneCodeById = useMemo(() => {
    const m = new Map<string, string>();
    zones.forEach((z) => m.set(z.id, z.code));
    return m;
  }, [zones]);

  const previewColumns = [
    { title: "Courier", dataIndex: "courierName", key: "courierName" },
    { title: "Plan", dataIndex: "plan", key: "plan", width: 90 },
    {
      title: "Zone",
      dataIndex: "zoneId",
      key: "zoneId",
      width: 80,
      render: (id: string) => <Tag color="purple">{zoneCodeById.get(id) ?? id}</Tag>,
    },
    {
      title: "Slab",
      key: "slab",
      width: 110,
      render: (_: unknown, r: ParsedRow) =>
        `${r.minWeight}–${r.maxWeight == null ? "∞" : r.maxWeight}g`,
    },
    { title: "Fwd", key: "fwd", width: 64, render: (_: unknown, r: ParsedRow) => r.rate.forward },
    { title: "RTO", key: "rto", width: 64, render: (_: unknown, r: ParsedRow) => r.rate.rto },
    { title: "COD₹", key: "cod", width: 64, render: (_: unknown, r: ParsedRow) => r.rate.codCharges },
    { title: "COD%", key: "codp", width: 64, render: (_: unknown, r: ParsedRow) => r.rate.codPercent },
  ];

  return (
    <Modal
      title="Import B2C Pricing from CSV"
      open={open}
      onCancel={handleClose}
      width={860}
      destroyOnClose
      footer={
        step === "upload"
          ? null
          : step === "preview"
            ? [
                <Button key="cancel" onClick={handleClose}>
                  Cancel
                </Button>,
                <Button
                  key="import"
                  type="primary"
                  onClick={handleImport}
                  loading={importing}
                  disabled={payloads.length === 0}
                >
                  Import {payloads.length} Courier{payloads.length !== 1 ? "s" : ""}
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={handleClose}>
                  Done
                </Button>,
              ]
      }
    >
      {step === "upload" && (
        <div className="py-4 space-y-4">
          <Alert
            type="info"
            showIcon
            message="Bulk import replaces pricing per courier + plan"
            description="Each (courier, plan) in the file fully replaces that plan's existing rates. Provide every zone & weight slab you want kept for the plans you include."
          />
          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={handleFileSelect}
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <UploadIcon size={32} className="text-muted" />
              <p className="text-sm text-foreground font-medium">
                Click or drag a CSV file here
              </p>
              <p className="text-xs text-muted">
                One row per courier × plan × zone × weight slab
              </p>
            </div>
          </Upload.Dragger>

          <div className="p-3 bg-surface-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} className="text-muted" />
              <span className="text-xs font-medium text-foreground">CSV Format</span>
            </div>
            <code className="text-xs text-muted block leading-relaxed whitespace-pre overflow-x-auto">
              courier,plan,zone,mode,otherCharges,minWeight,maxWeight,forward,rto,codCharges,codPercent
              {"\n"}Delhivery,basic,A,surface,0,0,500,35,25,40,2
              {"\n"}Delhivery,basic,A,surface,0,500,,55,40,40,2
              {"\n"}Delhivery,basic,B,surface,0,0,500,45,30,40,2
            </code>
            <p className="text-xs text-muted mt-2">
              <strong>courier</strong> = name or service provider · <strong>plan</strong> =
              plan slug/name · <strong>zone</strong> = zone code/name · weights in grams ·
              blank <strong>maxWeight</strong> = open-ended (e.g. 500g+).
            </p>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Tag color="blue" bordered={false}>
              {rows.length} valid row{rows.length !== 1 ? "s" : ""}
            </Tag>
            <Tag color="geekblue" bordered={false}>
              {payloads.length} courier{payloads.length !== 1 ? "s" : ""}
            </Tag>
            {errors.length > 0 && (
              <Tag color="red" bordered={false}>
                {errors.length} error{errors.length !== 1 ? "s" : ""}
              </Tag>
            )}
          </div>

          {(errors.length > 0 || courierErrors.length > 0) && (
            <Alert
              type="warning"
              showIcon
              message="Some rows / couriers will be skipped"
              description={
                <ul className="text-xs mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                  {courierErrors.map((e, i) => (
                    <li key={`c${i}`}>{e}</li>
                  ))}
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={`r${i}`}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
                </ul>
              }
            />
          )}

          {rows.length > 0 && (
            <div className="themed-table rounded-lg border border-border-light overflow-hidden overflow-x-auto">
              <Table
                columns={previewColumns}
                dataSource={rows.slice(0, 12)}
                rowKey={(r) => `${r.courierId}-${r.plan}-${r.zoneId}-${r.minWeight}`}
                size="small"
                pagination={false}
                locale={{ emptyText: "No valid rows" }}
              />
            </div>
          )}
          {rows.length > 12 && (
            <p className="text-xs text-muted">Showing first 12 of {rows.length} rows</p>
          )}
        </div>
      )}

      {step === "done" && importResult && (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle size={40} className="text-emerald-500" />
          <p className="text-base font-medium text-foreground">Import Complete</p>
          <div className="flex items-center gap-4">
            <Tag color="green" bordered={false}>
              {importResult.couriers} courier{importResult.couriers !== 1 ? "s" : ""}
            </Tag>
            <Tag color="blue" bordered={false}>
              {importResult.plansSaved} plan-pricing saved
            </Tag>
          </div>
        </div>
      )}
    </Modal>
  );
}
