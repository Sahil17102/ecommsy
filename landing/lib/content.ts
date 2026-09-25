export const articles = [
  {
    slug: "shipping-weight",
    title: "Actual vs volumetric weight: what you need to know",
    tag: "Packing smarter",
    image: "/dispatch-scale.webp",
    intro:
      "A light parcel can still take up a lot of room. Understanding both measurements helps you plan a shipment with fewer surprises.",
    sections: [
      [
        "Two measurements, one chargeable weight",
        "Actual weight is what your packed parcel weighs on a scale. Volumetric weight represents the space it occupies. A courier normally uses whichever is higher, subject to its own minimum weight and billing slabs.",
      ],
      [
        "Measure the finished parcel",
        "Measure the longest outside edges of the sealed box in centimetres. Multiply length by width by height, then divide by the courier's volumetric divisor. For example, a 30 x 20 x 20 cm box has a volumetric weight of 2.4 kg with a divisor of 5000.",
      ],
      [
        "Choose packaging that fits",
        "Use an appropriately sized box and enough protective material to keep the contents secure. Avoid oversized packaging, but never compromise protection to reduce dimensions. Check the final measurements before booking.",
      ],
    ],
  },
  {
    slug: "reduce-returns",
    title: "A practical guide to fewer delivery exceptions",
    tag: "Delivering better",
    image: "/packing-workspace.webp",
    intro:
      "An unsuccessful delivery does not have to become a return. Clear information and timely follow-up can help your next parcel arrive.",
    sections: [
      [
        "Start with a complete address",
        "Confirm the pincode, building details and recipient contact information before dispatch. A recognisable landmark can help when the courier supports it.",
      ],
      [
        "Follow the first exception",
        "Review non-delivery reports promptly. Check whether the issue is an incorrect address, an unavailable recipient or a delivery refusal, then provide the relevant instructions through your seller panel.",
      ],
      [
        "Learn from repeat patterns",
        "Review exceptions by route and courier. Use observed performance to improve courier choices and checkout information. Avoid promising delivery dates that the selected service cannot support.",
      ],
    ],
  },
  {
    slug: "first-shipment",
    title: "Your first shipment, from order to doorstep",
    tag: "Getting started",
    image: "/parcel-composition.webp",
    intro:
      "A simple checklist for preparing, booking and following your first business shipment.",
    sections: [
      [
        "Set up your business",
        "Complete your account details and verification, add your pickup address and confirm the available payment options.",
      ],
      [
        "Pack and book",
        "Protect your product, weigh the sealed parcel and enter its dimensions. Compare available couriers for the destination, confirm the order details and book the shipment.",
      ],
      [
        "Keep the journey visible",
        "Attach the correct label, hand the parcel over at pickup and keep the handover record. Share the tracking reference with your customer and monitor courier scans until delivery.",
      ],
    ],
  },
];
export const pages: Record<
  string,
  {
    tag: string;
    title: string;
    description: string;
    image?: string;
    items: [string, string][];
  }
