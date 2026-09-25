import { Form, Input, Modal, message } from "antd";
import { useUpdateNotes } from "../queries";
import type { CodRemittanceItem } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  remittance: CodRemittanceItem | null;
}

export default function NotesModal({ open, onClose, remittance }: Props) {
  const [form] = Form.useForm();
  const updateNotes = useUpdateNotes();

  function handleSubmit() {
    if (!remittance) return;
    form.validateFields().then((values) => {
      updateNotes.mutate(
        { id: remittance.id, notes: values.notes },
        {
          onSuccess: () => {
            message.success("Notes updated");
            form.resetFields();
            onClose();
          },
        },
      );
    });
  }

  return (
    <Modal
      title="Edit Notes"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={updateNotes.isPending}
      okText="Save Notes"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ notes: remittance?.notes || "" }}
      >
        <Form.Item
          name="notes"
          label="Notes"
          rules={[{ max: 1024, message: "Max 1024 characters" }]}
        >
          <Input.TextArea rows={4} placeholder="Add notes about this remittance..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
