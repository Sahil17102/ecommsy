import { useState } from "react";
import { Tag, Button, Switch, Typography, Select, Popconfirm, Modal, Input, message } from "antd";
import { Plus, Trash2, Pencil, Truck, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import ServiceProviderBadge from "@/components/common/ServiceProviderBadge";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { useCouriers, useDeleteCourier, useToggleCourier, useUpdateCourier } from "./queries";
import { useServiceProviders } from "../service-providers/queries";
import type { CourierListItem } from "./types";
import AddCourierModal from "./components/AddCourierModal";

const { Text } = Typography;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function CouriersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filters = useDeferredFilters(
    {
      serviceProvider: undefined as string | undefined,
      businessType: undefined as string | undefined,
      isEnabled: undefined as string | undefined,
    },
    () => setPage(1),
  );

  const { data, isLoading } = useCouriers({
    serviceProvider: filters.applied.serviceProvider,
    businessType: filters.applied.businessType,
    isEnabled: filters.applied.isEnabled,
    page,
    limit: pageSize,
  });
  const { data: spData } = useServiceProviders();
  const deleteCourier = useDeleteCourier();
  const toggleCourier = useToggleCourier();
  const updateCourier = useUpdateCourier();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CourierListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const couriers = data?.couriers ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;
  const providers = spData?.providers ?? [];

  function handleToggle(courier: CourierListItem) {
    toggleCourier.mutate(courier.id);
  }

  function handleDelete(id: string) {
    deleteCourier.mutate(id, {
      onSuccess: () => message.success("Courier deleted"),
    });
  }

  function openRename(courier: CourierListItem) {
    setRenameTarget(courier);
    setRenameValue(courier.name);
  }

  function handleRename() {
    const name = renameValue.trim();
    if (!renameTarget || !name) {
      message.warning("Enter a courier name");
      return;
    }
    updateCourier.mutate(
      { id: renameTarget.id, name },
      {
        onSuccess: () => {
          message.success("Courier renamed");
          setRenameTarget(null);
        },
      },
    );
  }

  const columns: ResponsiveColumnsType<CourierListItem> = [
    {
      title: "Courier Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Text strong className="!text-foreground">{name}</Text>
      ),
    },
    {
      title: "Service Provider",
      key: "serviceProvider",
      render: (_, record) => (
        <ServiceProviderBadge
          slug={record.serviceProvider}
          label={record.serviceProviderDisplayName}
        />
      ),
    },
    {
      title: "Business Type",
      dataIndex: "businessType",
      key: "businessType",
      render: (types: string[]) => (
        <div className="flex gap-1">
          {types.map((t) => (
            <Tag key={t} bordered={false}>{t.toUpperCase()}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Status",
      key: "isEnabled",
      align: "center",
      render: (_, record) => (
        <Switch
          checked={record.isEnabled}
          onChange={() => handleToggle(record)}
          loading={toggleCourier.isPending}
          checkedChildren="Enabled"
          unCheckedChildren="Disabled"
        />
      ),
    },
    {
      title: "Action",
      key: "actions",
      align: "right",
      width: 90,
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="text"
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openRename(record)}
            title="Rename courier"
          />
          <Popconfirm
            title="Delete courier?"
            description={`Are you sure you want to delete "${record.name}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 size={14} />}
              loading={deleteCourier.isPending}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="Couriers"
        subtitle="Manage individual courier services across providers"
        size="default"
        stats={
          stats
            ? [
              { icon: Truck, iconColor: "text-indigo-500", value: stats.total, label: "total" },
              { icon: CheckCircle2, iconColor: "text-emerald-500", value: stats.enabled, label: "enabled" },
              { icon: XCircle, iconColor: "text-red-400", value: stats.disabled, label: "disabled" },
              { icon: PackageCheck, iconColor: "text-blue-500", value: stats.delivery, label: "delivery" },
            ]
            : undefined
        }
        titleExtra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Courier
          </Button>
        }
        filters={
          <CollapsibleFilters
            activeCount={[filters.draft.serviceProvider, filters.draft.businessType, filters.draft.isEnabled].filter(Boolean).length}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "serviceProvider",
                label: "Provider",
                width: "170px",
                render: (
                  <Select
                    allowClear
                    placeholder="All providers"
                    value={filters.draft.serviceProvider}
                    onChange={(val) => filters.setFilter("serviceProvider", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={providers.map((p) => ({
                      label: p.displayName,
                      value: p.serviceProvider,
                    }))}
                  />
                ),
              },
              {
                key: "businessType",
                label: "Business Type",
                width: "140px",
                render: (
                  <Select
                    allowClear
                    placeholder="All"
                    value={filters.draft.businessType}
                    onChange={(val) => filters.setFilter("businessType", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "B2C", value: "b2c" },
                      { label: "B2B", value: "b2b" },
                    ]}
                  />
                ),
              },
              {
                key: "isEnabled",
                label: "Status",
                width: "140px",
                render: (
                  <Select
                    allowClear
                    placeholder="All statuses"
                    value={filters.draft.isEnabled}
                    onChange={(val) => filters.setFilter("isEnabled", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Enabled", value: "true" },
                      { label: "Disabled", value: "false" },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={couriers}
        rowKey="id"
        loading={isLoading}
        pagination={pagination ? {
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (p, size) => {
            if (size !== pageSize) {
              setPageSize(size);
              setPage(1);
            } else {
              setPage(p);
            }
          },
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
        } : false}
        locale={{ emptyText: "No couriers found" }}
      />

      <AddCourierModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />

      <Modal
        title="Rename Courier"
        open={!!renameTarget}
        onOk={handleRename}
        onCancel={() => setRenameTarget(null)}
        confirmLoading={updateCourier.isPending}
        okText="Save"
        destroyOnClose
      >
        <p className="text-xs text-muted mb-2">
          This is the seller-facing name shown across the seller panel.
        </p>
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRename}
          placeholder="e.g. Delhivery Surface"
          autoFocus
        />
      </Modal>
    </div>
  );
}