> = {
  platform: {
    tag: "THE BOX & BEYOND PLATFORM",
    title: "Your shipping. All together.",
    description:
      "A connected workspace for the work between order placed and happily delivered.",
    image: "/parcel-composition.webp",
    items: [
      [
        "Orders in one place",
        "Create individual shipments or work through a bulk upload. Keep your order information close to your shipping decisions.",
      ],
      [
        "Courier selection",
        "Compare available services and rates for your pickup and delivery pincodes.",
      ],
      [
        "Delivery visibility",
        "Follow scan events, review exceptions and manage return-to-origin orders.",
      ],
      [
        "Business essentials",
        "Manage wallet transactions, COD remittances, billing and shipping reports from your account.",
      ],
    ],
  },
  "services/ecommerce": {
    tag: "ECOMMERCE SHIPPING",
    title: "Every order is a promise.",
    description:
      "Bring the operational side of your online business into focus, from a single parcel to your next big sale.",
    image: "/dispatch-scale.webp",
    items: [
      [
        "Prepaid and COD",
        "Choose the payment method that fits your order and check courier availability before booking.",
      ],
      [
        "Bulk dispatch",
        "Use bulk uploads to prepare multiple orders and keep your dispatch workflow organised.",
      ],
      [
        "Customer visibility",
        "Give customers a tracking reference so they can follow their delivery.",
      ],
    ],
  },
  "services/b2b": {
    tag: "B2B & BULK SHIPPING",
    title: "Bigger shipments. Clearer thinking.",
    description:
      "Manage business shipments with package-level dimensions and route-specific courier options.",
    image: "/parcel-composition.webp",
    items: [
      [
        "Multiple packages",
        "Capture weight and dimensions for each package in your shipment.",
      ],
      [
        "Rate breakdowns",
        "Review freight and applicable overheads before selecting an available service.",
      ],
      [
        "Business visibility",
        "Keep shipment details, billing and delivery history within your seller workspace.",
      ],
    ],
  },
  "services/returns": {
    tag: "RETURNS & EXCEPTIONS",
    title: "A better way back.",
    description:
      "Give delivery exceptions and returns the same attention as your outbound orders.",
    image: "/packing-workspace.webp",
    items: [
      [
        "Review NDR updates",
        "See unsuccessful delivery attempts and take the next appropriate action.",
      ],
      [
        "Manage RTO orders",
        "Follow returning shipments alongside your other operational work.",
      ],
      [
        "Learn and improve",
        "Use delivery reports to understand recurring problems and improve future dispatches.",
      ],
    ],
  },
  "integrations/sales-channels": {
    tag: "SALES CHANNELS",
    title: "Sell everywhere. Ship together.",
    description:
      "Keep your stores and shipping workflow connected. Review available integrations and setup requirements in your seller account.",
    items: [
      ["Shopify", "Bring your storefront into your order workflow."],
      [
        "WooCommerce",
        "Connect your ecommerce operations to your shipping workspace.",
      ],
      [
        "Amazon & Flipkart",
        "Manage marketplace shipping workflows and eligible orders.",
      ],
      [
        "Manual & bulk orders",
        "Create an order directly or import a spreadsheet when a direct store connection is not available.",
      ],
    ],
  },
  "integrations/courier-partners": {
    tag: "COURIER NETWORK",
    title: "More ways to get there.",
    description:
      "Choose from the courier services enabled for your account. Availability depends on the route, package and service.",
    image: "/packing-workspace.webp",
    items: [
      [
        "Delhivery",
        "Review available surface and express services for your route.",
      ],
      [
        "Blue Dart",
        "Check time-sensitive delivery options in your seller panel.",
      ],
      [
        "Xpressbees & DTDC",
        "Explore supported courier services and account rates.",
      ],
      [
        "Ekart & other providers",
        "Your account shows the latest enabled courier catalogue and route availability.",
      ],
    ],
  },
  about: {
    tag: "MEET BOX & BEYOND",
    title: "More than moving boxes.",
    description:
      "Behind every parcel is someone building something. We want to make the shipping part simpler.",
    image: "/parcel-composition.webp",
    items: [
      [
        "Built around your business",
        "From independent sellers to growing operations, shipping should be understandable and manageable.",
      ],
      [
        "Clarity comes first",
        "We bring shipping tools, order information and delivery updates into a connected workflow.",
      ],
      [
        "Forward, together",
        "We believe reliable operations leave more room for the work that makes your business yours.",
      ],
    ],
  },
  careers: {
    tag: "BUILD WHAT MOVES BUSINESS",
    title: "Good people. New possibilities.",
    description:
      "Help shape a more considered shipping experience for growing businesses.",
    items: [
      [
        "Product & engineering",
        "Build practical tools for complex logistics workflows.",
      ],
      [
        "Operations & support",
        "Help businesses navigate real shipping challenges.",
      ],
      [
        "Working with us",
        "We are not publishing specific vacancies at the moment. Contact us to ask about future opportunities.",
      ],
    ],
  },
  partners: {
    tag: "LET'S GO FURTHER",
    title: "Better, together.",
    description:
      "Courier networks, technology platforms and business partners can help create a more connected shipping experience.",
    image: "/packing-workspace.webp",
    items: [
      [
        "Courier partnerships",
        "Explore service coverage and operational collaboration.",
      ],
      [
        "Technology partnerships",
        "Connect the systems businesses use to sell and fulfil.",
      ],
      [
        "Business partnerships",
        "Talk to us about helping more businesses access organised shipping operations.",
      ],
    ],
  },
};
