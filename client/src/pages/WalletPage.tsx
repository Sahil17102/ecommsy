import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Select, DatePicker } from "antd";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useWalletBalance,
  useWalletTransactions,
  useCreateRechargeOrder,
  useVerifyRecharge,
} from "@/queries/useWallet";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { ResponsiveTable, CollapsibleFilters } from "@/components/common";
import {
  BalanceCard,
  RechargeCard,
  WalletStatCards,
  transactionColumns,
  MobileTransactionCard,
} from "@/components/wallet";
import type { WalletTransaction } from "@/lib/walletApi";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";

// ── Constants ──

const PAGE_SIZE = 10;

// Razorpay self-recharge is disabled for this project — the wallet is controlled
// by the server/admin only (sellers cannot top up via Razorpay). Flip to `true`
// to restore the seller-facing recharge flow.
const RECHARGE_ENABLED = false;

type Filters = {
  [key: string]: unknown;
  type: "credit" | "debit" | undefined;
  serviceProvider: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
};

const INITIAL_FILTERS: Filters = {
  type: undefined,
  serviceProvider: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

// ── Page ──

export function WalletPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const { draft, applied, setFilter, apply, clearAll } = useDeferredFilters<Filters>(
    INITIAL_FILTERS,
    () => setPage(1),
  );

  const { data: walletData, isLoading: balanceLoading } = useWalletBalance();
  const { data: txnData, isLoading: txnLoading } = useWalletTransactions({
    type: applied.type,
    serviceProvider: applied.serviceProvider,
    dateFrom: applied.dateFrom,
    dateTo: applied.dateTo,
    page,
    limit: PAGE_SIZE,
    sortField,
    sortOrder,
  });

  const createOrder = useCreateRechargeOrder();
  const verifyRecharge = useVerifyRecharge();

  const transactions = txnData?.transactions ?? [];
  const pagination = txnData?.pagination;

  const courierOptions = useMemo(() => {
    return (txnData?.courierOptions ?? []).map((sp) => ({
      label: formatKeyword(sp),
      value: sp,
    }));
  }, [txnData?.courierOptions]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (applied.type) count++;
    if (applied.serviceProvider) count++;
    if (applied.dateFrom) count++;
    if (applied.dateTo) count++;
    return count;
  }, [applied]);

  // ── Recharge handler ──

  const handleRecharge = useCallback(async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      toast.error("Minimum recharge amount is ₹100");
      return;
    }
    if (numAmount > 500000) {
      toast.error("Maximum recharge amount is ₹5,00,000");
      return;
    }

    setIsProcessing(true);

    try {
      await loadRazorpayScript();
      const order = await createOrder.mutateAsync(numAmount);

      openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount * 100,
        currency: order.currency,
        order_id: order.orderId,
        name: "Box and Beyond",
        description: `Wallet Recharge - ${formatCurrency(order.amount)}`,
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          contact: user?.phone ?? "",
        },
        theme: { color: "#6757E8" },
        handler: async (response) => {
          try {
            const result = await verifyRecharge.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(`${formatCurrency(result.creditedAmount)} added to wallet`, {
              description: `New balance: ${formatCurrency(result.balance)}`,
            });
            setAmount("");
          } catch {
            toast.error("Payment verification failed. Contact support if amount was deducted.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate payment");
      setIsProcessing(false);
    }
  }, [amount, user, createOrder, verifyRecharge]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Wallet</h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your wallet balance and view transaction history
        </p>
      </div>

      {/* Balance + Recharge */}
      <div
        className={`grid grid-cols-1 ${RECHARGE_ENABLED ? "lg:grid-cols-5" : "lg:grid-cols-2"} gap-4 mb-6`}
      >
        <BalanceCard balance={walletData?.balance} isLoading={balanceLoading} />
        {RECHARGE_ENABLED && (
          <RechargeCard
            amount={amount}
            onAmountChange={setAmount}
            onRecharge={handleRecharge}
            isProcessing={isProcessing}
          />
        )}
      </div>

      {/* Stats */}
      <WalletStatCards
        balance={walletData?.balance}
        balanceLoading={balanceLoading}
        stats={txnData?.stats}
      />

      {/* Filters */}
      <div className="mb-4">
        <CollapsibleFilters
          primary={[
            {
              key: "type",
              label: "Type",
              width: "160px",
              render: (
                <Select
                  value={draft.type}
                  onChange={(val) => setFilter("type", val)}
                  placeholder="All types"
                  allowClear
                  className="w-full"
                  options={[
                    { label: "Credit", value: "credit" },
                    { label: "Debit", value: "debit" },
                  ]}
                />
              ),
            },
            {
              key: "serviceProvider",
              label: "Courier",
              width: "180px",
              render: (
                <Select
                  value={draft.serviceProvider}
                  onChange={(val) => setFilter("serviceProvider", val)}
                  placeholder="All couriers"
                  allowClear
                  className="w-full"
                  options={courierOptions}
                />
              ),
            },
            {
              key: "dateFrom",
              label: "From Date",
              width: "160px",
              render: (
                <DatePicker
                  value={draft.dateFrom ? dayjs(draft.dateFrom) : null}
                  onChange={(d) =>
                    setFilter("dateFrom", d ? d.format("YYYY-MM-DD") : undefined)
                  }
                  placeholder="Start date"
                  className="w-full"
                  format="DD MMM YYYY"
                  allowClear
                />
              ),
            },
            {
              key: "dateTo",
              label: "To Date",
              width: "160px",
              render: (
                <DatePicker
                  value={draft.dateTo ? dayjs(draft.dateTo) : null}
                  onChange={(d) =>
                    setFilter("dateTo", d ? d.format("YYYY-MM-DD") : undefined)
                  }
                  placeholder="End date"
                  className="w-full"
                  format="DD MMM YYYY"
                  allowClear
                />
              ),
            },
          ]}
          activeCount={activeCount}
          onApply={apply}
          onClearAll={clearAll}
          extra={
            pagination && (
              <span className="text-[11px] font-medium text-muted">
                {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
              </span>
            )
          }
        />
      </div>

      {/* Transaction Table */}
      <ResponsiveTable<WalletTransaction>
        columns={transactionColumns}
        dataSource={transactions}
        loading={txnLoading}
        rowKey="id"
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            setSortField(sorter.columnKey as string);
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        pagination={
          pagination
            ? {
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                onChange: (p: number) => setPage(p),
                showSizeChanger: false,
              }
            : false
        }
        locale={{ emptyText: "No transactions yet" }}
        mobileCard={(record, index) => (
          <MobileTransactionCard record={record} index={index} />
        )}
      />
    </motion.div>
  );
}
