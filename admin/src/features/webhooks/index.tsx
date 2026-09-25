import { useState } from "react";
import { Segmented, Select } from "antd";
import { Webhook } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useWebhookHealth } from "./queries";
import { WINDOW_OPTIONS } from "./config";
import { HealthPanel } from "./components/HealthPanel";
import DeliveriesTab from "./components/DeliveriesTab";
import EndpointsTab from "./components/EndpointsTab";
import DeliveryDetailDrawer from "./components/DeliveryDetailDrawer";

type Tab = "deliveries" | "endpoints";

/**
 * Outbound webhook operations.
 *
 * Ordered the way an incident is actually worked: health first (is anything
 * broken and for whom), then the delivery log (what exactly did we send and
 * what came back), then the endpoint registry (who has what registered).
 */
export default function WebhooksPage() {
  const [tab, setTab] = useState<Tab>("deliveries");
  const [windowHours, setWindowHours] = useState(24);
  const [endpointFilter, setEndpointFilter] = useState<string | undefined>();
  const [openDeliveryId, setOpenDeliveryId] = useState<string | null>(null);

  const { data: health } = useWebhookHealth(windowHours);

  /** Health panel and endpoints table both drill into one endpoint's log. */
  function inspectEndpoint(webhookId: string) {
    setEndpointFilter(webhookId);
    setTab("deliveries");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Webhook}
        title="Webhook Deliveries"
        subtitle="Every event we push to sellers, with the exact response their server gave"
        // No stats here on purpose — the health cards immediately below carry
        // these numbers, and repeating them just doubles the reading.
        titleExtra={
          <Select
            size="small"
            value={windowHours}
            onChange={setWindowHours}
            options={WINDOW_OPTIONS}
            className="min-w-[140px]"
          />
        }
      />

      <HealthPanel health={health} onInspectEndpoint={inspectEndpoint} />

      <Segmented
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        options={[
          { value: "deliveries", label: "Delivery log" },
          { value: "endpoints", label: "Registered endpoints" },
        ]}
      />

      {tab === "deliveries" ? (
        <DeliveriesTab
          webhookId={endpointFilter}
          onClearEndpointFilter={() => setEndpointFilter(undefined)}
          onOpenDelivery={setOpenDeliveryId}
        />
      ) : (
        <EndpointsTab windowHours={windowHours} onInspectEndpoint={inspectEndpoint} />
      )}

      <DeliveryDetailDrawer
        deliveryId={openDeliveryId}
        onClose={() => setOpenDeliveryId(null)}
      />
    </div>
  );
}
