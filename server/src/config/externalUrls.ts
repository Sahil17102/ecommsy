/**
 * All external / third-party URLs used across the server.
 * Grouped by service provider — each section defines a `baseUrl`
 * and endpoints are built from it so we never duplicate the origin.
 * Every value falls back to an env-var override per environment.
 */

const delhiveryBase =
  process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com";

const xpressbeesBase =
  process.env.XPRESSBEES_API_URL || "https://ship.xpressbees.com";

const ekartBase =
  process.env.EKART_API_URL || "https://app.elite.ekartlogistics.in";

const shipexBase =
  process.env.SHIPEX_BASE_URL || "https://api.shipexindia.com";
const dreamzBase =
  process.env.DREAMZ_BASE_URL || "https://dreamzservices.in/api";

// Delhivery B2B (LTL — Less-than-Truckload) — separate base URL from B2C.
// Prod: https://ltl-clients-api.delhivery.com
// Dev:  https://ltl-clients-api-dev.delhivery.com
const delhiveryB2bBase =
  process.env.DELHIVERY_B2B_BASE_URL || "https://ltl-clients-api.delhivery.com";

// DTDC PX (B2C / Express) — three distinct hosts:
//   - pxapi.dtdc.in            → booking, label, cancel (api-key auth)
//   - blktracksvc.dtdc.com     → tracking auth + tracking pull (x-access-token)
//   - smarttrack.ctbsplus.dtdc.com → public pincode-pair serviceability (no auth)
const dtdcBookingBase =
  process.env.DTDC_BOOKING_BASE_URL || "https://pxapi.dtdc.in";
const dtdcTrackingBase =
  process.env.DTDC_TRACKING_BASE_URL || "https://blktracksvc.dtdc.com";
const dtdcPincodeBase =
  process.env.DTDC_PINCODE_BASE_URL || "http://smarttrack.ctbsplus.dtdc.com";

