import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Segmented } from "antd";
import type { ColumnsType } from "antd/es/table";
import { MessageCircle } from "lucide-react";
import { useTickets } from "./queries";
import type { SupportTicket, TicketStatus, TicketPriority } from "./types";

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "green",
  pending: "purple",
  resolved: "blue",
  closed: "default",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "default",
  medium: "blue",
  high: "purple",
  urgent: "red",
};

export default function SupportTicketsPage() {
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const { data: tickets = [], isLoading } = useTickets(status === "all" ? undefined : status);
  const navigate = useNavigate();

  const columns: ColumnsType<SupportTicket> = [
    {
      title: "Ticket",
      dataIndex: "ticketNumber",
      key: "ticketNumber",
      render: (_v, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">{row.ticketNumber}</span>
          <span className="text-[11px] text-muted truncate max-w-[280px]">{row.subject}</span>
        </div>
      ),
    },
    {
      title: "Seller",
      key: "seller",
      render: (_v, row) => {
        const u = typeof row.userId === "object" ? row.userId : null;
        return (
          <div className="flex flex-col">
            <span className="text-xs text-foreground">{u?.businessName ?? u?.name ?? "—"}</span>
            <span className="text-[10px] text-muted">{u?.email ?? ""}</span>
          </div>
        );
      },
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (v: string) => <span className="text-xs capitalize">{v}</span>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (v: TicketPriority) => (
        <Tag color={PRIORITY_COLORS[v]} className="uppercase text-[10px]">
          {v}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: TicketStatus) => (
        <Tag color={STATUS_COLORS[v]} className="uppercase text-[10px]">
          {v}
        </Tag>
      ),
    },
    {
      title: "Last activity",
      dataIndex: "lastMessageAt",
      key: "lastMessageAt",
      render: (v: string, row) => (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{new Date(v).toLocaleString()}</span>
          {row.unreadByAdmin > 0 && (
            <span className="text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {row.unreadByAdmin}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Support tickets
          </h1>
          <p className="text-xs text-muted mt-0.5">Conversations from sellers needing help.</p>
        </div>
        <Segmented
          value={status}
          onChange={(v) => setStatus(v as TicketStatus | "all")}
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "Pending", value: "pending" },
            { label: "Resolved", value: "resolved" },
            { label: "Closed", value: "closed" },
          ]}
        />
      </div>

      <Table<SupportTicket>
        rowKey="id"
        dataSource={tickets}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        onRow={(row) => ({
          onClick: () => navigate(`/support-tickets/${row.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}
