import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Tag, Save, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useLabelSettings, useUpdateLabelSettings, useUploadLogo } from "./queries";
import {
  COMMON_SETTINGS,
  WAREHOUSE_SETTINGS,
  PRODUCT_SETTINGS,
  type SettingToggle,
} from "./config";
import type { LabelSettings } from "./types";
import LabelPreview from "./LabelPreview";

// ── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-2.5 cursor-pointer group">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? "bg-primary" : "bg-border-light"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-[13px] text-foreground group-hover:text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}

// ── Settings Section ─────────────────────────────────────────────────────────

function SettingsSection({
  title,
  toggles,
  values,
  onChange,
}: {
  title: string;
  toggles: SettingToggle[];
  values: Record<string, boolean>;
  onChange: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        {toggles.map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            checked={!!values[t.key]}
            onChange={(val) => onChange(t.key, val)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Logo Upload Section ─────────────────────────────────────────────────────

function LogoSection({
  logoUrl,
  showLogo,
  onToggleLogo,
  onLogoUrlChange,
  onUpload,
  isUploading,
}: {
  logoUrl?: string;
  showLogo: boolean;
  onToggleLogo: (val: boolean) => void;
  onLogoUrlChange: (url: string) => void;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-3">Logo</h3>

      {/* Upload area + preview */}
      <div className="flex items-center gap-4 mb-4">
        {/* Preview / placeholder */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-border-light bg-surface-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
          ) : (
            <Upload className="w-5 h-5 text-tertiary" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border-light bg-background text-muted hover:text-primary hover:border-primary/25 hover:bg-primary/[0.04] transition-all disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {logoUrl ? "Change" : "Upload"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => onLogoUrlChange("")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-border-light text-muted hover:text-error hover:border-error/25 hover:bg-error/[0.04] transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-tertiary mt-1.5">PNG, JPG or SVG — max 2 MB</p>
        </div>
      </div>

      <ToggleRow label="Show Logo on Label" checked={showLogo} onChange={onToggleLogo} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LabelConfigurationPage() {
  const { data: settings, isLoading } = useLabelSettings();
  const updateMutation = useUpdateLabelSettings();
  const uploadLogoMutation = useUploadLogo();

  const [local, setLocal] = useState<Partial<LabelSettings>>({});
  const [dirty, setDirty] = useState(false);

  // Sync remote → local when data loads
  useEffect(() => {
    if (settings) {
      setLocal(settings);
      setDirty(false);
    }
  }, [settings]);

  function handleChange(key: string, val: boolean) {
    setLocal((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  }

  function handleLogoUpload(file: File) {
    uploadLogoMutation.mutate(file, {
      onSuccess: (data) => {
        setLocal((prev) => ({ ...prev, logoUrl: data.logoUrl, showLogo: true }));
        setDirty(true);
      },
    });
  }

  function handleSave() {
    updateMutation.mutate(local, {
      onSuccess: () => {
        setDirty(false);
        toast.success("Settings saved successfully");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="skeleton h-64 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div className="lg:col-span-2">
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const vals = local as Record<string, boolean>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto pb-8"
    >
      {/* Back nav */}
      <Link
        to="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors no-underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Label Configuration</h1>
            <p className="text-xs text-muted mt-0.5">
              Configure which fields appear on your shipping labels
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
      </div>

      {/* Two-column layout: Settings + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Settings toggles */}
        <div className="lg:col-span-3">
          <div className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden">
            <div className="divide-y divide-border-light/60">
              {/* Logo Settings */}
              <div className="p-5 sm:p-6">
                <LogoSection
                  logoUrl={local.logoUrl}
                  showLogo={!!vals.showLogo}
                  onToggleLogo={(val) => handleChange("showLogo", val)}
                  onLogoUrlChange={(url) => {
                    setLocal((prev) => ({ ...prev, logoUrl: url }));
                    setDirty(true);
                  }}
                  onUpload={handleLogoUpload}
                  isUploading={uploadLogoMutation.isPending}
                />
              </div>

              {/* Common Settings (without showLogo since it's above) */}
              <div className="p-5 sm:p-6">
                <SettingsSection
                  title="Common Setting"
                  toggles={COMMON_SETTINGS.filter((t) => t.key !== "showLogo")}
                  values={vals}
                  onChange={handleChange}
                />
              </div>

              <div className="p-5 sm:p-6">
                <SettingsSection
                  title="Warehouse Setting"
                  toggles={WAREHOUSE_SETTINGS}
                  values={vals}
                  onChange={handleChange}
                />
              </div>

              <div className="p-5 sm:p-6">
                <SettingsSection
                  title="Hide/Show Product Details"
                  toggles={PRODUCT_SETTINGS}
                  values={vals}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Live label preview */}
        <div className="lg:col-span-2">
          <LabelPreview settings={local} />
        </div>
      </div>

    </motion.div>
  );
}
