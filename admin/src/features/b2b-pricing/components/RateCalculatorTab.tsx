import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Select, Button, Card, Tag, Divider } from "antd";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { useCalculateB2bRate } from "../queries";
import { usePlans } from "@/features/plans/queries";
import { formatCurrency } from "@/lib/utils";
import { expandPackagesByQuantity } from "@/utils/b2bBoxes";
import type { B2bAvailableCourier } from "../types";

export default function RateCalculatorTab() {
  const [form] = Form.useForm();
  const [results, setResults] = useState<B2bAvailableCourier[]>([]);
  const calculateRate = useCalculateB2bRate();

  const { data: plansData } = usePlans({ isActive: true });
  const plans = plansData?.plans ?? [];
  const planOptions = plans.map((p) => ({ label: p.name, value: p.slug }));
  const defaultPlanSlug = (plans.find((p) => p.isDefault) ?? plans[0])?.slug;

  // Seed the plan field with the tenant's default/first plan once plans load.
  useEffect(() => {
    if (defaultPlanSlug && !form.getFieldValue("plan")) {
      form.setFieldValue("plan", defaultPlanSlug);
    }
  }, [defaultPlanSlug, form]);

  async function handleCalculate() {
    const values = await form.validateFields();
    const expandedPackages = expandPackagesByQuantity(
      values.packages as Array<{
        weight: number; length: number; breadth: number; height: number; quantity?: number;
      }>,
    );
    const res = await calculateRate.mutateAsync({
      origin: values.origin,
      destination: values.destination,
      packages: expandedPackages,
      paymentType: values.paymentType,
      orderAmount: values.orderAmount ?? 0,
      plan: values.plan,
      declaredValue: values.declaredValue,
      isInsurance: values.isInsurance ?? false,
    });
    setResults(res.data ?? []);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* Form */}
      <div>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            paymentType: "prepaid",
            packages: [{ quantity: 1, weight: 10, length: 50, breadth: 40, height: 30 }],
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Form.Item name="origin" label="Origin Pincode" rules={[{ required: true }]}>
              <Input placeholder="110020" maxLength={6} />
            </Form.Item>
            <Form.Item name="destination" label="Destination Pincode" rules={[{ required: true }]}>
              <Input placeholder="400069" maxLength={6} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Form.Item name="paymentType" label="Payment">
              <Select options={[
                { label: "Prepaid", value: "prepaid" },
                { label: "COD", value: "cod" },
              ]} />
            </Form.Item>
            <Form.Item name="orderAmount" label="Order Amount (₹)">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="plan" label="Plan">
              <Select options={planOptions} />
            </Form.Item>
          </div>

          <Divider>Packages / Boxes</Divider>

          <Form.List name="packages">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="rounded-lg border border-border-light/60 sm:border-0 p-3 sm:p-0">
                    <div className="grid grid-cols-2 sm:flex sm:gap-2 sm:items-end gap-x-2">
                      <Form.Item {...restField} name={[name, "quantity"]} label="Qty" className="sm:w-20 mb-2 sm:mb-6" rules={[{ required: true, type: "number", min: 1 }]}>
                        <InputNumber min={1} step={1} precision={0} className="w-full" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, "weight"]} label="Weight (kg)" className="sm:flex-1 mb-2 sm:mb-6" rules={[{ required: true }]}>
                        <InputNumber min={0.01} step={0.5} className="w-full" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, "length"]} label="L (cm)" className="sm:flex-1 mb-2 sm:mb-6" rules={[{ required: true }]}>
                        <InputNumber min={0.1} className="w-full" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, "breadth"]} label="B (cm)" className="sm:flex-1 mb-2 sm:mb-6" rules={[{ required: true }]}>
                        <InputNumber min={0.1} className="w-full" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, "height"]} label="H (cm)" className="sm:flex-1 mb-2 sm:mb-6" rules={[{ required: true }]}>
                        <InputNumber min={0.1} className="w-full" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button danger icon={<Trash2 size={14} />} onClick={() => remove(name)} className="col-span-2 sm:col-auto sm:mb-6" />
                      )}
                    </div>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1, weight: 5, length: 30, breadth: 25, height: 20 })} block icon={<Plus size={14} />}>
                  Add Box
                </Button>
              </div>
            )}
          </Form.List>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 mt-4">
            <Form.Item name="declaredValue" label="Declared Value (₹)">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="isInsurance" label="Insurance?" valuePropName="checked">
              <Select options={[{ label: "No", value: false }, { label: "Yes", value: true }]} />
            </Form.Item>
          </div>

          <Button
            type="primary"
            icon={<Calculator size={16} />}
            onClick={handleCalculate}
            loading={calculateRate.isPending}
            block
            size="large"
          >
            Calculate Rate
          </Button>
        </Form>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Results</h3>
        {results.length === 0 ? (
          <div className="text-center py-12 text-foreground/50">
            Enter details and click Calculate to see B2B rates
          </div>
        ) : (
          results.map((courier) => (
            <Card
              key={courier.courierId}
              size="small"
              title={
                <div className="flex items-center gap-2">
                  <span>{courier.name}</span>
                  {courier.tag && <Tag color={courier.tag === "economy" ? "green" : "blue"}>{courier.tag}</Tag>}
                </div>
              }
              extra={<span className="text-lg font-bold text-primary">{formatCurrency(courier.rate.total)}</span>}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">Zone</span>
                  <span>{courier.zone.originCode} → {courier.zone.destinationCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Billable Weight</span>
                  <span>{courier.billableWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Base Freight</span>
                  <span>{formatCurrency(courier.rate.baseFreight)}</span>
                </div>
                {courier.rate.overheads.map((o) => (
                  <div key={o.code} className="flex justify-between">
                    <span className="text-foreground/70">{o.name}</span>
                    <span>{formatCurrency(o.amount)}</span>
                  </div>
                ))}
                <Divider className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(courier.rate.total)}</span>
                </div>
                {courier.rate.rtoRate > 0 && (
                  <div className="flex justify-between text-foreground/50">
                    <span>RTO Rate</span>
                    <span>{formatCurrency(courier.rate.rtoRate)}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
