import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, useFormContext, FormProvider, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useKyc } from "@/pages/settings/kyc/queries";

import { orderFormSchema, type OrderFormValues } from "@/schemas/orderSchema";
import {
  generateOrderId,
  generateInvoiceNumber,
  getTodayDate,
  calcSubtotal,
  formatCurrency,
} from "@/utils/orderHelpers";
import { normalizeQuantity, totalDeadWeightKg } from "@/utils/b2bBoxes";
import { useCreateOrder } from "@/queries/useOrders";
import { FormToggle } from "@/components/forms";
import type { AvailableCourier } from "@/lib/ratesApi";
import { ordersApi, type CreateOrderPayload } from "@/lib/ordersApi";
import {
  OrderDetailsSection,
  DeliveryDetailsSection,
  ProductsSection,
  PackageDetailsSection,
  B2bPackagesSection,
  InvoiceDetailsSection,
  ChargesSummarySection,
  PickupLocationSection,
  CourierSelectionSection,
  StepIndicator,
  type Step,
} from "@/components/orders";

const STEPS: Step[] = [
  { label: "Order & Delivery", shortLabel: "Order" },
  { label: "Pickup Location", shortLabel: "Pickup" },
  { label: "Courier Selection", shortLabel: "Courier" },
];

function MobileBottomBar({
  isSubmitting,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  nextLabel = "Next Step",
}: {
  isSubmitting: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
}) {
  const { watch } = useFormContext<OrderFormValues>();
  const products = watch("products") || [];
  const transactionFee = Number(watch("transactionFee")) || 0;
  const discount = Number(watch("discount")) || 0;
  const subtotal = calcSubtotal(products);
  const totalOrderValue = subtotal + transactionFee - discount;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background-elevated border-t border-border-light px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted">Total Order Value</p>
          <p className="text-base font-bold text-foreground truncate">
            {formatCurrency(totalOrderValue)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-border-light text-muted hover:text-primary hover:border-primary/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20"
            >
              {nextLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Order
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CreateOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: kyc, isLoading: isKycLoading } = useKyc();
  const createOrderMutation = useCreateOrder();
  const [currentStep, setCurrentStep] = useState(1);
  const availableCouriersRef = useRef<AvailableCourier[]>([]);

  const handleCouriersLoaded = useCallback((couriers: AvailableCourier[]) => {
    availableCouriersRef.current = couriers;
  }, []);

  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderType: "B2C",
      orderId: generateOrderId(),
      orderDate: getTodayDate(),
      paymentType: "prepaid",
      buyerName: "",
      buyerPhone: "",
      buyerEmail: "",
      pincode: "",
      city: "",
      state: "",
      address: "",
      companyName: "",
      gstin: "",
      invoices: [
        {
          invoiceNumber: generateInvoiceNumber(),
          invoiceDate: getTodayDate(),
          invoiceValue: 0,
          ebnNumber: "",
          ebnExpiry: "",
          invoiceFile: null,
        },
      ],
      packages: [{ boxId: "BOX-1", quantity: 1, weight: 0, length: 0, breadth: 0, height: 0 }],
      products: [{ name: "", unitPrice: 0, quantity: 1 }],
      weight: 0,
      length: 0,
      breadth: 0,
      height: 0,
      transactionFee: 0,
      discount: 0,
      prepaidAmount: 0,
      pickupAddressId: "",
      preferredPickupDate: getTodayDate(),
      preferredPickupTime: "10:00",
      selectedCourierId: "",
    },
    mode: "onBlur",
  });

  const {
    handleSubmit,
    control,
    reset,
    trigger,
    watch: watchField,
    formState: { isSubmitting },
  } = methods;

  const currentOrderType = watchField("orderType");
  const draftId = searchParams.get("draftId");

  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    ordersApi
      .getById(draftId)
      .then((order) => {
        if (cancelled) return;
        const productTotal = (order.products ?? []).reduce(
          (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
          0,
        );
        reset({
          orderType: order.orderType?.toUpperCase() === "B2B" ? "B2B" : "B2C",
          orderId: order.orderId,
          orderDate: order.orderDate || getTodayDate(),
          paymentType: order.paymentType ?? "prepaid",
          buyerName: order.deliveryAddress?.contactName || order.customer?.name || "",
          buyerPhone: order.deliveryAddress?.phone || order.customer?.phone || "",
          buyerEmail: order.deliveryAddress?.email || order.customer?.email || "",
          pincode: order.deliveryAddress?.pincode || "",
          city: order.deliveryAddress?.city || "",
          state: order.deliveryAddress?.state || "",
          address: order.deliveryAddress?.addressLine1 || "",
          companyName: order.companyName || "",
          gstin: order.companyGst || "",
          invoices: order.invoices?.length
            ? order.invoices.map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                invoiceValue: inv.invoiceValue,
                ebnNumber: inv.ebn || "",
                ebnExpiry: inv.ebnExpiry || "",
                invoiceFile: null,
              }))
            : [{ invoiceNumber: generateInvoiceNumber(), invoiceDate: getTodayDate(), invoiceValue: order.orderAmount ?? 0, ebnNumber: "", ebnExpiry: "", invoiceFile: null }],
          packages: order.packages?.length
            ? order.packages
            : [{ boxId: "BOX-1", quantity: 1, weight: 0, length: 0, breadth: 0, height: 0 }],
          products: order.products?.length
            ? order.products
            : [{ name: "", unitPrice: 0, quantity: 1 }],
          weight: order.weight ?? 0,
          length: order.length ?? 0,
          breadth: order.breadth ?? 0,
          height: order.height ?? 0,
          transactionFee: Math.max((order.orderAmount ?? 0) - productTotal, 0),
          discount: 0,
          prepaidAmount: order.paymentType === "cod" ? Math.max((order.orderAmount ?? 0) - (order.codAmount ?? 0), 0) : 0,
          pickupAddressId: "",
          preferredPickupDate: getTodayDate(),
          preferredPickupTime: "10:00",
          selectedCourierId: "",
        });
        toast.success("Draft loaded", { description: "Choose pickup and courier to book this shipment." });
      })
      .catch((error: Error) => toast.error("Could not load draft", { description: error.message }));
    return () => {
      cancelled = true;
    };
  }, [draftId, reset]);

  const onSubmit = async (data: OrderFormValues) => {
    // Find selected courier from fetched list
    const selectedCourier = availableCouriersRef.current.find(
      (c) => c.courierId === data.selectedCourierId,
    );

    if (!selectedCourier) {
      // Only show toast when courier options have loaded (user had a chance to select).
      // Avoid showing it when user just landed on step 3 and options are still loading.
      if (availableCouriersRef.current.length > 0) {
        toast.error("Please select a courier partner");
      }
      return;
    }

    if (!data.pickupAddressId) {
      toast.error("Please select a pickup address");
      return;
    }

    const subtotal = calcSubtotal(data.products);
    const totalOrderValue = subtotal + data.transactionFee - data.discount;
    const codAmount =
      data.paymentType === "cod"
        ? Math.max(totalOrderValue - data.prepaidAmount, 0)
        : 0;

    // For B2B, derive aggregate top-level dimensions/weight from packages[].
    // Server still uses these for serviceability checks and order persistence.
    // weight: sum of package weights (kg → grams). dimensions: max across boxes.
    let topWeight = data.weight ?? 0;
    let topLength = data.length ?? 0;
    let topBreadth = data.breadth ?? 0;
    let topHeight = data.height ?? 0;
    if (data.orderType === "B2B" && data.packages && data.packages.length > 0) {
      // Σ (per-box weight × qty), then convert kg → grams for the legacy top-level field.
      topWeight = Math.ceil(totalDeadWeightKg(data.packages) * 1000);
      topLength = Math.max(...data.packages.map((p) => p.length ?? 0));
      topBreadth = Math.max(...data.packages.map((p) => p.breadth ?? 0));
      topHeight = Math.max(...data.packages.map((p) => p.height ?? 0));
    }

    const payload: CreateOrderPayload = {
      orderId: data.orderId,
      orderDate: data.orderDate,
      orderType: data.orderType,
      paymentType: data.paymentType,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerEmail: data.buyerEmail || undefined,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      weight: topWeight,
      length: topLength,
      breadth: topBreadth,
      height: topHeight,
      chargeableWeight: selectedCourier.chargeableWeight,
      products: data.products,
      orderAmount: totalOrderValue,
      codAmount,
      discount: data.discount > 0 ? data.discount : undefined,
      courierId: selectedCourier.courierId,
      pickupAddressId: data.pickupAddressId,
      preferredPickupDate: data.preferredPickupDate,
      preferredPickupTime: data.preferredPickupTime || undefined,
      rate: {
        forward: selectedCourier.rate.forward,
        rto: selectedCourier.rate.rto,
        codCharges: selectedCourier.rate.codCharges,
        otherCharges: selectedCourier.rate.otherCharges,
        freightCharge: selectedCourier.rate.freightCharge,
        totalCharge: selectedCourier.rate.totalCharge,
        zone: selectedCourier.zone.code,
      },

      // B2B-specific fields
      ...(data.orderType === "B2B" && {
        companyName: data.companyName,
        companyGst: data.gstin,
        packages: data.packages?.map((p, i) => ({
          boxId: p.boxId || `BOX-${i + 1}`,
          quantity: normalizeQuantity(p.quantity),
          weight: p.weight ?? 0,
          length: p.length ?? 0,
          breadth: p.breadth ?? 0,
          height: p.height ?? 0,
        })),
        invoices: data.invoices?.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          invoiceValue: inv.invoiceValue,
          ebn: inv.ebnNumber || undefined,
          ebnExpiry: inv.ebnExpiry || undefined,
        })),
        chargesBreakdown: (selectedCourier as any)._b2bRate
          ? {
              baseFreight: (selectedCourier as any)._b2bRate.baseFreight,
              overheads: (selectedCourier as any)._b2bRate.overheads,
              total: (selectedCourier as any)._b2bRate.total,
            }
          : undefined,
      }),
    };

    try {
      const order = await createOrderMutation.mutateAsync(payload);
      navigate(`/orders/${order.id}`);
    } catch {
      // Error handled by mutation onError
    }
  };

  // Fields that belong to each step — used to route validation errors & per-step validation
  const STEP1_FIELDS = [
    "orderType", "orderId", "orderDate", "paymentType",
    "buyerName", "buyerPhone", "buyerEmail", "pincode", "city", "state", "address",
    "companyName", "gstin", "invoices", "packages",
    "products", "weight", "length", "breadth", "height",
    "transactionFee", "discount", "prepaidAmount",
  ] as const;
  const STEP2_FIELDS = ["pickupAddressId", "preferredPickupDate", "preferredPickupTime"] as const;
  const STEP1_SET = new Set<string>(STEP1_FIELDS);
  const STEP2_SET = new Set<string>(STEP2_FIELDS);

  const FIELD_LABELS: Record<string, string> = {
    orderType: "Order Type",
    orderId: "Order ID",
    orderDate: "Order Date",
    paymentType: "Payment Type",
    buyerName: "Buyer Name",
    buyerPhone: "Buyer Phone",
    buyerEmail: "Buyer Email",
    pincode: "Pincode",
    city: "City",
    state: "State",
    address: "Address",
    companyName: "Company Name",
    gstin: "GSTIN",
    invoices: "Invoices",
    packages: "Packages",
    products: "Products",
    weight: "Weight",
    length: "Length",
    breadth: "Breadth",
    height: "Height",
    transactionFee: "Transaction Fee",
    discount: "Discount",
    prepaidAmount: "Prepaid Amount",
    pickupAddressId: "Pickup Address",
    preferredPickupDate: "Pickup Date",
    preferredPickupTime: "Pickup Time",
    selectedCourierId: "Courier",
  };

  // Collect labeled fields that currently have errors, in the order given.
  // For array fields (products/packages/invoices), include the row indices
  // of the items that actually have errors so the user knows which row to fix.
  const getErroredLabels = (
    errors: FieldErrors<OrderFormValues>,
    fields: readonly string[],
  ): string[] => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const f of fields) {
      const err = errors[f as keyof OrderFormValues] as unknown;
      if (!err) continue;
      const baseLabel = FIELD_LABELS[f] || f;
      let label = baseLabel;
      if (Array.isArray(err)) {
        const indices = err
          .map((item, i) => (item ? i + 1 : null))
          .filter((v): v is number => v !== null);
        if (indices.length > 0) {
          label = `${baseLabel} (row ${indices.join(", ")})`;
        }
      }
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    return labels;
  };

  const onError = (errors: FieldErrors<OrderFormValues>) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    // Determine which step owns the first error and navigate there
    const firstKey = errorKeys.find((k) => STEP1_SET.has(k) || STEP2_SET.has(k)) ?? errorKeys[0];
    if (STEP1_SET.has(firstKey)) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (STEP2_SET.has(firstKey)) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // List every errored field across all steps so the user knows what to fix
    const allLabels = getErroredLabels(errors, [
      ...STEP1_FIELDS,
      ...STEP2_FIELDS,
      "selectedCourierId",
    ]);
    const description =
      allLabels.length > 0
        ? `Check: ${allLabels.join(", ")}`
        : "Please review the form and try again";

    toast.error("Please fix form errors", { description });
  };

  const goToStep = async (step: number) => {
    // Validate current step fields when moving forward
    if (step > currentStep) {
      const fieldsToValidate =
        currentStep === 1 ? STEP1_FIELDS : currentStep === 2 ? STEP2_FIELDS : [];
      const isValid = await trigger([...fieldsToValidate]);
      if (!isValid) {
        const labels = getErroredLabels(methods.formState.errors, fieldsToValidate);
        toast.error("Please fix the errors before proceeding", {
          description:
            labels.length > 0
              ? `Check: ${labels.join(", ")}`
              : undefined,
        });
        return;
      }
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => goToStep(Math.min(currentStep + 1, STEPS.length));
  const handleBack = () => goToStep(Math.max(currentStep - 1, 1));

  const nextLabel =
    currentStep === 1
      ? "Next: Pickup Location"
      : currentStep === 2
        ? "Next: Courier Selection"
        : undefined;

  // ── KYC Gate ──
  if (isKycLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!kyc || kyc.status !== "approved") {
    const isRejected = kyc?.status === "rejected";
    const isPending = kyc?.status === "pending";

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center space-y-4 px-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-error" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            KYC Verification Required
          </h2>
          <p className="text-sm text-muted">
            {isRejected
              ? "Your KYC was rejected. Please review the rejection reasons and re-upload your documents before creating orders."
              : isPending
                ? "Your KYC is currently under review. You'll be able to create orders once it's approved."
                : "You need to complete KYC verification before you can create orders."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border-light text-muted hover:text-foreground hover:border-foreground/20 transition-all"
            >
              Go Back
            </button>
            {!isPending && (
              <Link
                to="/settings/kyc"
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
              >
                {isRejected ? "Fix KYC" : "Start KYC"}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div>
        {/* Page Header */}
        <div className="bg-background-elevated rounded-2xl border border-border-light mb-5 overflow-hidden">
          {/* Row 1: Title + Order Type */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="p-2 rounded-xl text-muted hover:text-primary hover:bg-primary/[0.06] border border-border-light hover:border-primary/20 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">
                  Create New Order
                </h1>
                <p className="text-[11px] text-muted mt-0.5 hidden sm:block">
                  Fill in the details to create a shipping order
                </p>
              </div>
            </div>

            <Controller
              name="orderType"
              control={control}
              render={({ field }) => (
                <FormToggle
                  options={[
                    {
                      value: "B2C",
                      label: "B2C",
                      icon: <UserRound className="w-3.5 h-3.5" />,
                    },
                    {
                      value: "B2B",
                      label: "B2B",
                      icon: <Building2 className="w-3.5 h-3.5" />,
                    },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Divider */}
          <div className="mx-4 sm:mx-5 border-t border-border-light" />

          {/* Row 2: Step Indicator */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3">
            <StepIndicator
              steps={STEPS}
              currentStep={currentStep}
              onStepClick={goToStep}
            />
          </div>
        </div>

        {/* Form — grid is OUTSIDE motion containers so sticky works */}
        <form onSubmit={handleSubmit(onSubmit, onError)} className="w-full pb-24 lg:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start w-full">
            {/* Left column: step content (animated) */}
            <div className="lg:col-span-7 min-w-0 min-h-[calc(100vh-12rem)]">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <OrderDetailsSection />
                    <DeliveryDetailsSection />
                    <ProductsSection />
                    {currentOrderType === "B2B" ? <B2bPackagesSection /> : <PackageDetailsSection />}
                    <InvoiceDetailsSection />
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <PickupLocationSection />
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <CourierSelectionSection onCouriersLoaded={handleCouriersLoaded} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: sticky summary — OUTSIDE all motion.div containers */}
            <div className="hidden lg:block lg:col-span-3 min-w-0">
              <div className="sticky top-5 max-h-[calc(100vh-2.5rem)] overflow-y-auto scrollbar-thin">
                <ChargesSummarySection
                  isSubmitting={isSubmitting}
                  currentStep={currentStep}
                  totalSteps={STEPS.length}
                  onNext={handleNext}
                  onBack={currentStep > 1 ? handleBack : undefined}
                  nextLabel={nextLabel}
                />
              </div>
            </div>
          </div>

          {/* Mobile fixed bottom bar */}
          <MobileBottomBar
            isSubmitting={isSubmitting}
            currentStep={currentStep}
            totalSteps={STEPS.length}
            onNext={handleNext}
            onBack={currentStep > 1 ? handleBack : undefined}
            nextLabel={nextLabel}
          />
        </form>
      </div>
    </FormProvider>
  );
}
