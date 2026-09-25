import { useState } from "react";
import { Modal, Upload, Table, Tag, Alert, Button, Select, message } from "antd";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle } from "lucide-react";
import type { UploadFile } from "antd";
import Papa from "papaparse";
import { useBulkImportB2bPincodes } from "../queries";
import { regex } from "@/lib/constants";
import type { B2bZone, B2bPincodeFlags, CreateB2bPincodePayload } from "../types";

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

interface PreviewRow extends CreateB2bPincodePayload {
  zoneCode: string;
}

type Step = "upload" | "preview" | "done";

// Accepted CSV flag tokens → payload flag keys (case-insensitive).
const FLAG_TOKEN_MAP: Record<string, keyof B2bPincodeFlags> = {
  oda: "isOda",
  isoda: "isOda",
  remote: "isRemote",
  isremote: "isRemote",
  mall: "isMall",
  ismall: "isMall",
  sez: "isSez",
  issez: "isSez",
  csd: "isCsd",
  iscsd: "isCsd",
  airport: "isAirport",
  isairport: "isAirport",
  highsecurity: "isHighSecurity",
  ishighsecurity: "isHighSecurity",
};

function parseFlags(raw: string | undefined): {
  flags: Partial<B2bPincodeFlags>;
  invalid: string[];
} {
  const flags: Partial<B2bPincodeFlags> = {};
  const invalid: string[] = [];
  if (!raw?.trim()) return { flags, invalid };
  raw
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase().replace(/[\s_-]/g, ""))
    .filter(Boolean)
    .forEach((token) => {
      const key = FLAG_TOKEN_MAP[token];
      if (key) flags[key] = true;
      else invalid.push(token);
    });
  return { flags, invalid };
}

function validateRow(
  row: Record<string, string>,
  index: number,
  courier: Courier,
  zonesByCode: Map<string, B2bZone>,
): { payload: PreviewRow | null; error: ParseError | null } {
  const pincode = row.pincode?.trim();
  const city = row.city?.trim();
  const state = row.state?.trim();
  const zoneCode = row.zone?.trim().toUpperCase();

  if (!pincode) {
    return { payload: null, error: { row: index + 1, error: "Missing pincode" } };
  }
  if (!regex.pincode.test(pincode)) {
    return {
      payload: null,
      error: { row: index + 1, error: `Invalid pincode "${pincode}"` },
    };
  }
  if (!city) {
    return { payload: null, error: { row: index + 1, error: "Missing city" } };
  }
  if (!state) {
    return { payload: null, error: { row: index + 1, error: "Missing state" } };
  }
  if (!zoneCode) {
    return { payload: null, error: { row: index + 1, error: "Missing zone" } };
  }
  const zone = zonesByCode.get(zoneCode);
  if (!zone) {
    return {
      payload: null,
      error: { row: index + 1, error: `Unknown zone code "${zoneCode}"` },
    };
  }

  const { flags, invalid } = parseFlags(row.flags);
  if (invalid.length > 0) {
    return {
      payload: null,
      error: { row: index + 1, error: `Invalid flag(s): ${invalid.join(", ")}` },
    };
  }

  return {
    payload: {
      pincode,
      city,
      state,
      zone: zone.id,
      zoneCode: zone.code,
      courier: courier.id,
      serviceProvider: courier.serviceProvider,
      flags,
    },
    error: null,
  };
}

export default function ImportPincodesCsvModal({ open, onClose, couriers, zones }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [courierId, setCourierId] = useState<string>();
  const [validData, setValidData] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    total: number;
  } | null>(null);

  const bulkImport = useBulkImportB2bPincodes();

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
      transformHeader: (h) => h.trim().toLowerCase(),
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
      error: () => {
        message.error("Failed to parse CSV file");
      },
    });
    return false; // prevent auto upload
  }

  function handleImport() {
    if (validData.length === 0) return;
    const payload: CreateB2bPincodePayload[] = validData.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ zoneCode: _zoneCode, ...rest }) => rest,
    );

    bulkImport.mutate(payload, {
      onSuccess: (data) => {
        setImportResult({ inserted: data.inserted, total: data.total });
        setStep("done");
      },
      onError: () => {
        message.error("Import failed. Please try again.");
      },
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
    { title: "Pincode", dataIndex: "pincode", key: "pincode", width: 100 },
    { title: "City", dataIndex: "city", key: "city" },
    { title: "State", dataIndex: "state", key: "state" },
    {
      title: "Zone",
      dataIndex: "zoneCode",
      key: "zoneCode",
      width: 80,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Flags",
      dataIndex: "flags",
      key: "flags",
      render: (flags: Partial<B2bPincodeFlags>) => {
        const active = Object.entries(flags ?? {}).filter(([, v]) => v);
        return active.length > 0 ? (
          active.map(([k]) => (
            <Tag key={k} bordered={false} className="!text-xs">
              {k.replace(/^is/, "")}
            </Tag>
          ))
        ) : (
          <span className="text-muted text-xs">—</span>
        );
      },
    },
  ];

  const skipped =
    importResult != null ? importResult.total - importResult.inserted : 0;

  return (
    <Modal
      title="Import B2B Pincodes from CSV"
      open={open}
      onCancel={handleClose}
      width={720}
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
                  loading={bulkImport.isPending}
                  disabled={validData.length === 0}
                >
                  Import {validData.length} Pincode
                  {validData.length !== 1 ? "s" : ""}
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
              placeholder="Select the B2B courier these pincodes belong to"
              value={courierId}
              onChange={setCourierId}
              className="w-full"
              showSearch
              optionFilterProp="label"
              options={couriers.map((c) => ({ label: c.name, value: c.id }))}
            />
            <p className="text-xs text-muted mt-1">
              All imported pincodes are mapped to this courier.
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
                Expected columns: pincode, city, state, zone, flags
              </p>
            </div>
          </Upload.Dragger>

          <div className="p-3 bg-surface-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} className="text-muted" />
              <span className="text-xs font-medium text-foreground">CSV Format</span>
            </div>
            <code className="text-xs text-muted block leading-relaxed">
              pincode,city,state,zone,flags
              <br />
              110001,New Delhi,Delhi,A,
              <br />
              400001,Mumbai,Maharashtra,A,"oda,remote"
              <br />
              781001,Guwahati,Assam,E,oda
            </code>
            <p className="text-xs text-muted mt-2">
              <strong>zone</strong> = zone code ({zones.map((z) => z.code).join(", ") || "A, B, C…"}).{" "}
              <strong>flags</strong> (optional) = comma-separated: oda, remote, mall,
              sez, csd, airport, highsecurity.
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
                dataSource={validData.slice(0, 10)}
                rowKey={(r) => `${r.pincode}-${r.zone}`}
                size="small"
                pagination={false}
                locale={{ emptyText: "No valid rows" }}
              />
            </div>
          )}

          {validData.length > 10 && (
            <p className="text-xs text-muted">
              Showing first 10 of {validData.length} rows
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
              {importResult.inserted} imported
            </Tag>
            {skipped > 0 && (
              <Tag color="purple" bordered={false}>
                {skipped} duplicate{skipped !== 1 ? "s" : ""} skipped
              </Tag>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
