import { useEffect, useMemo, useState } from "react";
import { Form, Input, Button, Switch, Spin, Typography, message, Alert, Select, Upload, AutoComplete } from "antd";
import type { UploadProps } from "antd";
import { Eye, EyeOff, Image as ImageIcon, Save, ShieldCheck, Link2, Trash2, Upload as UploadIcon, Plus } from "lucide-react";
import {
  useProviderCredentials,
  useUpdateCredentials,
  useUpdateProvider,
  useUploadProviderLogo,
} from "../queries";
import type {
  ProviderListItem,
  CredentialFieldDef,
  CredentialBlock,
} from "../types";
import { COMMON_FIELD_PRESETS, resolveBlockData, resolveLogoUrl, toFieldKey } from "../config";

const { Text } = Typography;



interface Props {
  provider: ProviderListItem;
}

export default function ProviderCredentialsExpanded({ provider }: Props) {
  const { data: creds, isLoading, error } = useProviderCredentials(provider.id);
  const updateCreds = useUpdateCredentials();
  const updateProvider = useUpdateProvider();

  function handleSave(type: "b2c" | "b2b", credentials: Record<string, string>) {
    updateCreds.mutate(
      { id: provider.id, type, credentials },
      { onSuccess: () => message.success(`${type.toUpperCase()} credentials updated`) },
    );
  }

  function handleToggleSameAsB2c(checked: boolean) {
    updateProvider.mutate(
      { id: provider.id, b2bSameAsB2c: checked },
      {
        onSuccess: () =>
          message.success(checked ? "B2B now uses B2C credentials" : "B2B credentials unlinked"),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }

  if (!creds) {
    return (
      <Alert
        type="error"
        message="Could not load credentials"
        description={extractErrorMessage(error)}
        showIcon
      />
    );
  }

  const isSameAsB2c = creds.b2b.sameAsB2c ?? provider.b2b.sameAsB2c ?? false;
  const isB2cOnly = provider.serviceProvider === "delhivery";

  return (
    <div className="space-y-4">
      <LogoUploadCard provider={provider} />

      <div className={`grid grid-cols-1 gap-4 ${isB2cOnly ? "" : "lg:grid-cols-2"}`}>
        <CredentialCard
          icon={<ShieldCheck size={14} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="B2C Credentials"
          description={creds.b2c.description}
          block={creds.b2c}
          onSave={(values) => handleSave("b2c", values)}
          saving={updateCreds.isPending}
          label="B2C"
          allowExtraFields={!isB2cOnly}
        />

        {!isB2cOnly && (
          <CredentialCard
            icon={<ShieldCheck size={14} className="text-primary" />}
            iconBg="bg-primary-bg"
            title="B2B (LTL) Credentials"
            description={creds.b2b.description}
            block={creds.b2b}
            onSave={(values) => handleSave("b2b", values)}
            saving={updateCreds.isPending}
            label="B2B"
            linkedToggle={{
              checked: isSameAsB2c,
              loading: updateProvider.isPending,
              onChange: handleToggleSameAsB2c,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo upload card
// ---------------------------------------------------------------------------

const LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.svg";
const LOGO_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

function LogoUploadCard({ provider }: { provider: ProviderListItem }) {
  const uploadLogo = useUploadProviderLogo();
  const [preview, setPreview] = useState<string | null>(null);
  const currentLogo = resolveLogoUrl(provider.logoUrl);

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    if (file.size > LOGO_MAX_BYTES) {
      message.error("Logo must be under 1 MB");
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    uploadLogo.mutate(
      { id: provider.id, file },
      {
        onSuccess: () => {
          message.success("Logo updated");
          setPreview(null);
        },
        onError: (err) => {
          const detail =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            (err as Error).message;
          message.error(detail || "Logo upload failed");
          setPreview(null);
        },
      },
    );
    return false; // prevent antd's auto-upload — we handle it via mutation
  };

  return (
    <div className="border border-border-light rounded-2xl p-4 bg-background-elevated flex items-center gap-4 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-primary-bg border border-border flex items-center justify-center overflow-hidden shrink-0">
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : currentLogo ? (
          <img src={currentLogo} alt={provider.displayName} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={22} className="text-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Text strong className="text-sm !text-foreground block">
          Provider Logo
        </Text>
        <Text className="text-xs text-muted block">
          PNG, JPEG, WebP, or SVG · max 1 MB
        </Text>
      </div>

      <Upload
        accept={LOGO_ACCEPT}
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={uploadLogo.isPending}
      >
        <Button icon={<UploadIcon size={14} />} loading={uploadLogo.isPending}>
          {currentLogo ? "Replace logo" : "Upload logo"}
        </Button>
      </Upload>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-contained credential card (owns its own form + extra-fields state)
// ---------------------------------------------------------------------------

function CredentialCard({
  icon,
  iconBg,
  title,
  description,
  block,
  onSave,
  saving,
  label,
  linkedToggle,
  allowExtraFields = true,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  block: CredentialBlock;
  onSave: (values: Record<string, string>) => void;
  saving: boolean;
  label: string;
  allowExtraFields?: boolean;
  linkedToggle?: {
    checked: boolean;
    loading: boolean;
    onChange: (checked: boolean) => void;
  };
}) {
  const [form] = Form.useForm();
  const [extraFields, setExtraFields] = useState<CredentialFieldDef[]>([]);

  const resolved = useMemo(() => resolveBlockData(block), [block]);

  useEffect(() => {
    setExtraFields(resolved.extraFields);
    form.setFieldsValue(resolved.values);
  }, [resolved, form]);

  const isLinked = linkedToggle?.checked ?? false;

  function handleSave() {
    form.validateFields().then((values) => {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (typeof v === "string" && v.trim() !== "") {
          filtered[k] = v.trim();
        }
      }
      onSave(filtered);
    });
  }

  function handleRemoveExtra(key: string) {
    setExtraFields((prev) => prev.filter((f) => f.key !== key));
    form.setFieldValue(key, undefined);
  }

  const allKeys = new Set([...block.fields, ...extraFields].map((f) => f.key));

  function handleAddField(field: CredentialFieldDef) {
    setExtraFields((prev) => [...prev, field]);
  }

  return (
    <div className="border border-border-light rounded-2xl p-5 bg-background-elevated shadow-sm transition hover:-translate-y-0.5 hover:border-primary">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-light">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center ring-1 ring-border`}>
          {icon}
        </div>
        <div>
          <Text strong className="text-sm !text-foreground">{title}</Text>
          <Text className="text-muted block text-xs leading-tight">{description}</Text>
        </div>
      </div>

      {/* Optional linked toggle (B2B only) */}
      {linkedToggle && (
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-light">
          <Switch
            size="small"
            checked={isLinked}
            onChange={linkedToggle.onChange}
            loading={linkedToggle.loading}
          />
          <Text className="text-xs text-muted">
            Use B2C credentials when B2B credentials are empty
          </Text>
        </div>
      )}

      {/* Body */}
      {isLinked ? (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-primary-bg border border-border">
          <Link2 size={15} className="text-primary shrink-0" />
          <Text className="text-sm text-primary font-medium">
            B2B is linked to B2C credentials
          </Text>
        </div>
      ) : (
        <Form form={form} layout="vertical" className="!mb-0">
          {[...block.fields, ...extraFields].map((field) => {
            const isExtra = !block.fields.some((f) => f.key === field.key);
            return (
              <Form.Item
                key={field.key}
                name={field.key}
                label={
                  <span className="text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
                    {field.label}
                    {isExtra && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExtra(field.key)}
                        className="text-red-400 hover:text-red-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                        title="Remove field"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </span>
                }
                rules={
                  field.required
                    ? [{ required: true, message: `${field.label} is required` }]
                    : []
                }
                className="!mb-3"
              >
                {field.type === "password" ? (
                  <PasswordInput placeholder={`Enter ${field.label.toLowerCase()}`} />
                ) : (
                  <Input placeholder={`Enter ${field.label.toLowerCase()}`} />
                )}
              </Form.Item>
            );
          })}

          {allowExtraFields && <AddFieldControl existingKeys={allKeys} onAdd={handleAddField} />}

          <div className="flex justify-end mt-2">
            <Button
              type="primary"
              icon={<Save size={14} />}
              onClick={handleSave}
              loading={saving}
              size="small"
            >
              Save {label}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free-form "add credential field" control (key + type)
// ---------------------------------------------------------------------------

function AddFieldControl({
  existingKeys,
  onAdd,
}: {
  existingKeys: Set<string>;
  onAdd: (field: CredentialFieldDef) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "password">("text");

  const suggestions = COMMON_FIELD_PRESETS.filter((p) => !existingKeys.has(p.key)).map((p) => ({
    value: p.label,
    type: p.type,
  }));

  function handleAdd() {
    const label = name.trim();
    if (!label) return;
    const key = toFieldKey(label);
    if (!key) {
      message.warning("Enter a valid field name");
      return;
    }
    if (existingKeys.has(key)) {
      message.warning(`"${label}" is already added`);
      return;
    }
    onAdd({ key, label, type, required: false });
    setName("");
    setType("text");
  }

  return (
    <div className="flex items-center gap-2 mb-3">
      <AutoComplete
        size="small"
        className="flex-1"
        placeholder="Add credential field (e.g. API Key)"
        value={name}
        options={suggestions}
        filterOption={(input, option) =>
          (option?.value as string).toLowerCase().includes(input.toLowerCase())
        }
        onChange={(val) => setName(val)}
        onSelect={(val, option) => {
          setName(val);
          setType((option as { type: "text" | "password" }).type);
        }}
      />
      <Select
        size="small"
        value={type}
        onChange={setType}
        style={{ width: 96 }}
        options={[
          { value: "text", label: "Text" },
          { value: "password", label: "Secret" },
        ]}
      />
      <Button size="small" icon={<Plus size={12} />} onClick={handleAdd}>
        Add
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password input with visibility toggle
// ---------------------------------------------------------------------------

function PasswordInput({
  placeholder,
  ...rest
}: {
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...rest}
      type={visible ? "text" : "password"}
      placeholder={placeholder}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      }
    />
  );
}

function extractErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  const e = err as {
    response?: {
      data?: {
        error?: string;
        message?: string;
        errors?: Array<{ msg?: string; path?: string }>;
      };
    };
    message?: string;
  };
  const data = e.response?.data;
  if (data?.errors?.length) {
    return data.errors.map((x) => `${x.path ?? ""} ${x.msg ?? ""}`.trim()).join("; ");
  }
  return data?.error ?? data?.message ?? e.message ?? "Unknown error";
}
