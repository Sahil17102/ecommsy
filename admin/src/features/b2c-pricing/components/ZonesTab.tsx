import { useState, useMemo } from "react";
import { Input, Switch, Button, Popconfirm, message } from "antd";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Globe,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useB2cZones, useDeleteZone, useToggleZone } from "../queries";
import type { B2cZone } from "../types";
import AddZoneModal from "./AddZoneModal";

export default function ZonesTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<B2cZone | null>(null);

  const searchTimeout = useMemo(
    () => ({ id: null as ReturnType<typeof setTimeout> | null }),
    [],
  );

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimeout.id) clearTimeout(searchTimeout.id);
    searchTimeout.id = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }

  const { data, isLoading } = useB2cZones({
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
  });
  const deleteZone = useDeleteZone();
  const toggleZone = useToggleZone();

  const zones = data?.zones ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  function handleToggle(record: B2cZone) {
    const action = record.isActive ? "deactivate" : "activate";
    toggleZone.mutate(record.id, {
      onSuccess: () => message.success(`Zone ${action}d`),
    });
  }

  function handleDelete(id: string) {
    deleteZone.mutate(id, {
      onSuccess: () => message.success("Zone deleted"),
    });
  }

  function handleEdit(zone: B2cZone) {
    setEditingZone(zone);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setEditingZone(null);
    setModalOpen(false);
  }

  const columns: ResponsiveColumnsType<B2cZone> = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code: string) => (
        <span className="text-sm font-medium text-foreground">{code}</span>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name: string) => (
        <span className="text-sm text-foreground">{name}</span>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => (
        <span className="text-sm text-muted">{desc || "—"}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={`${record.isActive ? "Deactivate" : "Activate"} zone?`}
          description={`This will ${record.isActive ? "deactivate" : "activate"} zone ${record.code}.`}
          onConfirm={() => handleToggle(record)}
          okText={record.isActive ? "Deactivate" : "Activate"}
          okButtonProps={{ danger: record.isActive }}
        >
          <Switch
            checked={record.isActive}
            size="small"
            loading={toggleZone.isPending}
          />
        </Popconfirm>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 80,
      align: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
            onClick={() => handleEdit(record)}
          >
            <Pencil size={15} />
          </button>
          <Popconfirm
            title="Delete zone?"
            description={`Remove zone ${record.code}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <button className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-red-500">
              <Trash2 size={15} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Layers}
        title="B2C Zones"
        subtitle="Manage shipping zones used for pricing configuration"
        card={false}
        stats={
          stats
            ? [
              { icon: Globe, iconColor: "text-indigo-500", value: stats.total, label: "total" },
              { icon: CheckCircle, iconColor: "text-emerald-500", value: stats.active, label: "active" },
              { icon: XCircle, iconColor: "text-red-400", value: stats.inactive, label: "inactive" },
            ]
            : undefined
        }
        filters={
          <Input
            prefix={<Search size={14} className="text-muted" />}
            placeholder="Search zones..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            className="w-full sm:w-64"
            size="middle"
          />
        }
        filtersExtra={
          <>
            {pagination && (
              <span className="text-xs text-muted">
                {pagination.total} result{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
            <Button
              type="primary"
              size="middle"
              icon={<Plus size={14} />}
              onClick={() => setModalOpen(true)}
            >
              Add Zone
            </Button>
          </>
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={zones}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={
          pagination
            ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
              onChange: (p, size) => {
                if (size !== pageSize) {
                  setPageSize(size);
                  setPage(1);
                } else {
                  setPage(p);
                }
              },
            }
            : false
        }
        locale={{ emptyText: "No zones found" }}
        scroll={{ x: 600 }}
        onRow={(record) => ({
          className: !record.isActive ? "opacity-60" : "",
        })}
      />

      <AddZoneModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingZone={editingZone}
      />
    </div>
  );
}
