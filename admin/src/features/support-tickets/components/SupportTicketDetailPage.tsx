import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Shield,
  User as UserIcon,
  Paperclip,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Select, Tag } from "antd";
import { toast } from "sonner";
import { useTicket, useReplyTicket, useUpdateTicket } from "../queries";
import { supportTicketsApi } from "../api";
import { getCannedReplyGroups } from "../cannedReplies";
import type { TicketStatus, TicketPriority } from "../types";
import { MessageAttachment } from "@/components/common/MessageAttachment";
import { PendingFileChip } from "@/components/common/PendingFileChip";

const STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id);
  const reply = useReplyTicket(id!);
  const update = useUpdateTicket(id!);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const cannedGroups = useMemo(
    () => (ticket ? getCannedReplyGroups(ticket.category) : []),
    [ticket?.category],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  if (isLoading || !ticket) {
    return (
      <div className="p-6">
        <div className="text-xs text-muted">Loading…</div>
      </div>
    );
  }

  const seller = typeof ticket.userId === "object" ? ticket.userId : null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: File[] = [];
    for (const f of Array.from(files)) {
      if (!ALLOWED_MIMES.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: exceeds 5 MB limit`);
        continue;
      }
      next.push(f);
    }
    setPending((prev) => [...prev, ...next].slice(0, 5));
  };

  const handleSend = async () => {
    if (!message.trim() && pending.length === 0) return;
    try {
      await reply.mutateAsync({
        message: message.trim(),
        attachments: pending.length > 0 ? pending : undefined,
      });
      setMessage("");
      setPending([]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const insertCanned = (body: string) => {
    setMessage((prev) => (prev.trim() ? `${prev.trim()}\n\n${body}` : body));
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col h-[calc(100vh-4rem)]">
      <Link
        to="/support-tickets"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground mb-3 no-underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All tickets
      </Link>

      {/* Ticket header */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-4 mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted">
              <span>{ticket.ticketNumber}</span>
              <span>·</span>
              <span className="capitalize">{ticket.category}</span>
              {ticket.relatedOrderId && (
                <>
                  <span>·</span>
                  <span>Order: {ticket.relatedOrderId}</span>
                </>
              )}
            </div>
            {seller && (
              <div className="mt-2 text-xs">
                <span className="text-muted">Seller: </span>
                <span className="text-foreground font-medium">
                  {seller.businessName ?? seller.name ?? "—"}
                </span>
                {seller.email && (
                  <span className="text-muted ml-2">· {seller.email}</span>
                )}
                {seller.contactNumber && (
                  <span className="text-muted ml-2">· {seller.contactNumber}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              size="small"
              value={ticket.status}
              onChange={(v) => update.mutate({ status: v })}
              style={{ width: 120 }}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              size="small"
              value={ticket.priority}
              onChange={(v) => update.mutate({ priority: v })}
              style={{ width: 120 }}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Tag className="uppercase text-[10px]">{ticket.status}</Tag>
          <Tag className="uppercase text-[10px]">{ticket.priority}</Tag>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background-elevated border border-border-light rounded-xl p-4 space-y-4 mb-3">
        {ticket.relatedOrderId && (
          <div className="flex justify-center">
            <Link
              to={`/orders?search=${encodeURIComponent(ticket.relatedOrderId)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.06] border border-primary/20 text-[11px] no-underline hover:bg-primary/10 transition-colors"
            >
              <ShoppingBag className="w-3 h-3 text-primary" />
              <span className="text-muted">Enquiry raised for order</span>
              <span className="font-semibold text-primary">{ticket.relatedOrderId}</span>
            </Link>
          </div>
        )}
        {(ticket.messages ?? []).map((m) => {
          const mine = m.fromRole === "admin";
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  mine ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                }`}
              >
                {mine ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {m.body && (
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm ${
                      mine
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-background text-foreground border border-border-light rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                )}
                {(m.attachments ?? []).length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 ${m.body ? "mt-1.5" : ""} ${mine ? "justify-end" : ""}`}>
                    {(m.attachments ?? []).map((a) => (
                      <MessageAttachment
                        key={a.id}
                        path={supportTicketsApi.attachmentPath(ticket.id, a.id)}
                        name={a.name}
                        contentType={a.contentType}
                        size={a.size}
                      />
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted mt-1 px-1">
                  {mine ? "You (admin)" : "Seller"} · {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div>
        {pending.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
            {pending.map((f, i) => (
              <PendingFileChip
                key={`${f.name}-${i}`}
                file={f}
                onRemove={() =>
                  setPending((prev) => prev.filter((_, idx) => idx !== i))
                }
              />
            ))}
          </div>
        )}
        <div className="relative flex items-end gap-1.5 bg-background-elevated border border-border-light rounded-2xl p-1.5 focus-within:border-primary/40 transition-colors">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending.length >= 5}
            title="Attach photo or file"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIMES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Reply to seller…"
            className="flex-1 min-w-0 px-2 py-2 text-sm bg-transparent text-foreground outline-none placeholder:text-muted resize-none max-h-32"
          />

          {/* Suggestions popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSuggestionsOpen((p) => !p)}
              title="Suggested replies"
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                suggestionsOpen
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-background"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {suggestionsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setSuggestionsOpen(false)}
                />
                <div className="absolute z-40 right-0 bottom-full mb-2 w-[340px] max-h-[320px] overflow-y-auto bg-background-elevated border border-border-light rounded-xl shadow-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Suggested replies
                    </span>
                    <span className="text-[10px] text-muted">
                      for "{ticket.category}"
                    </span>
                  </div>
                  {cannedGroups.map((group) => (
                    <div key={group.label}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              insertCanned(item.body);
                              setSuggestionsOpen(false);
                            }}
                            title={item.body}
                            className="px-2.5 py-1 rounded-full text-[11px] border border-border-light bg-background text-foreground hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={(!message.trim() && pending.length === 0) || reply.isPending}
            title="Send (⌘/Ctrl + Enter)"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted mt-1.5 px-2">
          ⌘/Ctrl + Enter to send · Up to 5 files, 5 MB each
        </p>
      </div>
    </div>
  );
}
