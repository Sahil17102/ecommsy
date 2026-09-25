export interface LabelSettings {
  id: string;
  userId: string;

  // Common
  showLogo: boolean;
  logoUrl?: string;
  hideCustomerMobile: boolean;
  /** Matches the server column `hide_customer_order_bar` — the API accepts this
   * key only, so it must not be spelled `hideCustomerOrderBarcode` here. */
  hideCustomerOrderBar: boolean;

  // Warehouse
  hideGstNumber: boolean;
  hidePickupAddress: boolean;
  hideRtoAddress: boolean;
  hideRtoName: boolean;
  hidePickupMobile: boolean;
  hideRtoMobile: boolean;
  hidePickupName: boolean;

  // Product details
  hideHsn: boolean;
  hideSku: boolean;
  hideQty: boolean;
  hideTotalAmount: boolean;
  hideOrderAmount: boolean;
  hideProduct: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface LabelSettingsResponse {
  settings: LabelSettings;
}
