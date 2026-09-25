export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "order" | "payment" | "kyc" | "wallet" | "technical" | "general";

export interface TicketAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface TicketMessage {
  id: string;
  fromRole: "seller" | "admin";
  fromUserId: string;
  body: string;
  attachments?: TicketAttachment[];
  createdAt: string;
}

export interface TicketSeller {
  id: string;
  name?: string;
  email?: string;
  businessName?: string;
  contactNumber?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string | TicketSeller;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedOrderId?: string;
  messages?: TicketMessage[];
  lastMessageAt: string;
  unreadBySeller: number;
  unreadByAdmin: number;
  createdAt: string;
}
