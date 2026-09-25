import { Form, Input, InputNumber, Modal, DatePicker, message } from "antd";
import { useCreditRemittance } from "../queries";
import type { CodRemittanceItem } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  remittance: CodRemittanceItem | null;
}

export default function CreditModal({ open, onClose, remittance }: Props) {
  const [form] = Form.useForm();
  const creditMutation = useCreditRemittance();

  function handleSubmit() {
    if (!remittance) return;
    form.validateFields().then((values) => {
      creditMutation.mutate(
        {
          id: remittance.id,
          utrNumber: values.utrNumber,
          creditDate: values.creditDate?.toISOString(),
          amount: values.amount,
          notes: values.notes,
        },
        {
          onSuccess: () => {
            message.success("Remittance credited successfully");
            form.resetFields();
            onClose();
          },
          onError: (err: any) => {
            message.error(err?.response?.data?.error || "Failed to credit");
          },
        },
      );
    });
  }

  return (
    <Modal
      title="Credit Remittance"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={creditMutation.isPending}
      okText="Credit Wallet"
      destroyOnClose
    >
      {remittance && (
        <div className="mb-4 p-3 rounded-lg bg-background-elevated border border-border-light text-sm space-y-1">
          <div>
            <span className="text-muted">Order:</span>{" "}
            <span className="font-medium">{remittance.orderNumber}</span>
          </div>
          <div>
            <span className="text-muted">AWB:</span>{" "}
            <span className="font-medium">{remittance.awbNumber}</span>
          </div>
          <div>
            <span className="text-muted">Remittable Amount:</span>{" "}
            <span className="font-bold text-emerald-600">
              ₹{remittance.remittableAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
      <Form form={form} layout="vertical" initialValues={{ amount: remittance?.remittableAmount }}>
        <Form.Item name="utrNumber" label="UTR Number">
          <Input placeholder="Bank transaction reference" />
        </Form.Item>
        <Form.Item name="creditDate" label="Credit Date">
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item name="amount" label="Amount (override)">
          <InputNumber className="w-full" min={0.01} precision={2} prefix="₹" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
