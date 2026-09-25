import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ChevronDown, FileText, Receipt, Loader2 } from "lucide-react";
import { ordersApi } from "@/lib/ordersApi";
import type { Order } from "@/lib/ordersApi";

function DownloadMenu({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(type: "label" | "invoice", e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(type);
    try {
      if (type === "label") await ordersApi.downloadLabel(order.id, order.awb);
      else await ordersApi.downloadInvoice(order.id, order.orderId);
    } catch {
      // silent
    } finally {
      setDownloading(null);
      setOpen(false);
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((p) => !p); }}
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md bg-background border border-border-light text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all"
      >
        <Download className="w-3 h-3" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-20 bg-background-elevated rounded-xl border border-border-light shadow-lg shadow-black/8 py-1 min-w-[140px]"
          >
            <button
              onClick={(e) => handleDownload("label", e)}
              disabled={downloading === "label"}
              className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-medium text-muted hover:text-primary hover:bg-primary/[0.04] transition-colors disabled:opacity-50"
            >
              {downloading === "label" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Shipping Label
            </button>
            <button
              onClick={(e) => handleDownload("invoice", e)}
              disabled={downloading === "invoice"}
              className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-medium text-muted hover:text-primary hover:bg-primary/[0.04] transition-colors disabled:opacity-50"
            >
              {downloading === "invoice" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
              Invoice
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DownloadMenu;
