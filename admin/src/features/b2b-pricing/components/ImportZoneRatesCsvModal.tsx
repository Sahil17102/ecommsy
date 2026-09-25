import { useState } from "react";
import { Modal, Upload, Table, Tag, Alert, Button, Select, message } from "antd";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle } from "lucide-react";
import type { UploadFile } from "antd";
import Papa from "papaparse";
import { useBatchUpsertB2bZoneRates } from "../queries";
import type { B2bZone, UpsertB2bZoneRatePayload } from "../types";

interface Courier {
  id: string;
  name: string;
  serviceProvider: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  couriers: Courier[];
  zones: B2bZone[];
}

interface ParseError {
  row: number;
  error: string;
}

interface PreviewRow extends UpsertB2bZoneRatePayload {
  originCode: string;
  destinationCode: string;
}

type Step = "upload" | "preview" | "done";

const PLAN_VALUES = ["basic", "gold", "platinum", "diamond"];

function toNumber(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : NaN;
}

function validateRow(
  row: Record<string, string>,
  index: number,
  courier: Courier,
  zonesByCode: Map<string, B2bZone>,
): { payload: PreviewRow | null; error: ParseError | null } {
  const err = (msg: string): { payload: null; error: ParseError } => ({
    payload: null,
    error: { row: index + 1, error: msg },
  });

  const plan = row.plan?.trim().toLowerCase();
  if (!plan) return err("Missing plan");
  if (!PLAN_VALUES.includes(plan)) {
    return err(`Invalid plan "${row.plan}" (basic, gold, platinum, diamond)`);
  }

  const originCode = row.originzone?.trim().toUpperCase();
  const destinationCode = row.destinationzone?.trim().toUpperCase();
  if (!originCode) return err("Missing originZone");
  if (!destinationCode) return err("Missing destinationZone");
  const origin = zonesByCode.get(originCode);
  const destination = zonesByCode.get(destinationCode);
  if (!origin) return err(`Unknown origin zone "${originCode}"`);
  if (!destination) return err(`Unknown destination zone "${destinationCode}"`);

  const ratePerKg = toNumber(row.rateperkg);
  if (ratePerKg == null) return err("Missing ratePerKg");
  if (Number.isNaN(ratePerKg) || ratePerKg < 0) return err("Invalid ratePerKg");

  const rtoRaw = toNumber(row.rtorateperkg);
  if (rtoRaw != null && (Number.isNaN(rtoRaw) || rtoRaw < 0)) {
    return err("Invalid rtoRatePerKg");
  }

  const divisorRaw = toNumber(row.volumetricdivisor);
  if (divisorRaw != null && (Number.isNaN(divisorRaw) || divisorRaw < 1)) {
    return err("Invalid volumetricDivisor (must be ≥ 1)");
  }

  return {
    payload: {
      plan,
      courier: courier.id,
      serviceProvider: courier.serviceProvider,
      originZone: origin.id,
      destinationZone: destination.id,
      originCode: origin.code,
      destinationCode: destination.code,
      ratePerKg,
      ...(rtoRaw != null ? { rtoRatePerKg: rtoRaw } : {}),
      ...(divisorRaw != null ? { volumetricDivisor: divisorRaw } : {}),
    },
    error: null,
  };
}

