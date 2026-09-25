import { useState } from "react";
import { Modal, Upload, Input, Button, Table, Tag, message, Steps } from "antd";
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, Clock, Download } from "lucide-react";
import { usePreviewSettlement, useConfirmSettlement } from "../queries";
import { codRemittanceApi } from "../api";
import type { SettlementPreviewItem } from "../types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettlementCsvModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [previewItems, setPreviewItems] = useState<SettlementPreviewItem[]>([]);
  const [summary, setSummary] = useState({ matched: 0, discrepancies: 0, notFound: 0, alreadyCredited: 0 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [utrNumber, setUtrNumber] = useState("");

  const previewMutation = usePreviewSettlement();
  const confirmMutation = useConfirmSettlement();

  function handleClose() {
    setStep(0);
    setPreviewItems([]);
    setSummary({ matched: 0, discrepancies: 0, notFound: 0, alreadyCredited: 0 });
    setSelectedIds([]);
    setUtrNumber("");
    onClose();
  }

  function parseCsv(text: string): Array<{ awbNumber: string; amount: number }> {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const headers = header.split(",").map((h) => h.trim());

    // Try to find AWB and amount columns
    const awbIdx = headers.findIndex((h) =>
      ["awb", "waybill", "awb number", "awb_number", "docket"].some((k) => h.includes(k)),
    );
    const amountIdx = headers.findIndex((h) =>
      ["cod amount", "cod_amount", "net payable", "net settlement", "remittable", "amount"].some((k) => h.includes(k)),
    );

    if (awbIdx === -1 || amountIdx === -1) return [];

    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return {
        awbNumber: cols[awbIdx] || "",
        amount: parseFloat(cols[amountIdx]) || 0,
      };
    }).filter((r) => r.awbNumber && r.amount > 0);
  }

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);

      if (rows.length === 0) {
        message.error("No valid rows found in CSV. Ensure AWB and amount columns exist.");
        return;
      }

      previewMutation.mutate(rows, {
        onSuccess: (data) => {
          setPreviewItems(data.items);
          setSummary(data.summary);
          // Auto-select matched items
          const matchedIds = data.items
            .filter((i) => i.category === "matched" && i.remittanceId)
            .map((i) => i.remittanceId!);
          setSelectedIds(matchedIds);
          setStep(1);
        },
        onError: () => message.error("Failed to preview settlement"),
      });
    };
    reader.readAsText(file);
    return false; // Prevent upload
  }

  function handleConfirm() {
    if (!utrNumber.trim()) {
      message.error("UTR number is required");
      return;
    }
    if (selectedIds.length === 0) {
      message.error("Select at least one remittance to credit");
      return;
    }

    confirmMutation.mutate(
      { remittanceIds: selectedIds, utrNumber },
      {
        onSuccess: (data) => {
          message.success(data.message);
          handleClose();
        },
        onError: () => message.error("Failed to confirm settlement"),
      },
    );
  }

  const categoryConfig = {
    matched: { color: "green", icon: <CheckCircle2 size={14} />, label: "Matched" },
    discrepancy: { color: "purple", icon: <AlertTriangle size={14} />, label: "Discrepancy" },
    not_found: { color: "red", icon: <XCircle size={14} />, label: "Not Found" },
    already_credited: { color: "default", icon: <Clock size={14} />, label: "Already Credited" },
  };

  const previewColumns = [
    { title: "AWB", dataIndex: "awbNumber", key: "awb", width: 160 },
    {
      title: "Courier Amount",
      dataIndex: "courierAmount",
      key: "courierAmount",
      width: 130,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Our Amount",
      dataIndex: "ourAmount",
      key: "ourAmount",
      width: 130,
      render: (v: number | undefined) => (v != null ? formatCurrency(v) : "—"),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      render: (cat: keyof typeof categoryConfig) => {
        const cfg = categoryConfig[cat];
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "Difference",
      dataIndex: "difference",
      key: "diff",
      width: 110,
      render: (v: number | undefined) =>
        v != null ? (
          <span className={v > 0 ? "text-emerald-600" : "text-red-600"}>
            {v > 0 ? "+" : ""}
            {formatCurrency(v)}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Modal
      title="Settlement CSV Upload"
      open={open}
      onCancel={handleClose}
      width={900}
      footer={
        step === 0
          ? null
          : [
              <Button key="back" onClick={() => setStep(0)}>
                Back
              </Button>,
              <Button
                key="confirm"
                type="primary"
                loading={confirmMutation.isPending}
                onClick={handleConfirm}
              >
                Confirm Credit ({selectedIds.length})
              </Button>,
            ]
      }
      destroyOnClose
    >
      <Steps
        current={step}
        size="small"
        className="mb-6"
        items={[
          { title: "Upload CSV" },
          { title: "Review & Confirm" },
        ]}
      />

      {step === 0 && (
        <>
          <Upload.Dragger
            accept=".csv"
            showUploadList={false}
            beforeUpload={handleUpload}
          >
            <div className="flex flex-col items-center gap-2 py-8">
              <UploadCloud size={40} className="text-muted" />
              <p className="text-sm text-foreground font-medium">
                Drop courier settlement CSV here
              </p>
              <p className="text-xs text-muted">
                Supports Delhivery, SmartShip, NimbusPost formats
              </p>
            </div>
          </Upload.Dragger>
          <button
            type="button"
            onClick={() => codRemittanceApi.downloadCsvTemplate()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download size={13} />
            Download CSV template
          </button>
        </>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
              <div className="text-lg font-bold text-emerald-700">{summary.matched}</div>
              <div className="text-xs text-emerald-600">Matched</div>
            </div>
            <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 text-center">
              <div className="text-lg font-bold text-purple-700">{summary.discrepancies}</div>
              <div className="text-xs text-purple-600">Discrepancies</div>
            </div>
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-center">
              <div className="text-lg font-bold text-red-700">{summary.notFound}</div>
              <div className="text-xs text-red-600">Not Found</div>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center">
              <div className="text-lg font-bold text-gray-700">{summary.alreadyCredited}</div>
              <div className="text-xs text-gray-600">Already Credited</div>
            </div>
          </div>

          {/* UTR Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              UTR Number <span className="text-red-500">*</span>
            </label>
            <Input
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Bank transaction reference (e.g., NEFT20250320123456)"
            />
          </div>

          {/* Preview table */}
          <Table
            columns={previewColumns}
            dataSource={previewItems}
            rowKey="awbNumber"
            size="small"
            scroll={{ y: 300 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
              getCheckboxProps: (record) => ({
                disabled: !record.remittanceId || record.category === "not_found" || record.category === "already_credited",
              }),
            }}
          />
        </div>
      )}
    </Modal>
  );
}
