import { useMemo, useState } from "react";
import { Button, Input, Switch, Popconfirm, Modal, Form, Select, message } from "antd";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useB2bZones, useCreateB2bZone, useUpdateB2bZone, useDeleteB2bZone, useToggleB2bZone } from "../queries";
import type { B2bZone } from "../types";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export default function ZonesTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<B2bZone | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useB2bZones();
  const createZone = useCreateB2bZone();
  const updateZone = useUpdateB2bZone();
  const deleteZone = useDeleteB2bZone();
  const toggleZone = useToggleB2bZone();

  const zones = data?.data ?? [];

  const filteredZones = useMemo(() => {
    let list = zones;
    if (statusFilter) {
      list = list.filter((z) => (statusFilter === "active" ? z.isActive : !z.isActive));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((z) =>
        [z.code, z.name, z.description].filter(Boolean).join(" ").toLowerCase().includes(q),
      );
    }
    return list;
  }, [zones, search, statusFilter]);

  const hasActiveFilters = !!search.trim() || !!statusFilter;

  function openModal(zone?: B2bZone) {
    setEditingZone(zone ?? null);
    form.setFieldsValue(zone ?? { code: "", name: "", description: "" });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, ...values });
      message.success("Zone updated");
    } else {
      await createZone.mutateAsync(values);
      message.success("Zone created");
    }
    setModalOpen(false);
    form.resetFields();
  }

  const columns: ResponsiveColumnsType<B2bZone> = [
    { title: "Code", dataIndex: "code", key: "code", width: 150 },
    { title: "Name", dataIndex: "name", key: "name", width: 180 },
    { title: "Description", dataIndex: "description", key: "description" },
    {
      title: "Active",
      key: "isActive",
      width: 80,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isActive}
          onChange={() => toggleZone.mutate(record.id)}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" icon={<Pencil size={14} />} onClick={() => openModal(record)} />
          <Popconfirm title="Delete this zone?" onConfirm={() => deleteZone.mutate(record.id)}>
            <Button size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <Input
          prefix={<Search size={14} />}
          placeholder="Search code, name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="w-full sm:w-72"
        />
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          className="w-full sm:w-32"
          options={STATUS_OPTIONS}
        />
        {hasActiveFilters && (
          <Button onClick={() => { setSearch(""); setStatusFilter(undefined); }} className="w-full sm:w-auto">
            Clear
          </Button>
        )}
        <div className="sm:ml-auto w-full sm:w-auto">
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()} className="w-full sm:w-auto">
            Add Zone
          </Button>
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={filteredZones}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingZone ? "Edit Zone" : "Add Zone"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={createZone.isPending || updateZone.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. A, B, C" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Zone A - Metro" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Description" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
