import { Tabs } from "antd";
import ZonesTab from "./components/ZonesTab";
import PricingTab from "./components/PricingTab";

export default function B2cPricingPage() {
  return (
    <div className="space-y-4">
      <div className="bg-background-elevated border border-border-light rounded-xl px-5 py-4">
        <Tabs
          defaultActiveKey="zones"
          items={[
            {
              key: "zones",
              label: "Zones",
              children: <ZonesTab />,
            },
            {
              key: "pricing",
              label: "Pricing",
              children: <PricingTab />,
            },
          ]}
        />
      </div>
    </div>
  );
}
