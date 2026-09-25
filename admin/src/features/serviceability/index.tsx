import { useState } from "react";
import {
  Table,
  Tag,
  Input,
  Select,
  Switch,
  Button,
  Popconfirm,
  message,
} from "antd";
import {
  MapPin,
  Search,
  Plus,
  Upload,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import type { ColumnsType } from "antd/es/table";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import {
  useLocations,
  useDeleteLocation,
  useToggleLocation,
  useBulkDeleteLocations,
} from "./queries";
import { TAG_CONFIG, TAG_OPTIONS, STATE_OPTIONS } from "./config";
import type { LocationListItem, LocationTag } from "./types";
import AddLocationModal from "./components/AddLocationModal";
import ImportCsvModal from "./components/ImportCsvModal";

export default function ServiceabilityPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const filters = useDeferredFilters(
    { search: "" as string, state: undefined as string | undefined, tag: undefined as string | undefined, isActive: undefined as string | undefined },
    () => setPage(1),
  );
  const debouncedSearch = useDebounce(filters.applied.search, 400);

  const { data, isLoading } = useLocations({
    search: debouncedSearch || undefined,
    state: filters.applied.state,
    tag: filters.applied.tag,
    isActive: filters.applied.isActive,
    page,
    limit: pageSize,
  });

  const deleteLocation = useDeleteLocation();
  const toggleLocation = useToggleLocation();
  const bulkDelete = useBulkDeleteLocations();

  const locations = data?.locations ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  function handleToggle(record: LocationListItem) {
    const action = record.isActive ? "deactivate" : "activate";
    toggleLocation.mutate(record.id, {
      onSuccess: () => message.success(`Location ${action}d`),
    });
  }

  function handleDelete(id: string) {
    deleteLocation.mutate(id, {
      onSuccess: () => message.success("Location deleted"),
    });
  }

  function handleBulkDelete() {
    bulkDelete.mutate(
      { ids: selectedRowKeys as string[] },
      {
        onSuccess: (result) => {
          message.success(`Deleted ${result.deletedCount} locations`);
          setSelectedRowKeys([]);
        },
      },
    );
  }

  const columns: ColumnsType<LocationListItem> = [
    {
      title: "Pincode",
      dataIndex: "pincode",
      key: "pincode",
      width: 110,
      render: (pincode: string) => (
        <span className="text-sm font-medium text-foreground">{pincode}</span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 160,
      render: (city: string) => (
        <span className="text-sm text-foreground">{city}</span>
      ),
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      width: 160,
      render: (state: string) => (
        <span className="text-sm text-foreground">{state}</span>
      ),
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      width: 200,
      render: (tags: LocationTag[]) =>
        tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Tag
                key={t}
                color={TAG_CONFIG[t]?.color}
                bordered={false}
                className="!text-xs"
              >
                {TAG_CONFIG[t]?.label ?? t}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted/40">—</span>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={`${record.isActive ? "Deactivate" : "Activate"} location?`}
          description={`This will ${record.isActive ? "deactivate" : "activate"} pincode ${record.pincode}.`}
          onConfirm={() => handleToggle(record)}
          okText={record.isActive ? "Deactivate" : "Activate"}
          okButtonProps={{ danger: record.isActive }}
        >
          <Switch
            checked={record.isActive}
            size="small"
            loading={toggleLocation.isPending}
          />
        </Popconfirm>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 60,
      align: "right",
      render: (_, record) => (
        <Popconfirm
          title="Delete location?"
          description={`Remove pincode ${record.pincode}?`}
          onConfirm={() => handleDelete(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <button className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-red-500">
            <Trash2 size={15} />
          </button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={MapPin}
        title="Serviceability Locations"
        subtitle="Manage serviceable pincodes and zones"
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
          <CollapsibleFilters
            activeCount={[filters.draft.state, filters.draft.tag, filters.draft.isActive].filter(Boolean).length}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "240px",
                render: (
                  <Input
                    prefix={<Search size={14} className="text-muted" />}
                    placeholder="Pincode, city, state..."
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                    size="middle"
                  />
                ),
              },
              {
                key: "state",
                label: "State",
                width: "170px",
                render: (
                  <Select
                    allowClear
                    showSearch
                    placeholder="All states"
                    value={filters.draft.state}
                    onChange={(val) => filters.setFilter("state", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={STATE_OPTIONS}
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "tag",
                label: "Tag",
                width: "140px",
                render: (
                  <Select
                    allowClear
                    placeholder="All tags"
                    value={filters.draft.tag}
                    onChange={(val) => filters.setFilter("tag", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={TAG_OPTIONS}
                  />
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "130px",
                render: (
                  <Select
                    allowClear
                    placeholder="All"
                    value={filters.draft.isActive}
                    onChange={(val) => filters.setFilter("isActive", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                  />
                ),
              },
            ]}
            extra={
              <>
                {pagination && (
                  <span className="text-xs text-muted">
                    {pagination.total} result{pagination.total !== 1 ? "s" : ""}
                  </span>
                )}
                <Button
                  size="middle"
                  icon={<Upload size={14} />}
                  onClick={() => setImportModalOpen(true)}
                >
                  Import CSV
                </Button>
                <Button
                  type="primary"
                  size="middle"
                  icon={<Plus size={14} />}
                  onClick={() => setAddModalOpen(true)}
                >
                  Add Location
                </Button>
              </>
            }
          />
        }
      />

      {/* Bulk action bar */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-background-elevated border border-border-light rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-foreground font-medium">
            {selectedRowKeys.length} location
            {selectedRowKeys.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Popconfirm
              title="Delete selected locations?"
              description={`This will permanently delete ${selectedRowKeys.length} location${selectedRowKeys.length !== 1 ? "s" : ""}.`}
              onConfirm={handleBulkDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                size="small"
                icon={<Trash2 size={13} />}
                loading={bulkDelete.isPending}
              >
                Delete Selected
              </Button>
            </Popconfirm>
            <Button
              type="text"
              size="small"
              icon={<X size={13} />}
              onClick={() => setSelectedRowKeys([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="themed-table rounded-xl border border-border-light overflow-hidden bg-background-elevated overflow-x-auto">
        <Table
          columns={columns}
          dataSource={locations}
          rowKey="id"
          loading={isLoading}
          size="middle"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={
            pagination
              ? {
                current: pagination.page,
                pageSize: pagination.limit,
                position: ['topRight'],
                total: pagination.total,
                pageSizeOptions: [50, 100, 200, 500],
                showSizeChanger: true,
                onChange: (p, size) => {
                  if (size !== pageSize) {
                    setPageSize(size);
                    setPage(1);
                  } else {
                    setPage(p);
                  }
                  setSelectedRowKeys([]);
                },
              }
              : false
          }
          locale={{ emptyText: "No locations found" }}
          scroll={{ x: 800 }}
          onRow={(record) => ({
            className: !record.isActive ? "opacity-60" : "",
          })}
        />
      </div>

      {/* Modals */}
      <AddLocationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <ImportCsvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}
