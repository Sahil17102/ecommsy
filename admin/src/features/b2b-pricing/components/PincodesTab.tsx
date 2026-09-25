import { useState } from "react";
import { Button, Input, Select, Tag, Popconfirm, Modal, Form, Checkbox, message, Spin } from "antd";
import { Trash2, Search, Plus, Pencil, Upload as UploadIcon } from "lucide-react";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useB2bPincodes, useDeleteB2bPincode, useB2bZones, useCreateB2bPincode, useUpdateB2bPincode } from "../queries";
import { useCouriers } from "@/features/couriers/queries";
import { usePincodeLookup } from "@/features/serviceability/queries";
import { regex } from "@/lib/constants";
import type { B2bPincode } from "../types";
import ImportPincodesCsvModal from "./ImportPincodesCsvModal";

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  isOda: { label: "ODA", color: "purple" },
  isRemote: { label: "Remote", color: "red" },
  isMall: { label: "Mall", color: "blue" },
  isSez: { label: "SEZ", color: "purple" },
  isCsd: { label: "CSD", color: "green" },
  isAirport: { label: "Airport", color: "cyan" },
  isHighSecurity: { label: "High Security", color: "magenta" },
};

type FlagKey = "isOda" | "isRemote" | "isMall" | "isSez" | "isCsd" | "isAirport" | "isHighSecurity";

const FLAG_FILTER_OPTIONS: { label: string; value: FlagKey }[] = [
  { label: "ODA", value: "isOda" },
  { label: "Remote", value: "isRemote" },
  { label: "Mall", value: "isMall" },
  { label: "SEZ", value: "isSez" },
  { label: "CSD", value: "isCsd" },
  { label: "Airport", value: "isAirport" },
  { label: "High Security", value: "isHighSecurity" },
];

