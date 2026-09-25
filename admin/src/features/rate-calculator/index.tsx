import { useState } from "react";
import {
  Button,
  InputNumber,
  Input,
  Segmented,
  Select,
  Switch,
  Tag,
  Tooltip,
  Empty,
  message,
} from "antd";
import {
  Calculator,
  Package,
  Truck,
  Zap,
  MapPin,
  ArrowRight,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useAvailableCouriers } from "./queries";
import { useCalculateB2bRate } from "@/features/b2b-pricing/queries";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import {
  expandPackagesByQuantity,
  totalBoxCount,
  totalDeadWeightKg,
  totalVolumetricWeightKg,
  totalBillableWeightKg,
} from "@/utils/b2bBoxes";
import type { AvailableCourier } from "./types";
import type { B2bAvailableCourier } from "@/features/b2b-pricing/types";

type OrderType = "B2C" | "B2B";

export default function RateCalculatorPage() {
  const [orderType, setOrderType] = useState<OrderType>("B2C");

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Calculator}
        title="Rate Calculator"
        subtitle="Calculate shipping rates across all available couriers for any route"
      />

      <Segmented
        value={orderType}
        onChange={(v) => setOrderType(v as OrderType)}
        options={[
          { label: "B2C", value: "B2C" },
          { label: "B2B", value: "B2B" },
        ]}
      />

      {orderType === "B2C" ? <B2cCalculator /> : <B2bCalculator />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// B2C
// ─────────────────────────────────────────────────────────

interface B2cFormState {
  origin: string;
  destination: string;
  weight: string;
  length: string;
  breadth: string;
  height: string;
  paymentType: "prepaid" | "cod";
  orderAmount: string;
}

const initialB2c: B2cFormState = {
  origin: "",
  destination: "",
  weight: "",
  length: "",
  breadth: "",
  height: "",
  paymentType: "prepaid",
  orderAmount: "",
};

function B2cCalculator() {
  const [form, setForm] = useState<B2cFormState>(initialB2c);
  const { mutate, data: couriers, isPending, reset } = useAvailableCouriers();

  const set = (key: keyof B2cFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.origin.length === 6 &&
    form.destination.length === 6 &&
    Number(form.weight) > 0;

  function handleCalculate() {
    mutate(
      {
        origin: form.origin,
        destination: form.destination,
        weight: Number(form.weight),
        length: form.length ? Number(form.length) : undefined,
        breadth: form.breadth ? Number(form.breadth) : undefined,
        height: form.height ? Number(form.height) : undefined,
        paymentType: form.paymentType,
        orderAmount: form.orderAmount ? Number(form.orderAmount) : undefined,
        orderType: "B2C",
      },
      { onError: (err) => message.error(err.message) },
    );
  }

  function handleReset() {
    setForm(initialB2c);
    reset();
  }

  return (
    <>
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <MapPin className="inline w-3 h-3 mr-1" />Origin Pincode
            </label>
            <Input
              placeholder="e.g. 110001"
              maxLength={6}
              value={form.origin}
              onChange={(e) => set("origin", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <MapPin className="inline w-3 h-3 mr-1" />Destination Pincode
            </label>
            <Input
              placeholder="e.g. 400001"
              maxLength={6}
              value={form.destination}
              onChange={(e) => set("destination", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Weight (grams)</label>
            <InputNumber
              className="!w-full"
              placeholder="e.g. 500"
              min={1}
              max={70000}
              value={form.weight ? Number(form.weight) : undefined}
              onChange={(v) => set("weight", v ? String(v) : "")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <Package className="inline w-3 h-3 mr-1" />Dimensions (L x B x H cm)
            </label>
            <div className="flex gap-2">
              <InputNumber className="!w-full" placeholder="L" min={0} value={form.length ? Number(form.length) : undefined} onChange={(v) => set("length", v ? String(v) : "")} />
              <InputNumber className="!w-full" placeholder="B" min={0} value={form.breadth ? Number(form.breadth) : undefined} onChange={(v) => set("breadth", v ? String(v) : "")} />
              <InputNumber className="!w-full" placeholder="H" min={0} value={form.height ? Number(form.height) : undefined} onChange={(v) => set("height", v ? String(v) : "")} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Payment Type</label>
            <Segmented
              block
              value={form.paymentType}
              onChange={(v) => set("paymentType", v as "prepaid" | "cod")}
              options={[
                { label: "Prepaid", value: "prepaid" },
                { label: "COD", value: "cod" },
              ]}
            />
          </div>
          {form.paymentType === "cod" && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Order Amount (₹)</label>
              <InputNumber
                className="!w-full"
                placeholder="e.g. 1500"
                min={0}
                value={form.orderAmount ? Number(form.orderAmount) : undefined}
                onChange={(v) => set("orderAmount", v ? String(v) : "")}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button type="primary" loading={isPending} disabled={!canSubmit} onClick={handleCalculate}>
            Calculate Rates
          </Button>
          <Button onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {couriers && couriers.length === 0 && (
        <div className="bg-background-elevated border border-border-light rounded-xl p-8">
          <Empty description="No couriers available for this route and parameters." />
        </div>
      )}

      {couriers && couriers.length > 0 && (
        <div>
          <p className="text-sm text-muted mb-3">
            {couriers.length} courier{couriers.length > 1 ? "s" : ""} available &middot;
            Zone: <strong className="text-foreground">{couriers[0].zone.name}</strong> ({couriers[0].zone.code})
          </p>
          <div className="grid gap-3">
            {couriers.map((c) => (
              <B2cCourierCard key={`${c.courierId}-${c.mode}`} courier={c} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function B2cCourierCard({ courier }: { courier: AvailableCourier }) {
  return (
    <div className="bg-background-elevated border border-border-light rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {courier.logo ? (
          <img src={courier.logo} alt={courier.name} className="w-9 h-9 rounded-lg object-contain bg-background p-1 border border-border-light" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-background border border-border-light flex items-center justify-center">
            <Truck className="w-4 h-4 text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">{courier.name}</span>
            {courier.tag === "economy" && <Tag color="green" className="!text-xs">Cheapest</Tag>}
            {courier.tag === "fastest" && (
              <Tag color="blue" className="!text-xs"><Zap className="inline w-3 h-3 mr-0.5" />Fastest</Tag>
            )}
          </div>
          <div className="text-xs text-muted flex flex-wrap gap-2 mt-0.5">
            <span>{formatKeyword(courier.serviceProviderDisplayName)}</span>
            <span>&middot;</span>
            <Tag className="!text-xs !m-0" color={courier.mode === "air" ? "blue" : "green"}>
              {courier.mode === "air" ? "Air" : "Surface"}
            </Tag>
            <span>&middot;</span>
            <span>Chargeable: {courier.chargeableWeight}g</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Tooltip title="Base freight charge">
          <div className="text-center">
            <div className="text-muted text-xs">Freight</div>
            <div className="font-medium text-foreground">{formatCurrency(courier.rate.freightCharge)}</div>
          </div>
        </Tooltip>
        <Tooltip title="COD charges">
          <div className="text-center">
            <div className="text-muted text-xs">COD</div>
            <div className="font-medium text-foreground">{formatCurrency(courier.rate.codCharges)}</div>
          </div>
        </Tooltip>
        <Tooltip title="Other charges">
          <div className="text-center">
            <div className="text-muted text-xs">Other</div>
            <div className="font-medium text-foreground">{formatCurrency(courier.rate.otherCharges)}</div>
          </div>
        </Tooltip>
        <Tooltip title="RTO charges (if returned)">
          <div className="text-center">
            <div className="text-muted text-xs">RTO</div>
            <div className="font-medium text-foreground">{formatCurrency(courier.rate.rto)}</div>
          </div>
        </Tooltip>

        <ArrowRight className="w-4 h-4 text-muted hidden sm:block" />

        <div className="text-center bg-primary-bg rounded-lg px-4 py-2">
          <div className="text-muted text-xs">Total</div>
          <div className="font-bold text-primary text-lg">{formatCurrency(courier.rate.totalCharge)}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// B2B
// ─────────────────────────────────────────────────────────

interface B2bPackageState {
  quantity: string;
  weight: string;
  length: string;
  breadth: string;
  height: string;
}

interface B2bFormState {
  origin: string;
  destination: string;
  paymentType: "prepaid" | "cod";
  orderAmount: string;
  plan: string;
  packages: B2bPackageState[];
  declaredValue: string;
  isInsurance: boolean;
  isTimeSpecificDelivery: boolean;
  isHolidayPickup: boolean;
}

const emptyPackage: B2bPackageState = { quantity: "1", weight: "", length: "", breadth: "", height: "" };

const initialB2b: B2bFormState = {
  origin: "",
  destination: "",
  paymentType: "prepaid",
  orderAmount: "",
  plan: "basic",
  packages: [{ ...emptyPackage }],
  declaredValue: "",
  isInsurance: false,
  isTimeSpecificDelivery: false,
  isHolidayPickup: false,
};

function B2bCalculator() {
  const [form, setForm] = useState<B2bFormState>(initialB2b);
  const [results, setResults] = useState<B2bAvailableCourier[] | null>(null);
  const calculateRate = useCalculateB2bRate();

  const setField = <K extends keyof B2bFormState>(key: K, value: B2bFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updatePackage = (idx: number, key: keyof B2bPackageState, value: string) =>
    setForm((prev) => ({
      ...prev,
      packages: prev.packages.map((p, i) => (i === idx ? { ...p, [key]: value } : p)),
    }));

  const addPackage = () =>
    setForm((prev) => ({ ...prev, packages: [...prev.packages, { ...emptyPackage }] }));

  const removePackage = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== idx),
    }));

  const allPackagesValid = form.packages.every(
    (p) =>
      Number(p.quantity) >= 1 &&
      Number(p.weight) > 0 &&
      Number(p.length) > 0 &&
      Number(p.breadth) > 0 &&
      Number(p.height) > 0,
  );

  const canSubmit =
    form.origin.length === 6 &&
    form.destination.length === 6 &&
    form.packages.length > 0 &&
    allPackagesValid;

  const totals = {
    dead: totalDeadWeightKg(form.packages),
    vol: totalVolumetricWeightKg(form.packages),
    billable: totalBillableWeightKg(form.packages),
  };

  const totalBoxes = totalBoxCount(form.packages);

  async function handleCalculate() {
    try {
      const expandedPackages = expandPackagesByQuantity(form.packages);
      const res = await calculateRate.mutateAsync({
        origin: form.origin,
        destination: form.destination,
        packages: expandedPackages,
        paymentType: form.paymentType,
        orderAmount: form.orderAmount ? Number(form.orderAmount) : 0,
        plan: form.plan,
        declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined,
        isInsurance: form.isInsurance,
        isTimeSpecificDelivery: form.isTimeSpecificDelivery,
        isHolidayPickup: form.isHolidayPickup,
      });
      setResults(res.data ?? []);
    } catch (err) {
      message.error((err as Error).message);
    }
  }

  function handleReset() {
    setForm(initialB2b);
    setResults(null);
    calculateRate.reset();
  }

  return (
    <>
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <MapPin className="inline w-3 h-3 mr-1" />Origin Pincode
            </label>
            <Input
              placeholder="e.g. 110020"
              maxLength={6}
              value={form.origin}
              onChange={(e) => setField("origin", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              <MapPin className="inline w-3 h-3 mr-1" />Destination Pincode
            </label>
            <Input
              placeholder="e.g. 400069"
              maxLength={6}
              value={form.destination}
              onChange={(e) => setField("destination", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Plan</label>
            <Select
              className="!w-full"
              value={form.plan}
              onChange={(v) => setField("plan", v)}
              options={[
                { label: "Basic", value: "basic" },
                { label: "Gold", value: "gold" },
                { label: "Platinum", value: "platinum" },
                { label: "Diamond", value: "diamond" },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Payment Type</label>
            <Segmented
              block
              value={form.paymentType}
              onChange={(v) => setField("paymentType", v as "prepaid" | "cod")}
              options={[
                { label: "Prepaid", value: "prepaid" },
                { label: "COD", value: "cod" },
              ]}
            />
          </div>
          {form.paymentType === "cod" && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Order Amount (₹)</label>
              <InputNumber
                className="!w-full"
                placeholder="e.g. 50000"
                min={0}
                value={form.orderAmount ? Number(form.orderAmount) : undefined}
                onChange={(v) => setField("orderAmount", v ? String(v) : "")}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Declared Value (₹)</label>
            <InputNumber
              className="!w-full"
              placeholder="for insurance/ROV"
              min={0}
              value={form.declaredValue ? Number(form.declaredValue) : undefined}
              onChange={(v) => setField("declaredValue", v ? String(v) : "")}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1.5">Add-ons</label>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  size="small"
                  checked={form.isInsurance}
                  onChange={(v) => setField("isInsurance", v)}
                />
                Insurance
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  size="small"
                  checked={form.isTimeSpecificDelivery}
                  onChange={(v) => setField("isTimeSpecificDelivery", v)}
                />
                Time-specific delivery
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <Switch
                  size="small"
                  checked={form.isHolidayPickup}
                  onChange={(v) => setField("isHolidayPickup", v)}
                />
                Holiday pickup
              </label>
            </div>
          </div>
        </div>

        {/* Packages */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-foreground">
              <Package className="inline w-3.5 h-3.5 mr-1" />
              Packages / Boxes ({form.packages.length} type{form.packages.length > 1 ? "s" : ""}, {totalBoxes} total)
            </div>
            <Button size="small" type="dashed" icon={<Plus className="w-3 h-3" />} onClick={addPackage}>
              Add Box
            </Button>
          </div>

          <div className="space-y-2">
            {form.packages.map((pkg, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-background border border-border-light rounded-lg p-2"
              >
                <div className="col-span-1 text-xs text-muted text-center font-medium">#{idx + 1}</div>
                <div className="col-span-2">
                  <InputNumber
                    className="!w-full"
                    placeholder="Qty"
                    min={1}
                    step={1}
                    precision={0}
                    value={pkg.quantity ? Number(pkg.quantity) : undefined}
                    onChange={(v) => updatePackage(idx, "quantity", v ? String(v) : "")}
                  />
                </div>
                <div className="col-span-2">
                  <InputNumber
                    className="!w-full"
                    placeholder="Wt (kg)"
                    min={0.01}
                    step={0.5}
                    value={pkg.weight ? Number(pkg.weight) : undefined}
                    onChange={(v) => updatePackage(idx, "weight", v ? String(v) : "")}
                  />
                </div>
                <div className="col-span-2">
                  <InputNumber
                    className="!w-full"
                    placeholder="L (cm)"
                    min={0.1}
                    value={pkg.length ? Number(pkg.length) : undefined}
                    onChange={(v) => updatePackage(idx, "length", v ? String(v) : "")}
                  />
                </div>
                <div className="col-span-2">
                  <InputNumber
                    className="!w-full"
                    placeholder="B (cm)"
                    min={0.1}
                    value={pkg.breadth ? Number(pkg.breadth) : undefined}
                    onChange={(v) => updatePackage(idx, "breadth", v ? String(v) : "")}
                  />
                </div>
                <div className="col-span-2">
                  <InputNumber
                    className="!w-full"
                    placeholder="H (cm)"
                    min={0.1}
                    value={pkg.height ? Number(pkg.height) : undefined}
                    onChange={(v) => updatePackage(idx, "height", v ? String(v) : "")}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {form.packages.length > 1 && (
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => removePackage(idx)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="bg-background border border-border-light rounded-lg p-2 text-center">
              <div className="text-xs text-muted">Dead Wt</div>
              <div className="font-semibold text-foreground">{totals.dead.toFixed(2)} kg</div>
            </div>
            <div className="bg-background border border-border-light rounded-lg p-2 text-center">
              <div className="text-xs text-muted">Volumetric Wt</div>
              <div className="font-semibold text-foreground">{totals.vol.toFixed(2)} kg</div>
            </div>
            <div className="bg-primary-bg border border-primary/30 rounded-lg p-2 text-center">
              <div className="text-xs text-muted">Billable Wt</div>
              <div className="font-bold text-primary">{totals.billable.toFixed(2)} kg</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button
            type="primary"
            loading={calculateRate.isPending}
            disabled={!canSubmit}
            onClick={handleCalculate}
          >
            Calculate Rates
          </Button>
          <Button onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {results && results.length === 0 && (
        <div className="bg-background-elevated border border-border-light rounded-xl p-8">
          <Empty description="No B2B couriers available for this route and parameters." />
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          <p className="text-sm text-muted mb-3">
            {results.length} courier{results.length > 1 ? "s" : ""} available &middot;
            Zone:{" "}
            <strong className="text-foreground">{results[0].zone.originName}</strong> ({results[0].zone.originCode}) →{" "}
            <strong className="text-foreground">{results[0].zone.destinationName}</strong> ({results[0].zone.destinationCode})
          </p>
          <div className="grid gap-3">
            {results.map((c) => (
              <B2bCourierCard key={c.courierId} courier={c} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function B2bCourierCard({ courier }: { courier: B2bAvailableCourier }) {
  return (
    <div className="bg-background-elevated border border-border-light rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {courier.logo ? (
            <img
              src={courier.logo}
              alt={courier.name}
              className="w-9 h-9 rounded-lg object-contain bg-background p-1 border border-border-light"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-background border border-border-light flex items-center justify-center">
              <Truck className="w-4 h-4 text-muted" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{courier.name}</span>
              {courier.tag === "economy" && <Tag color="green" className="!text-xs">Cheapest</Tag>}
              {courier.tag === "fastest" && (
                <Tag color="blue" className="!text-xs"><Zap className="inline w-3 h-3 mr-0.5" />Fastest</Tag>
              )}
            </div>
            <div className="text-xs text-muted flex flex-wrap gap-2 mt-0.5">
              <span>{formatKeyword(courier.serviceProviderDisplayName)}</span>
              <span>&middot;</span>
              <span>Billable: {courier.billableWeight} kg</span>
            </div>
          </div>
        </div>

        <div className="text-center bg-primary-bg rounded-lg px-4 py-2">
          <div className="text-muted text-xs">Total</div>
          <div className="font-bold text-primary text-lg">{formatCurrency(courier.rate.total)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className="flex justify-between border-b border-border-light pb-1">
          <span className="text-muted">Base Freight</span>
          <span className="font-medium text-foreground">
            {formatCurrency(courier.rate.baseFreight)}
          </span>
        </div>
        {courier.rate.overheads.map((o) => (
          <div key={o.code} className="flex justify-between border-b border-border-light pb-1">
            <span className="text-muted">{o.name}</span>
            <span className="font-medium text-foreground">{formatCurrency(o.amount)}</span>
          </div>
        ))}
        {courier.rate.rtoRate > 0 && (
          <div className="flex justify-between border-b border-border-light pb-1">
            <span className="text-muted">RTO Rate (if returned)</span>
            <span className="font-medium text-foreground">{formatCurrency(courier.rate.rtoRate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
