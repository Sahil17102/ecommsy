import { useState } from "react";
import { Modal, Upload, Table, Tag, Alert, Button, message } from "antd";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle } from "lucide-react";
import type { UploadFile } from "antd";
import Papa from "papaparse";
import { useBulkImportLocations } from "../queries";
import { TAG_CONFIG } from "../config";
import type { CreateLocationPayload, LocationTag } from "../types";
import { regex } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ParseError {
  row: number;
  error: string;
}

type Step = "upload" | "preview" | "done";

const VALID_TAGS = Object.keys(TAG_CONFIG);

function validateRow(
  row: Record<string, string>,
  index: number,
): { payload: CreateLocationPayload | null; error: ParseError | null } {
  const pincode = row.pincode?.trim();
  const city = row.city?.trim();
  const state = row.state?.trim();
  const tagsRaw = row.tags?.trim();

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

  let tags: LocationTag[] = [];
  if (tagsRaw) {
    const parsed = tagsRaw.split(",").map((t) => t.trim().toLowerCase());
    const invalid = parsed.filter((t) => !VALID_TAGS.includes(t));
    if (invalid.length > 0) {
      return {
        payload: null,
        error: {
          row: index + 1,
          error: `Invalid tag(s): ${invalid.join(", ")}`,
        },
      };
    }
    tags = parsed as LocationTag[];
  }

  return { payload: { pincode, city, state, tags }, error: null };
}

export default function ImportCsvModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [validData, setValidData] = useState<CreateLocationPayload[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    duplicates: number;
  } | null>(null);

  const bulkImport = useBulkImportLocations();

  function handleFileSelect(file: UploadFile) {
    const rawFile = file as unknown as File;
    Papa.parse(rawFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const valid: CreateLocationPayload[] = [];
        const parseErrors: ParseError[] = [];

        rows.forEach((row, i) => {
          const { payload, error } = validateRow(row, i);
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

    bulkImport.mutate(
      { locations: validData },
      {
        onSuccess: (data) => {
          setImportResult({
            inserted: data.inserted,
            duplicates: data.duplicates,
          });
          setStep("done");
        },
      },
    );
  }

  function handleClose() {
    setStep("upload");
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
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (tags: LocationTag[]) =>
        tags?.length > 0
          ? tags.map((t) => (
              <Tag
                key={t}
                color={TAG_CONFIG[t]?.color}
                bordered={false}
                className="!text-xs"
              >
                {TAG_CONFIG[t]?.label ?? t}
              </Tag>
            ))
          : <span className="text-muted text-xs">—</span>,
    },
  ];

  return (
    <Modal
      title="Import Locations from CSV"
      open={open}
      onCancel={handleClose}
      width={680}
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
                  Import {validData.length} Location
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
        <div className="py-4">
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
                Expected columns: pincode, city, state, tags
              </p>
            </div>
          </Upload.Dragger>

          <div className="mt-4 p-3 bg-surface-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} className="text-muted" />
              <span className="text-xs font-medium text-foreground">
                CSV Format
              </span>
            </div>
            <code className="text-xs text-muted block leading-relaxed">
              pincode,city,state,tags
              <br />
              110001,New Delhi,Delhi,"north,metro"
              <br />
              400001,Mumbai,Maharashtra,"west,metro"
              <br />
              560001,Bangalore,Karnataka,south
            </code>
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
                  {errors.length > 10 && (
                    <li>...and {errors.length - 10} more</li>
                  )}
                </ul>
              }
            />
          )}

          {validData.length > 0 && (
            <div className="themed-table rounded-lg border border-border-light overflow-hidden overflow-x-auto">
              <Table
                columns={previewColumns}
                dataSource={validData.slice(0, 10)}
                rowKey="pincode"
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
          <p className="text-base font-medium text-foreground">
            Import Complete
          </p>
          <div className="flex items-center gap-4">
            <Tag color="green" bordered={false}>
              {importResult.inserted} imported
            </Tag>
            {importResult.duplicates > 0 && (
              <Tag color="purple" bordered={false}>
                {importResult.duplicates} duplicates skipped
              </Tag>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
