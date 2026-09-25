export const LABEL_SETTINGS_QUERY_KEY = ["label-settings"] as const;

export interface SettingToggle {
  key: string;
  label: string;
}

export const COMMON_SETTINGS: SettingToggle[] = [
  { key: "showLogo", label: "Show Logo on Label" },
  { key: "hideCustomerMobile", label: "Hide Customer Mobile Number" },
  { key: "hideCustomerOrderBar", label: "Hide Customer Order Barcode" },
];

export const WAREHOUSE_SETTINGS: SettingToggle[] = [
  { key: "hideGstNumber", label: "Hide GST Number" },
  { key: "hidePickupAddress", label: "Hide Pickup Address" },
  { key: "hideRtoAddress", label: "Hide RTO Address" },
  { key: "hideRtoName", label: "Hide RTO Name" },
  { key: "hidePickupMobile", label: "Hide Pickup Mobile" },
  { key: "hideRtoMobile", label: "Hide RTO Mobile" },
  { key: "hidePickupName", label: "Hide Pickup Name" },
];

export const PRODUCT_SETTINGS: SettingToggle[] = [
  { key: "hideHsn", label: "Hide HSN" },
  { key: "hideSku", label: "Hide SKU" },
  { key: "hideQty", label: "Hide Qty" },
  { key: "hideTotalAmount", label: "Hide Total Amount" },
  { key: "hideOrderAmount", label: "Hide Order Amount" },
  { key: "hideProduct", label: "Hide Product" },
];
