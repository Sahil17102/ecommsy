import {
  Zap,
  TrendingUp,
  Shield,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  ShoppingBag,
  Truck,
  BarChart3,
  RefreshCw,
  FileText,
  Warehouse,
  Link2,
} from "lucide-react";
import { createElement } from "react";

export const rotatingWords = ["Cheaper.", "Easier.", "Better.", "Safer."];

export const activityCards = [
  {
    icon: createElement(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }),
    text: "Order #8472 delivered",
    sub: "BlueDart — Mumbai",
  },
  {
    icon: createElement(Package, { className: "w-4 h-4 text-violet-400" }),
    text: "Shipment picked up",
    sub: "Delhivery — Delhi NCR",
  },
  {
    icon: createElement(Clock, { className: "w-4 h-4 text-violet-400" }),
    text: "In transit to Bangalore",
    sub: "DTDC — Express",
  },
  {
    icon: createElement(MapPin, { className: "w-4 h-4 text-rose-400" }),
    text: "Out for delivery",
    sub: "XpressBees — Pune",
  },
];

export const stats = [
  { value: "25+", label: "Courier Partners" },
  { value: "29,000+", label: "Pincodes Nationwide" },
  { value: "1.5L+", label: "Businesses Annually" },
  { value: "220+", label: "Countries Globally" },
];

export const features = [
  {
    icon: createElement(Zap, { className: "w-6 h-6" }),
    title: "Lightning-Fast Setup",
    description:
      "Connect your store and start shipping in minutes — no technical setup needed.",
  },
  {
    icon: createElement(TrendingUp, { className: "w-6 h-6" }),
    title: "Cheapest Shipping Rates",
    description:
      "Access discounted courier rates across India with zero hidden fees.",
  },
  {
    icon: createElement(Shield, { className: "w-6 h-6" }),
    title: "Multi-Courier Network",
    description:
      "Seamlessly choose from 25+ courier partners and ship to every pincode.",
  },
];

export const journeySteps = [
  {
    icon: createElement(Link2, { className: "w-5 h-5" }),
    title: "Connect Your Store",
    description: "Link your Shopify, Amazon, or WooCommerce store in one click.",
  },
  {
    icon: createElement(Truck, { className: "w-5 h-5" }),
    title: "Add Couriers",
    description: "Choose from 25+ courier partners or use our negotiated rates.",
  },
  {
    icon: createElement(RefreshCw, { className: "w-5 h-5" }),
    title: "Sync Orders",
    description: "Orders sync automatically from all your sales channels.",
  },
  {
    icon: createElement(FileText, { className: "w-5 h-5" }),
    title: "Generate Labels",
    description: "Create shipping labels in bulk with one click, ready to go.",
  },
  {
    icon: createElement(BarChart3, { className: "w-5 h-5" }),
    title: "Ship & Track",
    description: "Ship out orders and track every package in real-time.",
  },
];

export const solutions = [
  {
    icon: createElement(RefreshCw, { className: "w-6 h-6" }),
    title: "Smart Order Routing",
    description:
      "Automatically assign the best courier based on speed, cost, and serviceability.",
  },
  {
    icon: createElement(ShoppingBag, { className: "w-6 h-6" }),
    title: "COD Management",
    description:
      "Track cash-on-delivery remittances and reconcile payments effortlessly.",
  },
  {
    icon: createElement(BarChart3, { className: "w-6 h-6" }),
    title: "Real-Time Analytics",
    description:
      "Monitor delivery performance, shipping costs, and RTO rates on a live dashboard.",
  },
  {
    icon: createElement(Shield, { className: "w-6 h-6" }),
    title: "NDR Management",
    description:
      "Reduce returns with automated non-delivery report handling and buyer re-confirmation.",
  },
  {
    icon: createElement(FileText, { className: "w-6 h-6" }),
    title: "Automated Labels",
    description:
      "Generate compliant shipping labels in bulk — no manual entry required.",
  },
  {
    icon: createElement(Warehouse, { className: "w-6 h-6" }),
    title: "Multi-Warehouse",
    description:
      "Manage inventory across multiple warehouse locations from one place.",
  },
];

export const testimonials = [
  {
    name: "Priya Sharma",
    role: "Founder, LoomCraft",
    quote:
      "Searchcraft cut our shipping costs by 30% and brought all our courier partners under one roof. The dashboard is a game changer.",
    stars: 5,
  },
  {
    name: "Rahul Mehra",
    role: "Operations Lead, UrbanBite",
    quote:
      "We went from manually managing 5 courier accounts to one dashboard. Order processing time dropped from hours to minutes.",
    stars: 5,
  },
  {
    name: "Ananya Desai",
    role: "E-commerce Manager, StyleNest",
    quote:
      "The smart routing feature alone saved us lakhs. Searchcraft picks the fastest, cheapest courier for every order automatically.",
    stars: 5,
  },
];

export const faqs = [
  {
    question: "What services does Searchcraft provide?",
    answer:
      "Searchcraft provides comprehensive courier & logistics services including B2B and B2C shipping solutions, express delivery, warehousing, distribution, cargo transportation, and reverse logistics. We offer domestic and international shipping services tailored to meet your business needs.",
  },
  {
    question: "How can I track my shipment?",
    answer:
      "You can track your shipment using our online tracking system. Simply enter your LR Number, AWB number, or Order ID in the search box on our website. You can also track multiple shipments at once and receive real-time updates on your shipment status.",
  },
  {
    question: "What areas do you cover for delivery?",
    answer:
      "We provide coverage across 29,000+ pin codes in India with regional offices and 50+ hub/SPOC offices. Our extensive network ensures reliable delivery services to both metro cities and remote locations across the country.",
  },
  {
    question: "What are your delivery timelines?",
    answer:
      "Delivery timelines vary based on the service type and destination. Express deliveries typically take 1-2 business days for metro cities, while standard deliveries take 2-5 business days. Rural and remote areas may take 3-7 business days depending on accessibility.",
  },
  {
    question: "What payment options are available?",
    answer:
      "We offer multiple payment options including Prepaid, Cash on Delivery (COD), and To Pay services. You can pay using credit/debit cards, net banking, UPI, wallets, or traditional payment methods based on your preference and service type.",
  },
  {
    question: "Is my shipment insured?",
    answer:
      "Yes, we provide insurance coverage for shipments based on the declared value. Our secure packaging and handling processes, combined with insurance options, ensure your valuable items are protected throughout the shipping process.",
  },
  {
    question: "How can I contact customer support?",
    answer:
      "Our customer support team is available 24/7 to assist you. You can reach us at +91 87500 47039, email us at cs@boxandbeyond.in, or chat with us on WhatsApp. Our office hours are 9:00 AM to 6:00 PM, Monday to Friday.",
  },
  {
    question: "What are the packaging guidelines?",
    answer:
      "Proper packaging is essential for safe delivery. Use sturdy boxes, adequate cushioning materials, and ensure items are securely packed. Fragile items should be clearly marked. We provide packaging guidelines and can assist with professional packaging services if needed.",
  },
];
