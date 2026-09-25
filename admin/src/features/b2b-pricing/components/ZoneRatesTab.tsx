import { useMemo, useState } from "react";
import { Button, Select, InputNumber, Modal, Form, Popconfirm, Input, message } from "antd";
import { Plus, Trash2, Search, Pencil, Upload as UploadIcon } from "lucide-react";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useB2bZoneRates, useUpsertB2bZoneRate, useDeleteB2bZoneRate, useB2bZones } from "../queries";
import { useCouriers } from "@/features/couriers/queries";
import { usePlans } from "@/features/plans/queries";
import { formatCurrency } from "@/lib/utils";
import type { B2bZoneRate } from "../types";
import ImportZoneRatesCsvModal from "./ImportZoneRatesCsvModal";

const PAGE_SIZE = 25;

export default function ZoneRatesTab() {
  const [courierFilter, setCourierFilter] = useState<string>();
  const [planFilter, setPlanFilter] = useState<string>();
  const [originZoneFilter, setOriginZoneFilter] = useState<string>();
  const [destinationZoneFilter, setDestinationZoneFilter] = useState<string>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: zonesData } = useB2bZones();
  const zones = zonesData?.data ?? [];

  const { data: couriersData } = useCouriers();
  const couriers = (couriersData?.couriers ?? []).filter((c: { businessType: string[] }) =>
    c.businessType?.includes("b2b"),
  );

  const { data: plansData } = usePlans({ isActive: true });
  const plans = plansData?.plans ?? [];
  const planOptions = plans.map((p) => ({ label: p.name, value: p.slug }));
  const defaultPlanSlug = (plans.find((p) => p.isDefault) ?? plans[0])?.slug;

  const { data, isLoading } = useB2bZoneRates({
    courier: courierFilter,
    plan: planFilter,
    originZone: originZoneFilter,
    destinationZone: destinationZoneFilter,
  });
  const upsertRate = useUpsertB2bZoneRate();
  const deleteRate = useDeleteB2bZoneRate();

  const allRates = data?.data ?? [];

  const filteredRates = useMemo(() => {
    if (!search.trim()) return allRates;
    const q = search.trim().toLowerCase();
    return allRates.filter((r) => {
      const haystack = [
        r.courier?.name,
        r.courier?.serviceProvider,
        r.originZone?.code,
        r.originZone?.name,
        r.destinationZone?.code,
        r.destinationZone?.name,
        r.plan,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allRates, search]);

  const pagedRates = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRates.slice(start, start + PAGE_SIZE);
  }, [filteredRates, page]);

  function resetFilters() {
    setCourierFilter(undefined);
    setPlanFilter(undefined);
    setOriginZoneFilter(undefined);
    setDestinationZoneFilter(undefined);
    setSearch("");
    setPage(1);
  }

  const hasActiveFilters =
    !!courierFilter || !!planFilter || !!originZoneFilter || !!destinationZoneFilter || !!search.trim();

  function openAddModal() {
    form.resetFields();
    if (defaultPlanSlug) form.setFieldValue("plan", defaultPlanSlug);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEditModal(record: B2bZoneRate) {
    form.resetFields();
    form.setFieldsValue({
      courier: record.courier?.id,
      plan: record.plan,
      originZone: record.originZone?.id,
      destinationZone: record.destinationZone?.id,
      ratePerKg: record.ratePerKg,
      rtoRatePerKg: record.rtoRatePerKg,
      volumetricDivisor: record.volumetricDivisor,
    });
    setEditingId(record.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    form.resetFields();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const courier = couriers.find((c: { id: string }) => c.id === values.courier);
    await upsertRate.mutateAsync({
      ...values,
      serviceProvider: courier?.serviceProvider ?? "",
    });
    message.success(editingId ? "Rate updated" : "Rate saved");
    closeModal();
  }

  const columns: ResponsiveColumnsType<B2bZoneRate> = [
    {
      title: "Origin Zone",
      key: "originZone",
      render: (_, r) => `${r.originZone.code} - ${r.originZone.name}`,
    },
    {
      title: "Destination Zone",
      key: "destinationZone",
      render: (_, r) => `${r.destinationZone.code} - ${r.destinationZone.name}`,
    },
    { title: "Plan", dataIndex: "plan", key: "plan", width: 80 },
    {
      title: "Rate/kg",
      key: "ratePerKg",
      width: 100,
      render: (_, r) => formatCurrency(r.ratePerKg),
    },
    {
      title: "RTO Rate/kg",
      key: "rtoRatePerKg",
      width: 120,
      render: (_, r) => formatCurrency(r.rtoRatePerKg),
    },
    {
      title: "Courier",
      key: "courier",
      render: (_, r) => r.courier?.name ?? "-",
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
          <Popconfirm title="Delete this rate?" onConfirm={() => { deleteRate.mutate(record.id); message.success("Deleted"); }}>
            <Button size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          <Input
            prefix={<Search size={14} />}
            placeholder="Search courier, zone or plan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            className="w-full sm:w-56"
          />
          <Select
            showSearch
            placeholder="Courier"
            value={courierFilter}
            onChange={(v) => { setCourierFilter(v); setPage(1); }}
            allowClear
            className="w-full sm:w-48"
            optionFilterProp="label"
            options={couriers.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))}
          />
          <Select
            placeholder="Plan"
            value={planFilter}
            onChange={(v) => { setPlanFilter(v); setPage(1); }}
            allowClear
            className="w-full sm:w-32"
            options={planOptions}
          />
          <Select
            showSearch
            placeholder="Origin zone"
            value={originZoneFilter}
            onChange={(v) => { setOriginZoneFilter(v); setPage(1); }}
            allowClear
            className="w-full sm:w-44"
            optionFilterProp="label"
            options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
          />
          <Select
            showSearch
            placeholder="Destination zone"
            value={destinationZoneFilter}
            onChange={(v) => { setDestinationZoneFilter(v); setPage(1); }}
            allowClear
            className="w-full sm:w-44"
            optionFilterProp="label"
            options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
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
            <Button type="primary" icon={<Plus size={16} />} onClick={openAddModal} className="w-full sm:w-auto">
              Add Rate
            </Button>
          </div>
        </div>
        <div className="text-xs text-foreground/60">
          {filteredRates.length} rate{filteredRates.length === 1 ? "" : "s"}
          {hasActiveFilters ? ` matched (of ${allRates.length})` : ""}
        </div>
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={pagedRates}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: filteredRates.length,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t, range) => `${range[0]}-${range[1]} of ${t}`,
        }}
      />

      <Modal
        title={editingId ? "Edit Zone Rate" : "Add Zone Rate"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={upsertRate.isPending}
        okText={editingId ? "Save" : "Add"}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{ volumetricDivisor: 5000 }}>
          <Form.Item name="courier" label="Courier" rules={[{ required: true }]}>
            <Select
              placeholder="Select courier"
              disabled={!!editingId}
              options={couriers.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
            <Select disabled={!!editingId} options={planOptions} />
          </Form.Item>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Form.Item name="originZone" label="Origin Zone" rules={[{ required: true }]}>
              <Select
                placeholder="Select zone"
                disabled={!!editingId}
                options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
              />
            </Form.Item>
            <Form.Item name="destinationZone" label="Destination Zone" rules={[{ required: true }]}>
              <Select
                placeholder="Select zone"
                disabled={!!editingId}
                options={zones.map((z) => ({ label: `${z.code} - ${z.name}`, value: z.id }))}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Form.Item name="ratePerKg" label="Rate/kg (₹)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} className="w-full" />
            </Form.Item>
            <Form.Item name="rtoRatePerKg" label="RTO Rate/kg (₹)">
              <InputNumber min={0} step={0.5} className="w-full" />
            </Form.Item>
            <Form.Item name="volumetricDivisor" label="Vol. Divisor">
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <ImportZoneRatesCsvModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        couriers={couriers.map(
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
