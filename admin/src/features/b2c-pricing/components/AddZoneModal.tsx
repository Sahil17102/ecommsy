import { useEffect } from "react";
import { Modal, Form, Input, message } from "antd";
import { useCreateZone, useUpdateZone } from "../queries";
import type { B2cZone } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  editingZone?: B2cZone | null;
}

export default function AddZoneModal({ open, onClose, editingZone }: Props) {
  const [form] = Form.useForm();
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const isEditing = !!editingZone;

  useEffect(() => {
    if (open && editingZone) {
      form.setFieldsValue({
        name: editingZone.name,
        code: editingZone.code,
        description: editingZone.description,
      });
    }
  }, [open, editingZone, form]);

  function handleSubmit() {
    form.validateFields().then((values) => {
      if (isEditing) {
        updateZone.mutate(
          { id: editingZone.id, ...values },
          {
            onSuccess: () => {
              message.success("Zone updated");
              handleClose();
            },
          },
        );
      } else {
        createZone.mutate(values, {
          onSuccess: () => {
            message.success("Zone created");
            handleClose();
          },
        });
      }
    });
  }

  function handleClose() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title={isEditing ? "Edit Zone" : "Add Zone"}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={createZone.isPending || updateZone.isPending}
      okText={isEditing ? "Save Changes" : "Add Zone"}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="pt-2">
        <Form.Item
          name="name"
          label="Zone Name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="e.g. Zone A" />
        </Form.Item>

        <Form.Item
          name="code"
          label="Zone Code"
          rules={[{ required: true, message: "Code is required" }]}
        >
          <Input
            placeholder="e.g. A"
            style={{ textTransform: "uppercase" }}
          />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            placeholder="e.g. Within state deliveries"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
