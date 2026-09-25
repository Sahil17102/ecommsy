import { useState, useEffect } from "react";
import { Select, InputNumber, Button, Form, Collapse, message } from "antd";
import { Save, Plus, Trash2 } from "lucide-react";
import { useB2bAdditionalCharges, useUpsertB2bAdditionalCharges } from "../queries";
import { useCouriers } from "@/features/couriers/queries";
import { usePlans } from "@/features/plans/queries";

export default function AdditionalChargesTab() {
  const [selectedCourier, setSelectedCourier] = useState<string>();
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const [form] = Form.useForm();

  const { data: couriersData } = useCouriers();
  const couriers = (couriersData?.couriers ?? []).filter((c: { businessType: string[] }) =>
    c.businessType?.includes("b2b"),
  );

  const { data: plansData } = usePlans({ isActive: true });
  const plans = plansData?.plans ?? [];
  const planOptions = plans.map((p) => ({ label: p.name, value: p.slug }));
  const defaultPlanSlug = (plans.find((p) => p.isDefault) ?? plans[0])?.slug;

  // Default the plan filter to the tenant's default/first plan once plans load.
  useEffect(() => {
    if (!selectedPlan && defaultPlanSlug) setSelectedPlan(defaultPlanSlug);
  }, [selectedPlan, defaultPlanSlug]);

  const { data } = useB2bAdditionalCharges({ courier: selectedCourier, plan: selectedPlan });
  const upsertCharges = useUpsertB2bAdditionalCharges();

  const charges = data?.data ?? [];
  const currentCharge = charges[0];

  useEffect(() => {
    if (currentCharge) {
      form.setFieldsValue({ ...currentCharge, plan: currentCharge.plan ?? selectedPlan });
    } else {
      form.resetFields();
      form.setFieldsValue({ plan: selectedPlan });
    }
  }, [currentCharge, form, selectedPlan]);

  async function handleSave() {
    if (!selectedCourier) {
      message.warning("Select a courier first");
      return;
    }
    const values = await form.validateFields();
    const courier = couriers.find((c: { id: string }) => c.id === selectedCourier);
    const plan = values.plan || selectedPlan || defaultPlanSlug;
    if (!plan) {
      message.warning("Select a plan first");
      return;
    }
    await upsertCharges.mutateAsync({
      ...values,
      courier: selectedCourier,
      plan,
      serviceProvider: courier?.serviceProvider ?? "",
    });
    setSelectedPlan(plan);
    message.success("Charges saved");
  }

  const collapseItems = [
    {
      key: "base",
      label: "Base Charges",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3">
          <Form.Item name="awbCharges" label="AWB Charges (₹)">
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>
          <Form.Item name="minimumChargeableWeight" label="Min Chargeable Weight (kg)">
            <InputNumber min={0} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item name="minimumChargeableAmount" label="Min Chargeable Amount (₹)">
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "cod",
      label: "COD & ROV / Insurance",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3">
          <Form.Item name="codChargesFlat" label="COD Flat (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="codPercent" label="COD (%)">
            <InputNumber min={0} max={100} step={0.1} className="w-full" />
          </Form.Item>
          <Form.Item name="codMinimum" label="COD Minimum (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="rovPercent" label="ROV (%)">
            <InputNumber min={0} max={100} step={0.1} className="w-full" />
          </Form.Item>
          <Form.Item name="rovMinimum" label="ROV Minimum (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "handling",
      label: "Handling Charges",
      children: (
        <Form.List name="handlingCharges">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-3 sm:items-end border-b sm:border-0 border-border-light/60 pb-2 sm:pb-0">
                  <Form.Item {...restField} name={[name, "minWeight"]} label="Min Weight (kg)" className="flex-1 mb-2 sm:mb-6">
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "maxWeight"]} label="Max Weight (kg)" className="flex-1 mb-2 sm:mb-6">
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "charge"]} label="Charge (₹)" className="flex-1 mb-2 sm:mb-6">
                    <InputNumber min={0} className="w-full" />
                  </Form.Item>
                  <Button danger icon={<Trash2 size={14} />} onClick={() => remove(name)} className="self-end sm:self-auto sm:mb-6" />
                </div>
              ))}
              <Button type="dashed" onClick={() => add({ minWeight: 0, maxWeight: 100, charge: 0 })} icon={<Plus size={14} />}>
                Add Tier
              </Button>
            </div>
          )}
        </Form.List>
      ),
    },
    {
      key: "oda",
      label: "ODA & CSD & Mall",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3">
          <Form.Item name="odaChargesFlat" label="ODA Flat (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="odaChargesPerKg" label="ODA Per Kg (₹)">
            <InputNumber min={0} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item name="csdCharges" label="CSD Charges (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="mallDeliveryCharges" label="Mall Delivery (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "surcharges",
      label: "Fuel Surcharge & Green Tax",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3">
          <Form.Item name="fuelSurchargePercent" label="Fuel Surcharge (%)">
            <InputNumber min={0} max={100} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item name="greenTax" label="Green Tax (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "demurrage",
      label: "Storage & Demurrage",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3">
          <Form.Item name="demurrageFreeHours" label="Free Storage (hours)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="demurragePerHour" label="Demurrage/hour (₹)">
            <InputNumber min={0} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item name="demurrageMaxDays" label="Max Days">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "special",
      label: "Special Delivery",
      children: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Form.Item name="timeSpecificDeliveryCharge" label="Time-Specific Delivery (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="holidayPickupCharge" label="Holiday Pickup (₹)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <Select
          showSearch
          placeholder="Select courier"
          value={selectedCourier}
          onChange={setSelectedCourier}
          allowClear
          className="w-full sm:w-60"
          optionFilterProp="label"
          options={couriers.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))}
        />
        <Select
          placeholder="Plan"
          value={selectedPlan}
          onChange={(v) => setSelectedPlan(v)}
          className="w-full sm:w-36"
          options={planOptions}
        />
        <div className="sm:ml-auto w-full sm:w-auto">
          <Button type="primary" icon={<Save size={16} />} onClick={handleSave} loading={upsertCharges.isPending} disabled={!selectedCourier} className="w-full sm:w-auto">
            Save Charges
          </Button>
        </div>
      </div>

      {selectedCourier ? (
        <Form form={form} layout="vertical" initialValues={{ plan: selectedPlan }}>
          <Form.Item name="plan" hidden>
            <Select options={planOptions} />
          </Form.Item>
          <Collapse items={collapseItems} defaultActiveKey={["base", "cod"]} />
        </Form>
      ) : (
        <div className="text-center py-12 text-foreground/50">
          Select a courier to configure additional charges
        </div>
      )}
    </div>
  );
}
