import {
  Bell,
  Building2,
  KeyRound,
  ShieldCheck,
  Landmark,
  Users,
  MapPin,
  CreditCard,
  Tag,
  Webhook,
  // Link2,
  // ListOrdered,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SettingsItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

export const settingsSections: SettingsSection[] = [
  {
    title: "Profile Management",
    items: [
      {
        title: "Company Profile",
        description: "Create your profile for personalized shipping",
        icon: Building2,
        href: "/settings/company-profile",
      },
      {
        title: "Change Password",
        description: "Stay secure, update password",
        icon: KeyRound,
        href: "/settings/change-password",
      },
      {
        title: "KYC Details",
        description: "Your KYC information kept safe for your reference",
        icon: ShieldCheck,
        href: "/settings/kyc",
      },
      {
        title: "Bank Details",
        description: "Check your bank account information here",
        icon: Landmark,
        href: "/settings/bank-details",
      },
      {
        title: "User Management",
        description: "Add users or teams and grant them access with ease",
        icon: Users,
        href: "/settings/user-management",
      },
      {
        title: "Notifications",
        description: "Choose how and when you receive alerts",
        icon: Bell,
        href: "/settings/notifications",
      },
    ],
  },
  {
    title: "Shipment Settings",
    items: [
      {
        title: "Manage Pickup Addresses",
        description: "Add multiple pickup locations and manage them easily",
        icon: MapPin,
        href: "/settings/pickup-addresses",
      },
      // {
      //   title: "Invoice Preferences",
      //   description: "Set printer type, logo, signature & more",
      //   icon: FileText,
      //   href: "/settings/invoice-preferences",
      // },
      {
        title: "Billing Preferences",
        description: "Set invoice frequency and automation settings",
        icon: CreditCard,
        href: "/settings/billing-preferences",
      },
      {
        title: "Label Configuration",
        description: "Configure your label fields with a live preview",
        icon: Tag,
        href: "/settings/label-configuration",
      },
    ],
  },
  {
    title: "Developers",
    items: [
      {
        title: "Webhooks",
        description: "Push live shipment updates to your own system",
        icon: Webhook,
        href: "/settings/webhooks",
      },
    ],
  },
  // {
  //   title: "Setup & Manage",
  //   items: [
  //     {
  //       title: "Manage Channels",
  //       description: "Enable, disable or edit existing channels",
  //       icon: Link2,
  //       href: "/settings/manage-channels",
  //     },
  //     {
  //       title: "Courier Priority",
  //       description: "Prioritise speed, cost, performance or custom needs",
  //       icon: ListOrdered,
  //       href: "/settings/courier-priority",
  //     },
  //   ],
  // },
];
