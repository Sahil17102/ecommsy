import { Modal, Form, Input, Button, Switch, Typography, message } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useCreateProvider } from "../queries";
import { COMMON_FIELD_PRESETS } from "../config";
import type { CredentialFieldDef } from "../types";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CredentialRow {
  key?: string;
  value?: string;
}

interface FormValues {
  slug: string;
  name: string;
  baseUrl?: string;
  isActive: boolean;
  credentials?: CredentialRow[];
}

export default function AddProviderModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createProvider = useCreateProvider();

  function handleSubmit() {
    form.validateFields().then((values) => {
      const rows = (values.credentials ?? []).filter(
        (r) => r.key?.trim() && r.value?.trim(),
      );

      const b2cValues: Record<string, string> = {};
      const b2cFields: CredentialFieldDef[] = [];
      for (const row of rows) {
        const key = row.key!.trim();
        b2cValues[key] = row.value!.trim();
        const preset = COMMON_FIELD_PRESETS.find((p) => p.key === key);
        b2cFields.push(
          preset ?? {
            key,
            label: prettifyKey(key),
            type: /password|secret|token|key/i.test(key) ? "password" : "text",
            required: false,
          },
        );
      }

      createProvider.mutate(
        {
          slug: values.slug.trim().toLowerCase(),
          name: values.name.trim(),
          baseUrl: values.baseUrl?.trim() || undefined,
          isActive: values.isActive,
          credentials: rows.length
            ? { b2c: { values: b2cValues, fields: b2cFields, description: "" } }
            : undefined,
        },
        {
          onSuccess: () => {
            message.success("Service provider added");
            handleClose();
          },
          onError: (err) => {
            const detail =
              (err as { response?: { data?: { error?: string; message?: string } } })?.response
                ?.data?.error ??
              (err as { response?: { data?: { error?: string; message?: string } } })?.response
                ?.data?.message ??
              (err as Error).message;
            message.error(detail || "Failed to add provider");
          },
        },
      );
    });
  }

  function handleClose() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title="Add Service Provider"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={createProvider.isPending}
      okText="Add Provider"
      width={560}
      destroyOnClose
    >
      <div className="mb-3">
        <Text className="text-xs text-muted">
          Developer tool — seed a new courier integration with optional B2C credentials.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        className="pt-2"
        initialValues={{ isActive: true, credentials: [] }}
      >
        <Form.Item
          name="slug"
          label="Slug"
          rules={[
            { required: true, message: "Slug is required" },
            {
              pattern: /^[a-z0-9_-]+$/,
              message: "Lowercase letters, digits, hyphens, underscores only",
            },
            { max: 64, message: "Max 64 characters" },
          ]}
        >
          <Input placeholder="e.g. dtdc" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Display Name"
          rules={[{ required: true, message: "Display name is required" }]}
        >
          <Input placeholder="e.g. DTDC" />
        </Form.Item>

        <Form.Item
          name="baseUrl"
          label="Base URL"
          rules={[{ type: "url", message: "Must be a valid URL" }]}
        >
          <Input placeholder="https://api.example.com" />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>

        <div className="pt-2 border-t border-border-light">
          <Text strong className="text-sm !text-foreground block mb-1">
            B2C Credentials
          </Text>
          <Text className="text-xs text-muted block mb-3">
            Optional. Add later from the row expander if you prefer.
          </Text>

          <Form.List name="credentials">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="flex gap-2 items-start mb-2">
                    <Form.Item
                      {...rest}
                      name={[name, "key"]}
                      className="!mb-0 flex-1"
                      rules={[{ required: true, message: "Key required" }]}
                    >
                      <Input placeholder="field key (e.g. apiKey)" />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "value"]}
                      className="!mb-0 flex-1"
                      rules={[{ required: true, message: "Value required" }]}
                    >
                      <Input.Password placeholder="value" visibilityToggle />
                    </Form.Item>
                    <Button
                      type="text"
                      onClick={() => remove(name)}
                      icon={<Trash2 size={14} className="text-red-500" />}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({})}
                  icon={<Plus size={14} />}
                  block
                >
                  Add credential field
                </Button>
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
}

function prettifyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
