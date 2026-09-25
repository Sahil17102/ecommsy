import type { TicketCategory } from "./types";

export interface CannedReply {
  label: string;
  body: string;
}

export interface CannedReplyGroup {
  label: string;
  items: CannedReply[];
}

const OPENINGS: CannedReply[] = [
  {
    label: "Greeting",
    body: "Hi there, thank you for reaching out to Box and Beyond support. We've received your ticket and are looking into it.",
  },
  {
    label: "Need more info",
    body: "Thanks for getting in touch. Could you share a bit more detail — any screenshots, order IDs or exact error messages — so we can diagnose this faster?",
  },
  {
    label: "Investigating",
    body: "Thanks for flagging this. I'm looking into it with the team and will have an update for you shortly.",
  },
];

const CATEGORY_SPECIFIC: Record<TicketCategory, CannedReply[]> = {
  order: [
    {
      label: "Tracking update",
      body: "We've checked the latest tracking scan with the courier — the shipment is moving as expected. The next update should appear within the next scan cycle.",
    },
    {
      label: "NDR follow-up",
      body: "The courier marked this as an NDR. I've re-pushed for delivery; please keep the buyer's phone reachable for the next attempt.",
    },
    {
      label: "RTO reason",
      body: "The courier has initiated RTO on this shipment. I've pulled up the reason from their remarks and will share it below.",
    },
  ],
  payment: [
    {
      label: "Payment received",
      body: "Your payment has been received and reconciled against your account. You should see the updated balance reflect shortly.",
    },
    {
      label: "Refund status",
      body: "The refund has been initiated from our side. Depending on your bank, it typically settles within 5–7 business days.",
    },
  ],
  wallet: [
    {
      label: "Recharge delay",
      body: "I can see the payment attempt on our end. Gateway settlement is sometimes delayed — if it isn't credited within 30 minutes, please share the UTR and I'll expedite.",
    },
    {
      label: "Wallet credited",
      body: "Your wallet has been credited. Please refresh the dashboard to see the updated balance.",
    },
  ],
  kyc: [
    {
      label: "Document re-upload",
      body: "One of your KYC documents needs a re-upload — please ensure the image is clear, legible, and unedited. You can re-submit from Settings → KYC Details.",
    },
    {
      label: "KYC approved",
      body: "Good news — your KYC has been approved. All shipping features are now unlocked on your account.",
    },
  ],
  technical: [
    {
      label: "Bug acknowledged",
      body: "Thanks for reporting this — I've reproduced the issue locally and raised it with our engineering team. I'll update here once a fix is deployed.",
    },
    {
      label: "Clear cache",
      body: "Could you try a hard refresh (Cmd/Ctrl + Shift + R) and retry? Some older cached assets occasionally cause this behaviour.",
    },
  ],
  general: [
    {
      label: "Appreciate feedback",
      body: "Thanks for sharing this with us — your feedback genuinely helps us prioritise what to build next.",
    },
  ],
};

const CLOSINGS: CannedReply[] = [
  {
    label: "Anything else?",
    body: "Please let me know if there's anything else I can help with — happy to assist further.",
  },
  {
    label: "Resolving ticket",
    body: "Since the original issue looks resolved, I'm going to mark this ticket as resolved. Feel free to reopen it if anything else comes up.",
  },
  {
    label: "Thanks & sign-off",
    body: "Thanks for your patience on this. Have a great day ahead!",
  },
];

export function getCannedReplyGroups(category: TicketCategory): CannedReplyGroup[] {
  const groups: CannedReplyGroup[] = [
    { label: "Opening lines", items: OPENINGS },
  ];
  const cat = CATEGORY_SPECIFIC[category];
  if (cat && cat.length > 0) {
    groups.push({ label: `For "${category}" tickets`, items: cat });
  }
  groups.push({ label: "Closing lines", items: CLOSINGS });
  return groups;
}
