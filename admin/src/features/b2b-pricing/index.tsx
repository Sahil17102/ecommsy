import { Tabs } from "antd";
import ZonesTab from "./components/ZonesTab";
import PincodesTab from "./components/PincodesTab";
import ZoneRatesTab from "./components/ZoneRatesTab";
import AdditionalChargesTab from "./components/AdditionalChargesTab";
import RateCalculatorTab from "./components/RateCalculatorTab";

export default function B2bPricingPage() {
  return (
    <div className="space-y-4">
      <div className="bg-background-elevated border border-border-light rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        <h1 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">B2B Pricing Management</h1>
        <Tabs
          defaultActiveKey="zones"
          size="small"
          tabBarGutter={12}
          items={[
            { key: "zones", label: "Zones", children: <ZonesTab /> },
            { key: "pincodes", label: "Pincodes", children: <PincodesTab /> },
            { key: "rates", label: "Rate Matrix", children: <ZoneRatesTab /> },
            { key: "charges", label: "Additional Charges", children: <AdditionalChargesTab /> },
            { key: "calculator", label: "Quote Calculator", children: <RateCalculatorTab /> },
          ]}
        />
      </div>
    </div>
  );
}
