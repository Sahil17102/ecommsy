import { useState } from "react";
import { Modal, Button, message } from "antd";
import { Copy, Check, KeyRound } from "lucide-react";

interface TempPasswordModalProps {
  open: boolean;
  onClose: () => void;
  targetName: string;
  password: string;
}

export function TempPasswordModal({
  open,
  onClose,
  targetName,
  password,
}: TempPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      message.success("Password copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error("Failed to copy");
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span className="flex items-center gap-2">
          <KeyRound size={16} className="text-primary" />
          Password set
        </span>
      }
      footer={
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <p className="text-sm text-muted">
        A new temporary password has been set for{" "}
        <span className="font-medium text-foreground">{targetName}</span>. Share it
        with them now — it won't be shown again.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border-light bg-background p-3">
        <code className="flex-1 truncate font-mono text-sm text-foreground">
          {password}
        </code>
        <Button
          size="small"
          icon={copied ? <Check size={12} /> : <Copy size={12} />}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted">
        They can sign in with this temporary password and update it from Settings →
        Change Password.
      </p>
    </Modal>
  );
}
