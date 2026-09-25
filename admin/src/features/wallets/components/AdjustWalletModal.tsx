import { useEffect, useState } from "react";
import { Modal, Input, InputNumber, message } from "antd";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useAdjustWallet } from "../queries";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
  currentBalance: number;
  initialType?: "credit" | "debit";
}

export default function AdjustWalletModal({
  open,
  onClose,
  userId,
  userName,
  currentBalance,
  initialType = "credit",
}: Props) {
  const adjust = useAdjustWallet();
  const [type, setType] = useState<"credit" | "debit">(initialType);
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setType(initialType);
      setAmount(null);
      setReason("");
      setNotes("");
    }
  }, [open, initialType]);

  const isCredit = type === "credit";
  const newBalance = amount
    ? isCredit
      ? currentBalance + amount
      : currentBalance - amount
    : currentBalance;
  const canSubmit = amount && amount > 0 && reason.trim().length > 0;
  const insufficientBalance = !isCredit && amount ? amount > currentBalance : false;

  async function handleOk() {
    if (!userId || !amount || !reason.trim()) return;
    adjust.mutate(
      { userId, type, amount, reason: reason.trim(), notes: notes.trim() || undefined },
      {
        onSuccess: (data) => {
          message.success(data.message);
          onClose();
        },
        onError: (err) => message.error(err.message),
      },
    );
  }

  return (
    <Modal
      title="Adjust Wallet"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={440}
    >
      <div className="space-y-4">
        {/* User & balance summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border-light">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {(userName ?? "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground leading-tight">{userName ?? "User"}</p>
              <p className="text-xs text-muted">Current: <span className="font-semibold tabular-nums">{formatCurrency(currentBalance)}</span></p>
            </div>
          </div>
        </div>

        {/* Credit / Debit toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("credit")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
              isCredit
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-border-light text-muted hover:border-border hover:text-foreground"
            }`}
          >
            <ArrowUpCircle size={15} />
            Credit
          </button>
          <button
            type="button"
            onClick={() => setType("debit")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
              !isCredit
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-border-light text-muted hover:border-border hover:text-foreground"
            }`}
          >
            <ArrowDownCircle size={15} />
            Debit
          </button>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Amount (₹)</label>
          <InputNumber
            className="!w-full"
            placeholder="0.00"
            min={0.01}
            precision={2}
            prefix="₹"
            size="large"
            value={amount}
            onChange={(val) => setAmount(val)}
            status={insufficientBalance ? "error" : undefined}
          />
          {insufficientBalance && (
            <p className="text-xs text-red-500 mt-1">Insufficient balance for this debit</p>
          )}
        </div>

        {/* New balance preview */}
        {amount != null && amount > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border-light text-sm">
            <span className="text-muted">New balance</span>
            <span className={`font-semibold tabular-nums ${newBalance < 0 ? "text-red-500" : isCredit ? "text-emerald-600" : "text-foreground"}`}>
              {formatCurrency(newBalance)}
            </span>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">
            Reason <span className="text-red-400">*</span>
          </label>
          <Input.TextArea
            rows={2}
            placeholder="e.g. Promotional credit, Refund for order #123"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted">Internal Notes</label>
          <Input.TextArea
            rows={2}
            placeholder="Optional internal notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border-light text-sm font-medium text-muted hover:text-foreground hover:border-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOk}
            disabled={!canSubmit || insufficientBalance || adjust.isPending}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isCredit
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {adjust.isPending
              ? "Processing..."
              : `${isCredit ? "Credit" : "Debit"} ${amount ? formatCurrency(amount) : ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
