import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send, Shield, User, Paperclip, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSupportTicket, useReplyTicket, SUPPORT_KEY } from "@/queries/useSupport";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { formatKeyword } from "@/lib/utils";
import { MessageAttachment } from "@/components/common/MessageAttachment";
import { PendingFileChip } from "@/components/common/PendingFileChip";
import { supportApi } from "@/lib/supportApi";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export function SupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: ticket, isLoading } = useSupportTicket(id);
  const reply = useReplyTicket(id!);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  useEffect(() => {
    if (!user || !id) return;
    let socket;
    try {
      socket = connectSocket();
    } catch {
      return;
    }
    const onUpdate = (payload: { id: string }) => {
      if (payload.id === id) {
        qc.invalidateQueries({ queryKey: SUPPORT_KEY });
      }
    };
    socket.on("support:ticket_updated", onUpdate);
    return () => {
      socket?.off("support:ticket_updated", onUpdate);
    };
  }, [user, id, qc]);

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

  if (isLoading || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-xs text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="mb-4">
        <Link
          to="/support"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground mb-3 no-underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All tickets
        </Link>
        <div className="bg-background-elevated border border-border-light rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground">{ticket.subject}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-muted">{ticket.ticketNumber}</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {ticket.status}
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  {ticket.priority}
                </span>
                <span className="text-[10px] text-muted">{formatKeyword(ticket.category)}</span>
                {ticket.relatedOrderId && (
                  <Link
                    to={`/orders`}
                    className="text-[11px] text-primary hover:underline no-underline"
                  >
                    Order: {ticket.relatedOrderId}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background-elevated border border-border-light rounded-xl p-4 sm:p-5 space-y-4 mb-3">
        {ticket.relatedOrderId && (
          <div className="flex justify-center">
            <Link
              to={`/orders?search=${encodeURIComponent(ticket.relatedOrderId)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.06] border border-primary/20 text-[11px] text-foreground no-underline hover:bg-primary/10 transition-colors"
            >
              <ShoppingBag className="w-3 h-3 text-primary" />
              <span className="text-muted">Enquiry raised for order</span>
              <span className="font-semibold text-primary">{ticket.relatedOrderId}</span>
            </Link>
          </div>
        )}
        {(ticket.messages ?? []).map((m) => {
          const mine = m.fromRole === "seller";
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  mine ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                }`}
              >
                {mine ? <User className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
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
                        path={supportApi.attachmentPath(ticket.id, a.id)}
                        name={a.name}
                        contentType={a.contentType}
                        size={a.size}
                      />
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-muted mt-1 px-1">
                  {mine ? "You" : "Support"} · {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {ticket.status === "closed" ? (
        <div className="bg-background-elevated border border-border-light rounded-xl p-4 text-center text-xs text-muted">
          This ticket is closed. Open a new one if you need further help.
        </div>
      ) : (
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
          <div className="flex items-end gap-1.5 bg-background-elevated border border-border-light rounded-2xl p-1.5 focus-within:border-primary/40 transition-colors">
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
              placeholder="Type a reply…"
              className="flex-1 min-w-0 px-2 py-2 text-sm bg-transparent text-foreground outline-none placeholder:text-muted resize-none max-h-32"
            />
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
      )}
    </div>
  );
}
