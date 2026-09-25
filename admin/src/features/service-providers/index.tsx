import { useEffect, useState } from "react";
import { Button, Switch, Typography, Empty } from "antd";
import {
  Truck,
  CheckCircle2,
  XCircle,
  Link2,
  Plus,
  ShieldCheck,
  ShieldX,
  Info,
} from "lucide-react";
import ServiceProviderBadge from "@/components/common/ServiceProviderBadge";
import PageHeader from "@/components/common/PageHeader";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import {
  useServiceProviders,
  useUpdateProvider,
} from "./queries";
import type { ProviderListItem } from "./types";
import { resolveLogoUrl } from "./config";
import ProviderCredentialsExpanded from "./components/ProviderCredentialsExpanded";
import AddProviderModal from "./components/AddProviderModal";

const DEV_MODE_KEY = "devMode";

function useDevMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(DEV_MODE_KEY) === "true",
  );

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === DEV_MODE_KEY) setEnabled(e.newValue === "true");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return enabled;
}

const { Text } = Typography;

function ProviderLogo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveLogoUrl(logoUrl);

  return (
    <div className="w-9 h-9 rounded-full bg-surface-muted border border-border-light flex items-center justify-center shrink-0 overflow-hidden">
      {resolvedUrl && !failed ? (
        <img
          src={resolvedUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Truck size={16} className="text-muted" />
      )}
    </div>
  );
}


function CredentialBadge({ configured, label }: { configured: boolean; label: string }) {
  if (configured) {
    return (
      <span className="badge-success inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md">
        <ShieldCheck size={13} />
        {label}
      </span>
    );
  }
  return (
    <span className="badge-muted inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md">
      <ShieldX size={13} />
      Not set
    </span>
  );
}

export default function ServiceProvidersPage() {
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const devMode = useDevMode();
  const { data, isLoading } = useServiceProviders(page);
  const updateProvider = useUpdateProvider();

  const providers = data?.providers ?? [];
  const pagination = data?.pagination;

  function handleStatusToggle(provider: ProviderListItem) {
    const newStatus = provider.status === "active" ? "inactive" : "active";
    updateProvider.mutate({ id: provider.id, status: newStatus });
  }

  const columns: ResponsiveColumnsType<ProviderListItem> = [
    {
      title: "Provider",
      dataIndex: "displayName",
      key: "displayName",
      render: (name: string, record) => (
        <div className="flex items-center gap-3">
          <ProviderLogo name={name} logoUrl={record.logoUrl} />
          <div className="min-w-0">
            <Text strong className="!text-foreground block text-sm leading-tight">
              {name}
            </Text>
            <ServiceProviderBadge slug={record.serviceProvider} label={record.serviceProviderDisplayName}/>
          </div>
        </div>
      ),
    },
    {
      title: "Couriers",
      key: "couriers",
      align: "center",
      width: 140,
      render: (_, record) => (
        <div className="text-center">
          <Text strong className="!text-foreground text-sm">
            {record.enabledCouriers}
          </Text>
          <Text className="text-muted text-xs"> / {record.totalCouriers}</Text>
        </div>
      ),
    },
    {
      title: "B2C Credentials",
      key: "b2c",
      render: (_, record) => <CredentialBadge configured={record.b2c.configured} label="Configured" />,
    },
    {
      title: "B2B Credentials",
      key: "b2b",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <CredentialBadge configured={record.b2b.configured} label="Configured" />
          {record.b2b.sameAsB2c && (
            <span className="badge-primary inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium">
              <Link2 size={12} />
              Uses B2C
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      width: 140,
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          {record.status === "active" ? (
            <span className="badge-success inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md">
              <CheckCircle2 size={14} />
              Active
            </span>
          ) : (
            <span className="badge-muted inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md">
              <XCircle size={14} />
              Inactive
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Action",
      key: "toggle",
      mobileActions: true,
      align: "right",
      width: 80,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.status === "active"}
          onChange={() => handleStatusToggle(record)}
          loading={updateProvider.isPending}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="Service Providers"
        subtitle="Manage courier integrations and API credentials"
        size="default"
        card={false}
        titleExtra={
          devMode ? (
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={() => setAddOpen(true)}
            >
              Add Provider
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2 text-sm text-muted bg-primary-bg border border-primary/10 rounded-lg px-3.5 py-2.5">
        <Info size={15} className="text-primary shrink-0" />
        <span className="hidden sm:inline">Expand a row to view or edit credentials (API keys, tokens, passwords) for each provider.</span>
        <span className="sm:hidden">Tap "View details" on a card to view or edit credentials for each provider.</span>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={providers}
        rowKey="id"
        loading={isLoading}
        pagination={pagination && pagination.totalPages > 1 ? {
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: setPage,
          showSizeChanger: false,
        } : false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-muted">
                  No service providers found
                </span>
              }
            />
          ),
        }}
        expandable={{
          expandedRowRender: (record) => (
            <ProviderCredentialsExpanded provider={record} />
          ),
          rowExpandable: () => true,
        }}
      />

      {devMode && (
        <AddProviderModal open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