export default function PincodesTab() {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>();
  const [courierFilter, setCourierFilter] = useState<string>();
  const [flagFilter, setFlagFilter] = useState<FlagKey>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [form] = Form.useForm();
  const pincodeLookup = usePincodeLookup();

  const { data: zonesData } = useB2bZones();
  const zones = zonesData?.data ?? [];

  const { data: couriersData } = useCouriers();
  const b2bCouriers = (couriersData?.couriers ?? []).filter((c: { businessType: string[] }) =>
    c.businessType?.includes("b2b"),
  );

  const { data, isLoading } = useB2bPincodes({
    pincode: search || undefined,
    zone: zoneFilter,
    courier: courierFilter,
    ...(flagFilter ? { [flagFilter]: "true" } : {}),
    page,
    limit: 50,
  });

  const hasActiveFilters = !!search || !!zoneFilter || !!courierFilter || !!flagFilter;

  function resetFilters() {
    setSearch("");
    setZoneFilter(undefined);
    setCourierFilter(undefined);
    setFlagFilter(undefined);
    setPage(1);
  }
  const deletePincode = useDeleteB2bPincode();
  const createPincode = useCreateB2bPincode();
  const updatePincode = useUpdateB2bPincode();

  function openModal() {
    form.resetFields();
    form.setFieldsValue({ pincode: "", city: "", state: "", flags: [] });
    setEditingId(null);
    setLookingUp(false);
    setModalOpen(true);
  }

  function openEditModal(record: B2bPincode) {
    form.resetFields();
    const activeFlags = record.flags
      ? Object.entries(record.flags).filter(([, v]) => v).map(([k]) => k)
      : [];
    form.setFieldsValue({
      pincode: record.pincode,
      city: record.city,
      state: record.state,
      zone: record.zone?.id,
      courier: record.courier?.id,
      flags: activeFlags,
    });
    setEditingId(record.id);
    setLookingUp(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    form.resetFields();
  }

  function handlePincodeBlur() {
    const pincode = form.getFieldValue("pincode") as string;
    if (!regex.pincode.test(pincode)) return;

    setLookingUp(true);
    pincodeLookup.mutate(pincode, {
      onSuccess: (data) => {
        form.setFieldsValue({ city: data.city, state: data.state });
      },
      onError: () => {
        message.warning("Could not auto-fill city/state for this pincode");
      },
      onSettled: () => setLookingUp(false),
    });
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const courier = b2bCouriers.find((c: { id: string }) => c.id === values.courier);
    if (!courier) {
      message.error("Selected courier not found");
      return;
    }
    const flagsArr: string[] = values.flags ?? [];
    const payload = {
      pincode: values.pincode.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      zone: values.zone,
      courier: courier.id,
      serviceProvider: courier.serviceProvider,
      flags: {
        isOda: flagsArr.includes("isOda"),
        isRemote: flagsArr.includes("isRemote"),
        isMall: flagsArr.includes("isMall"),
        isSez: flagsArr.includes("isSez"),
        isCsd: flagsArr.includes("isCsd"),
        isAirport: flagsArr.includes("isAirport"),
        isHighSecurity: flagsArr.includes("isHighSecurity"),
      },
    };

    if (editingId) {
      await updatePincode.mutateAsync({ id: editingId, ...payload });
      message.success("Pincode updated");
    } else {
      await createPincode.mutateAsync(payload);
      message.success("Pincode added");
    }
    closeModal();
  }

  const pincodes = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: ResponsiveColumnsType<B2bPincode> = [
    { title: "Pincode", dataIndex: "pincode", key: "pincode", width: 100 },
    { title: "City", dataIndex: "city", key: "city" },
    { title: "State", dataIndex: "state", key: "state" },
    {
      title: "Zone",
      key: "zone",
      width: 120,
      render: (_, r) => r.zone ? <Tag color="blue">{r.zone.code} - {r.zone.name}</Tag> : "-",
    },
    {
      title: "Courier",
      key: "courier",
      render: (_, r) => r.courier?.name ?? "-",
    },
    {
      title: "Flags",
      key: "flags",
      render: (_, r) => {
        if (!r.flags) return "-";
        const active = Object.entries(r.flags).filter(([, v]) => v);
        if (active.length === 0) return "-";
        return (
          <div className="flex flex-wrap gap-1">
            {active.map(([key]) => {
              const cfg = FLAG_LABELS[key];
              return cfg ? <Tag key={key} color={cfg.color}>{cfg.label}</Tag> : null;
            })}
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 96,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm title="Delete this pincode?" onConfirm={() => { deletePincode.mutate(record.id); message.success("Deleted"); }}>
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
          placeholder="Search pincode..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-44"
          allowClear
        />
        <Select
          showSearch
          placeholder="Zone"
          value={zoneFilter}
          onChange={(v) => { setZoneFilter(v); setPage(1); }}
          allowClear
          className="w-full sm:w-44"
          optionFilterProp="label"
          options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
        />
        <Select
          showSearch
          placeholder="Courier"
          value={courierFilter}
          onChange={(v) => { setCourierFilter(v); setPage(1); }}
          allowClear
          className="w-full sm:w-48"
          optionFilterProp="label"
          options={b2bCouriers.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))}
        />
        <Select
          placeholder="Flag"
          value={flagFilter}
          onChange={(v) => { setFlagFilter(v); setPage(1); }}
          allowClear
          className="w-full sm:w-36"
          options={FLAG_FILTER_OPTIONS}
        />
        {hasActiveFilters && (
          <Button onClick={resetFilters} className="w-full sm:w-auto">
            Clear
          </Button>
        )}
        <div className="sm:ml-auto flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            icon={<UploadIcon size={16} />}
            onClick={() => setImportModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Import CSV
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openModal} className="w-full sm:w-auto">
            Add Pincode
          </Button>
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={pincodes}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={pagination ? {
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: setPage,
          showSizeChanger: false,
        } : false}
      />

      <Modal
        title={editingId ? "Edit Pincode" : "Add Pincode"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createPincode.isPending || updatePincode.isPending}
        okText={editingId ? "Save" : "Add"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="pincode"
            label="Pincode"
            rules={[
              { required: true, message: "Pincode is required" },
              { pattern: regex.pincode, message: "Must be a 6-digit pincode" },
            ]}
          >
            <Input
              placeholder="e.g. 492001"
              maxLength={6}
              onBlur={handlePincodeBlur}
              suffix={lookingUp ? <Spin size="small" /> : null}
            />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true }]}>
            <Input
              placeholder={lookingUp ? "Looking up..." : "e.g. Raipur"}
              disabled={lookingUp}
            />
          </Form.Item>
          <Form.Item name="state" label="State" rules={[{ required: true }]}>
            <Input
              placeholder={lookingUp ? "Looking up..." : "e.g. Chhattisgarh"}
              disabled={lookingUp}
            />
          </Form.Item>
          <Form.Item name="courier" label="Courier" rules={[{ required: true }]}>
            <Select
              placeholder="Select B2B courier"
              options={b2bCouriers.map((c: { id: string; name: string }) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="zone" label="Zone" rules={[{ required: true }]}>
            <Select
              placeholder="Select zone"
              options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
            />
          </Form.Item>
          <Form.Item name="flags" label="Flags">
            <Checkbox.Group
              options={[
                { label: "ODA", value: "isOda" },
                { label: "Remote", value: "isRemote" },
                { label: "Mall", value: "isMall" },
                { label: "SEZ", value: "isSez" },
                { label: "CSD", value: "isCsd" },
                { label: "Airport", value: "isAirport" },
                { label: "High Security", value: "isHighSecurity" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <ImportPincodesCsvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        couriers={b2bCouriers.map(
          (c: { id: string; name: string; serviceProvider: string }) => ({
            id: c.id,
            name: c.name,
            serviceProvider: c.serviceProvider,
          }),
        )}
        zones={zones}
      />
    </div>
  );
}