export default function ImportZoneRatesCsvModal({ open, onClose, couriers, zones }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [courierId, setCourierId] = useState<string>();
  const [validData, setValidData] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [importResult, setImportResult] = useState<{
    upserted: number;
    modified: number;
  } | null>(null);

  const batchUpsert = useBatchUpsertB2bZoneRates();

  function handleFileSelect(file: UploadFile) {
    const courier = couriers.find((c) => c.id === courierId);
    if (!courier) {
      message.warning("Select a courier first");
      return false;
    }
    const zonesByCode = new Map(zones.map((z) => [z.code.toUpperCase(), z]));

    const rawFile = file as unknown as File;
    Papa.parse(rawFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""),
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const valid: PreviewRow[] = [];
        const parseErrors: ParseError[] = [];
        rows.forEach((row, i) => {
          const { payload, error } = validateRow(row, i, courier, zonesByCode);
          if (payload) valid.push(payload);
          if (error) parseErrors.push(error);
        });
        setValidData(valid);
        setErrors(parseErrors);
        setStep("preview");
      },
      error: () => message.error("Failed to parse CSV file"),
    });
    return false;
  }

  function handleImport() {
    if (validData.length === 0) return;
    const payload: UpsertB2bZoneRatePayload[] = validData.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ originCode: _o, destinationCode: _d, ...rest }) => rest,
    );
    batchUpsert.mutate(payload, {
      onSuccess: (data) => {
        setImportResult({ upserted: data.upserted, modified: data.modified });
        setStep("done");
      },
      onError: () => message.error("Import failed. Please try again."),
    });
  }

  function handleClose() {
    setStep("upload");
    setCourierId(undefined);
    setValidData([]);
    setErrors([]);
    setImportResult(null);
    onClose();
  }

  const previewColumns = [
    { title: "Plan", dataIndex: "plan", key: "plan", width: 90 },
    {
      title: "Origin",
      dataIndex: "originCode",
      key: "originCode",
      width: 80,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Dest.",
      dataIndex: "destinationCode",
      key: "destinationCode",
      width: 80,
      render: (code: string) => <Tag color="geekblue">{code}</Tag>,
    },
    { title: "Rate/kg", dataIndex: "ratePerKg", key: "ratePerKg", width: 90 },
    {
      title: "RTO/kg",
      dataIndex: "rtoRatePerKg",
      key: "rtoRatePerKg",
      width: 90,
      render: (v: number | undefined) => (v == null ? "—" : v),
    },
    {
      title: "Vol. Div.",
      dataIndex: "volumetricDivisor",
      key: "volumetricDivisor",
      width: 90,
      render: (v: number | undefined) => (v == null ? "default" : v),
    },
  ];

  return (
    <Modal
      title="Import B2B Zone Rates from CSV"
      open={open}
      onCancel={handleClose}
      width={760}
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
                  loading={batchUpsert.isPending}
                  disabled={validData.length === 0}
                >
                  Import {validData.length} Rate{validData.length !== 1 ? "s" : ""}
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
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Courier <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Select the B2B courier these rates belong to"
              value={courierId}
              onChange={setCourierId}
              className="w-full"
              showSearch
              optionFilterProp="label"
              options={couriers.map((c) => ({ label: c.name, value: c.id }))}
            />
            <p className="text-xs text-muted mt-1">
              All imported zone rates are mapped to this courier.
            </p>
          </div>

          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={handleFileSelect}
            disabled={!courierId}
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <UploadIcon size={32} className="text-muted" />
              <p className="text-sm text-foreground font-medium">
                {courierId
                  ? "Click or drag a CSV file here"
                  : "Select a courier to enable upload"}
              </p>
              <p className="text-xs text-muted">
                Columns: plan, originZone, destinationZone, ratePerKg, rtoRatePerKg,
                volumetricDivisor
              </p>
            </div>
          </Upload.Dragger>

          <div className="p-3 bg-surface-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} className="text-muted" />
              <span className="text-xs font-medium text-foreground">CSV Format</span>
            </div>
            <code className="text-xs text-muted block leading-relaxed whitespace-pre overflow-x-auto">
              plan,originZone,destinationZone,ratePerKg,rtoRatePerKg,volumetricDivisor
              {"\n"}basic,A,A,12,7.2,5000
              {"\n"}basic,A,B,18,10.8,5000
              {"\n"}gold,A,A,15,9,5000
            </code>
            <p className="text-xs text-muted mt-2">
              <strong>plan</strong> = basic / gold / platinum / diamond ·{" "}
              <strong>zones</strong> = zone codes ({zones.map((z) => z.code).join(", ") || "A, B…"}).{" "}
              <strong>rtoRatePerKg</strong> &amp; <strong>volumetricDivisor</strong> optional.
            </p>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Tag color="blue" bordered={false}>
              {validData.length} valid
            </Tag>
            {errors.length > 0 && (
              <Tag color="red" bordered={false}>
                {errors.length} error{errors.length !== 1 ? "s" : ""}
              </Tag>
            )}
          </div>

          {errors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${errors.length} row${errors.length !== 1 ? "s" : ""} will be skipped`}
              description={
                <ul className="text-xs mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
                </ul>
              }
            />
          )}

          {validData.length > 0 && (
            <div className="themed-table rounded-lg border border-border-light overflow-hidden overflow-x-auto">
              <Table
                columns={previewColumns}
                dataSource={validData.slice(0, 12)}
                rowKey={(r) => `${r.plan}-${r.originZone}-${r.destinationZone}`}
                size="small"
                pagination={false}
                locale={{ emptyText: "No valid rows" }}
              />
            </div>
          )}
          {validData.length > 12 && (
            <p className="text-xs text-muted">
              Showing first 12 of {validData.length} rows
            </p>
          )}
        </div>
      )}

      {step === "done" && importResult && (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle size={40} className="text-emerald-500" />
          <p className="text-base font-medium text-foreground">Import Complete</p>
          <div className="flex items-center gap-4">
            <Tag color="green" bordered={false}>
              {importResult.upserted} saved
            </Tag>
            {importResult.modified > 0 && (
              <Tag color="blue" bordered={false}>
                {importResult.modified} updated
              </Tag>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
