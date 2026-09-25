import { useState } from "react";
import { Form, InputNumber, DatePicker, Modal, Select, message } from "antd";
import { useGenerateInvoice } from "../queries";
import { useUsers } from "../../users/queries";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GenerateInvoiceModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const generate = useGenerateInvoice();
  const [userSearch, setUserSearch] = useState("");
  const debouncedSearch = useDebounce(userSearch, 300);

  const { data: usersData, isLoading: usersLoading } = useUsers({
    search: debouncedSearch || undefined,
    limit: 20,
  });

  const userOptions = (usersData?.users ?? []).map((u) => ({
    label: `${u.businessName || u.name || "Unnamed"} — ${u.email || u.phone || "No contact"}`,
    value: u.id,
  }));

  function handleSubmit() {
    form.validateFields().then((values) => {
      generate.mutate(
        {
          userId: values.userId,
          periodStart: values.period[0].toISOString(),
          periodEnd: values.period[1].toISOString(),
          taxRate: values.taxRate,
        },
        {
          onSuccess: (data) => {
            message.success(`Invoice ${data.invoice.invoiceNumber} generated`);
            form.resetFields();
            setUserSearch("");
            onClose();
          },
          onError: (err: any) => {
            message.error(err?.response?.data?.error || "Failed to generate invoice");
          },
        },
      );
    });
  }

  return (
    <Modal
      title="Generate Invoice"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={generate.isPending}
      okText="Generate"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ taxRate: 0 }}>
        <Form.Item
          name="userId"
          label="User"
          rules={[{ required: true, message: "Select a user" }]}
        >
          <Select
            showSearch
            placeholder="Search by name, email or phone"
            filterOption={false}
            onSearch={setUserSearch}
            loading={usersLoading}
            options={userOptions}
            notFoundContent={usersLoading ? "Searching…" : "No users found"}
          />
        </Form.Item>
        <Form.Item
          name="period"
          label="Billing Period"
          rules={[{ required: true, message: "Select billing period" }]}
        >
          <DatePicker.RangePicker className="w-full" />
        </Form.Item>
        <Form.Item name="taxRate" label="Tax Rate (%)">
          <InputNumber className="w-full" min={0} max={100} precision={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