export const externalUrls = {
  google: {
    /** Google OAuth2 user info endpoint */
    userInfo:
      process.env.GOOGLE_USERINFO_URL ||
      "https://www.googleapis.com/oauth2/v2/userinfo",
  },

  pincode: {
    /** Primary pincode CSV dataset (dropdev) */
    csvPrimary:
      process.env.PINCODE_CSV_PRIMARY_URL ||
      "https://raw.githubusercontent.com/dropdevrahul/pincodes-india/main/pincode.csv",

    /** Secondary/fallback pincode CSV dataset (kishorek) */
    csvFallback:
      process.env.PINCODE_CSV_SECONDARY_URL ||
      "https://raw.githubusercontent.com/kishorek/India-Codes/master/csv/pincodes.csv",

    /** Postal pincode lookup API */
    lookupApi:
      process.env.PINCODE_API_URL || "https://api.postalpincode.in",
  },

  delhivery: {
    baseUrl: delhiveryBase,

    /** Pincode serviceability endpoint */
    serviceability:
      process.env.DELHIVERY_PINCODE_URL ||
      `${delhiveryBase}/c/api/pin-codes/json/`,

    /** Heavy/surface serviceability endpoint */
    heavyServiceability:
      process.env.DELHIVERY_HEAVY_SERVICEABILITY_URL ||
      `${delhiveryBase}/api/dc/fetch/serviceability/pincode`,

    expectedTat: process.env.DELHIVERY_TAT_URL || `${delhiveryBase}/api/dc/expected_tat`,
    bulkWaybill: process.env.DELHIVERY_BULK_WAYBILL_URL || `${delhiveryBase}/waybill/api/bulk/json/`,
    singleWaybill: process.env.DELHIVERY_SINGLE_WAYBILL_URL || `${delhiveryBase}/waybill/api/fetch/json/`,
    rates: process.env.DELHIVERY_RATE_URL || `${delhiveryBase}/api/kinko/v1/invoice/charges/.json`,
    label: process.env.DELHIVERY_LABEL_URL || `${delhiveryBase}/api/p/packing_slip`,
    ewaybill: process.env.DELHIVERY_EWAYBILL_URL || `${delhiveryBase}/api/rest/ewaybill`,
    document: process.env.DELHIVERY_DOCUMENT_URL || `${delhiveryBase}/api/rest/fetch/pkg/document/`,
    ndrStatus: process.env.DELHIVERY_NDR_STATUS_URL || `${delhiveryBase}/api/cmu/get_bulk_upl`,

    /** Create order / shipment endpoint */
    createOrder:
      process.env.DELHIVERY_CREATE_ORDER_URL ||
      `${delhiveryBase}/api/cmu/create.json`,

    /** Create client warehouse / pickup location endpoint */
    createWarehouse:
      process.env.DELHIVERY_CREATE_WAREHOUSE_URL ||
      `${delhiveryBase}/api/backend/clientwarehouse/create/`,

    /** List client warehouses / pickup locations endpoint */
    listWarehouses:
      process.env.DELHIVERY_LIST_WAREHOUSES_URL ||
      `${delhiveryBase}/api/backend/clientwarehouse/`,

    editWarehouse:
      process.env.DELHIVERY_EDIT_WAREHOUSE_URL ||
      `${delhiveryBase}/api/backend/clientwarehouse/edit/`,

    /** Tracking API (GET ?waybill=xxx) */
    tracking:
      process.env.DELHIVERY_TRACKING_URL ||
      `${delhiveryBase}/api/v1/packages/json/`,

    /** Cancel / Edit shipment endpoint (POST) */
    editOrder:
      process.env.DELHIVERY_EDIT_ORDER_URL ||
      `${delhiveryBase}/api/p/edit`,

    /** Pickup request endpoint */
    pickupRequest:
      process.env.DELHIVERY_PICKUP_URL ||
      `${delhiveryBase}/fm/request/new/`,

    /** NDR action endpoint (async) */
    ndrAction:
      process.env.DELHIVERY_NDR_URL ||
      `${delhiveryBase}/api/p/update`,
  },

  xpressbees: {
    baseUrl: xpressbeesBase,

    /** Franchise login endpoint (returns JWT token) */
    franchiseLogin:
      process.env.XPRESSBEES_FRANCHISE_LOGIN_URL ||
      `${xpressbeesBase}/api/users/franchise_login`,

    /** List franchise couriers */
    couriers:
      process.env.XPRESSBEES_COURIERS_URL ||
      `${xpressbeesBase}/api/franchise/shipments/courier`,

    /** Rate calculator (used for serviceability check) */
    calculatePricing:
      process.env.XPRESSBEES_CALCULATE_PRICING_URL ||
      `${xpressbeesBase}/api/franchise/shipments/calculate_pricing`,

    /** Create shipment order endpoint */
    createOrder:
      process.env.XPRESSBEES_CREATE_ORDER_URL ||
      `${xpressbeesBase}/api/franchise/shipments/`,

    /** B2B create shipment endpoint (Franchise B2B custom API) */
    createB2bOrder:
      process.env.XPRESSBEES_B2B_CREATE_ORDER_URL ||
      `${xpressbeesBase}/api/b2b/shipments`,

    /** B2B cancel shipment endpoint */
    cancelB2bOrder:
      process.env.XPRESSBEES_B2B_CANCEL_URL ||
      `${xpressbeesBase}/api/b2b/shipments/cancel_shipment`,

    /** Track shipment endpoint */
    tracking:
      process.env.XPRESSBEES_TRACKING_URL ||
      `${xpressbeesBase}/api/franchise/shipments/track_shipment`,

    /** Cancel shipment endpoint */
    cancel:
      process.env.XPRESSBEES_CANCEL_URL ||
      `${xpressbeesBase}/api/franchise/shipments/cancel_shipment`,
    /** Pickup request endpoint */
    pickupRequest:
      process.env.XPRESSBEES_PICKUP_URL ||
      `${xpressbeesBase}/api/franchise/shipments/pickup`,

    /** NDR action endpoint */
    ndrCreate:
      process.env.XPRESSBEES_NDR_CREATE_URL ||
      `${xpressbeesBase}/api/franchise/ndr/create`,
  },

  ekart: {
    baseUrl: ekartBase,

    /** Auth token endpoint */
    authUrl:
      process.env.EKART_AUTH_URL ||
      `${ekartBase}/integrations/v2/auth/token`,

    /** Serviceability endpoint (elite) */
    serviceability:
      process.env.EKART_SERVICEABILITY_URL ||
      `${ekartBase}/api/v2/serviceability`,

    /** Create order endpoint */
    createOrder:
      process.env.EKART_CREATE_ORDER_URL ||
      `${ekartBase}/api/v1/package/create`,

    /** Create pickup address endpoint */
    createPickupAddress:
      process.env.EKART_CREATE_PICKUP_URL ||
      `${ekartBase}/api/v2/address`,

    /** List all pickup addresses endpoint */
    listPickupAddresses:
      process.env.EKART_LIST_PICKUPS_URL ||
      `${ekartBase}/api/v2/addresses`,

    /** Track order endpoint (GET /api/v1/track/{id}) */
    tracking:
      process.env.EKART_TRACKING_URL ||
      `${ekartBase}/api/v1/track`,

    /** NDR action endpoint (POST) */
    ndrAction:
      process.env.EKART_NDR_URL ||
      `${ekartBase}/api/v2/package/ndr`,

    /** Cancel order endpoint (DELETE /api/v1/package/cancel) */
    cancelOrder:
      process.env.EKART_CANCEL_URL ||
      `${ekartBase}/api/v1/package/cancel`,

    // Apptmyz B2B API endpoints (separate base URL)
    /** Apptmyz base URL (B2B API for tracking, cancel, etc.) */
    apptmyzBaseUrl:
      process.env.EKART_APPTMYZ_BASE_URL ||
      "https://ekart.apptmyz.com/flipkart",

    /** Apptmyz login endpoint */
    apptmyzLogin: `${process.env.EKART_APPTMYZ_BASE_URL || "https://ekart.apptmyz.com/flipkart"}/api/customer/login`,

    /** Apptmyz track order endpoint */
    apptmyzTrack: `${process.env.EKART_APPTMYZ_BASE_URL || "https://ekart.apptmyz.com/flipkart"}/api/customer/order/track`,

    /** Apptmyz cancel order endpoint */
    apptmyzCancel: `${process.env.EKART_APPTMYZ_BASE_URL || "https://ekart.apptmyz.com/flipkart"}/api/customer/order/cancel`,

    /** Apptmyz cancel reasons master */
    apptmyzCancelReasons: `${process.env.EKART_APPTMYZ_BASE_URL || "https://ekart.apptmyz.com/flipkart"}/api/customer/cancelreasons`,

    /** Apptmyz create pickup request */
    apptmyzCreatePickup: `${process.env.EKART_APPTMYZ_BASE_URL || "https://ekart.apptmyz.com/flipkart"}/api/customer/create/prqs`,
  },

  delhiveryB2b: {
    baseUrl: delhiveryB2bBase,

    /** Login → returns Bearer token (24h expiry) */
    login:
      process.env.DELHIVERY_B2B_LOGIN_URL ||
      `${delhiveryB2bBase}/ums/login`,

    /** Logout → invalidates current token */
    logout:
      process.env.DELHIVERY_B2B_LOGOUT_URL ||
      `${delhiveryB2bBase}/ums/logout`,

    /** Pincode serviceability → GET /pincode-service/{pincode}?weight={kg} */
    pincodeServiceability:
      process.env.DELHIVERY_B2B_PINCODE_URL ||
      `${delhiveryB2bBase}/pincode-service`,

    /** TAT estimator → GET /tat/estimate?origin_pin=&destination_pin= */
    tatEstimate:
      process.env.DELHIVERY_B2B_TAT_URL ||
      `${delhiveryB2bBase}/tat/estimate`,

    /** Manifest (shipment creation) → POST multipart/form-data */
    manifest:
      process.env.DELHIVERY_B2B_MANIFEST_URL ||
      `${delhiveryB2bBase}/manifest`,

    /** LR tracking → GET /lrn/track?lrnum={lrn} */
    lrTrack:
      process.env.DELHIVERY_B2B_TRACK_URL ||
      `${delhiveryB2bBase}/lrn/track`,

    /** Pickup request create → POST /pickup_requests */
    pickupRequest:
      process.env.DELHIVERY_B2B_PICKUP_URL ||
      `${delhiveryB2bBase}/pickup_requests`,

    /** Last-mile delivery appointment → POST /v2/appointments/lm */
    appointment:
      process.env.DELHIVERY_B2B_APPOINTMENT_URL ||
      `${delhiveryB2bBase}/v2/appointments/lm`,
  },

  shipex: {
    baseUrl: shipexBase,

    /** Generate token endpoint */
    generateToken:
      process.env.SHIPEX_TOKEN_URL ||
      `${shipexBase}/v1/api/external/generateToken`,

    /** Pincode serviceability endpoint */
    serviceability:
      process.env.SHIPEX_SERVICEABILITY_URL ||
      `${shipexBase}/v1/api/external/pincodeServiceability`,

    /** Rate calculation endpoint */
    rateCalculate:
      process.env.SHIPEX_RATE_URL ||
      `${shipexBase}/v1/api/external/serviceableCourierServices/rate`,

    /** Create order endpoint */
    createOrder:
      process.env.SHIPEX_CREATE_ORDER_URL ||
      `${shipexBase}/v1/api/external/createOrder`,

    /** Track order endpoint */
    trackOrder:
      process.env.SHIPEX_TRACK_URL ||
      `${shipexBase}/v1/api/external/trackOrder`,

    /** Cancel order endpoint (POST with /{awb_number}) */
    cancelOrder:
      process.env.SHIPEX_CANCEL_URL ||
      `${shipexBase}/v1/api/external/cancelledOrder`,

    /** Register a pickup address / warehouse on ShipEx */
    createPickupAddress:
      process.env.SHIPEX_CREATE_PICKUP_URL ||
      `${shipexBase}/v1/api/external/createPickupAddress`,

    /** Book order with selected courier (step 2 after createOrder) */
    orderBooking:
      process.env.SHIPEX_ORDER_BOOKING_URL ||
      `${shipexBase}/v1/api/external/orderBooking`,

    /** NDR action endpoint (reattempt/RTO) */
    ndrAction:
      process.env.SHIPEX_NDR_ACTION_URL ||
      `${shipexBase}/v1/api/external/ndr/create`,

  },

  dreamz: {
    baseUrl: dreamzBase,
    login: process.env.DREAMZ_LOGIN_URL || `${dreamzBase}/auth/login`,
    couriers: process.env.DREAMZ_COURIERS_URL || `${dreamzBase}/couriers`,
    pickupAddresses:
      process.env.DREAMZ_PICKUP_ADDRESSES_URL ||
      `${dreamzBase}/pickup-addresses`,
    ratesAvailable: process.env.DREAMZ_RATES_URL || `${dreamzBase}/rates/available`,
    orders: process.env.DREAMZ_ORDERS_URL || `${dreamzBase}/orders`,
    cancelOrder:
      process.env.DREAMZ_CANCEL_ORDER_URL ||
      `${dreamzBase}/orders`,
    publicTrack: process.env.DREAMZ_PUBLIC_TRACK_URL || `${dreamzBase}/track`,
  },

  dtdc: {
    bookingBaseUrl: dtdcBookingBase,
    trackingBaseUrl: dtdcTrackingBase,
    pincodeBaseUrl: dtdcPincodeBase,

    /** Pincode-pair serviceability — POST { orgPincode, desPincode }. No auth. */
    pincodeServiceability:
      process.env.DTDC_PINCODE_URL ||
      `${dtdcPincodeBase}/ratecalapi/PincodeApiCall`,

    /** Order upload / booking (single + MPS) — POST with `api-key` header. */
    createOrder:
      process.env.DTDC_CREATE_ORDER_URL ||
      `${dtdcBookingBase}/api/customer/integration/consignment/softdata`,

    /** Shipping label stream — GET ?reference_number=&label_code=&label_format= */
    shippingLabel:
      process.env.DTDC_LABEL_URL ||
      `${dtdcBookingBase}/api/customer/integration/consignment/shippinglabel/stream`,

    /** Cancellation — POST { AWBNo: [...], customerCode } with `api-key` header. */
    cancel:
      process.env.DTDC_CANCEL_URL ||
      `${dtdcBookingBase}/api/customer/integration/consignment/cancel`,

    /** Tracking token issuer — GET ?username=&password=. Returns x-access-token. */
    trackingAuth:
      process.env.DTDC_TRACKING_AUTH_URL ||
      `${dtdcTrackingBase}/dtdc-api/api/dtdc/authenticate`,

    /** Tracking pull — POST { trkType, strcnno, addtnlDtl } with x-access-token. */
    tracking:
      process.env.DTDC_TRACKING_URL ||
      `${dtdcTrackingBase}/dtdc-api/rest/JSONCnTrk/getTrackDetails`,
  },
} as const;
