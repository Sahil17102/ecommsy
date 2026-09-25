import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  Search,
  X,
  ArrowRight,
  Loader2,
  Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationBell } from "@/components/common/NotificationBell";
import { getActiveLabel } from "./sidebarConfig";
import { useWalletBalance } from "@/queries/useWallet";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import { api } from "@/lib/api";

interface DashboardHeaderProps {
  onMobileMenuOpen: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

interface SearchResult {
  id: string;
  orderId: string;
  awb: string;
  status: string;
  serviceProvider: string;
  city?: string;
}

const STATUS_DOT: Record<string, string> = {
  delivered: "#10B981", in_transit: "#0EA5E9", shipped: "#6366F1",
  out_for_delivery: "#F59E0B", ndr: "#EF4444", rto_initiated: "#F97316",
  rto_in_transit: "#F97316", created: "#6B7280", processing: "#3B82F6",
  booked: "#8B5CF6", pickup_initiated: "#8B5CF6",
};

export function DashboardHeader({ onMobileMenuOpen, sidebarCollapsed, onToggleSidebar }: DashboardHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageTitle = getActiveLabel(pathname);
  const { data: walletData } = useWalletBalance();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // ── Search state ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 100);
    else { setQuery(""); setResults([]); setSelectedIdx(-1); }
  }, [searchOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    if (searchOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen((p) => !p); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const { data } = await api.get("/orders", { params: { search: q, limit: 5 } });
      setResults((data.orders ?? []).map((o: any) => ({
        id: o.id, orderId: o.orderId, awb: o.awb, status: o.status,
        serviceProvider: o.serviceProvider, city: o.deliveryAddress?.city,
      })));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const onInput = (val: string) => {
    setQuery(val); setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, -1)); }
    else if (e.key === "Enter" && selectedIdx >= 0 && results[selectedIdx]) {
      e.preventDefault(); navigate(`/orders/${results[selectedIdx].id}`); setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-14 bg-background-elevated border-b border-border-light flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left */}
      <div className={`flex items-center gap-1 min-w-0 shrink-0 ${searchOpen ? "hidden sm:flex" : ""}`}>
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
        </button>
        <h1 className="text-sm font-semibold text-foreground ml-1 truncate">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className={`flex items-center gap-1.5 ${searchOpen ? "flex-1 sm:flex-initial justify-end" : ""}`}>
        {/* ── Animated search bar ── */}
        <div ref={containerRef} className={`relative flex items-center ${searchOpen ? "flex-1 sm:flex-initial" : ""}`}>
          <AnimatePresence mode="wait">
            {!searchOpen ? (
              <motion.button
                key="search-icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
                title="Search orders (⌘K)"
              >
                <Search className="w-[18px] h-[18px]" />
              </motion.button>
            ) : (
              <motion.div
                key="search-bar"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-background ring-1 ring-primary/10 overflow-hidden w-full sm:w-[280px]"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-primary shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Enter Pickup Address, AWB or order ID"
                  className="flex-1 min-w-0 text-xs bg-transparent text-foreground outline-none placeholder:text-muted"
                />
                <button onClick={() => setSearchOpen(false)} className="p-0.5 text-muted hover:text-foreground shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results dropdown */}
          <AnimatePresence>
            {searchOpen && query.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-full sm:mt-1.5 sm:w-[340px] bg-background-elevated border border-border-light rounded-xl shadow-lg z-30 overflow-hidden"
              >
                {results.length > 0 ? (
                  <div className="py-1 max-h-[300px] overflow-y-auto">
                    {results.map((r, idx) => (
                      <Link
                        key={r.id}
                        to={`/orders/${r.id}`}
                        onClick={() => setSearchOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 no-underline transition-colors ${idx === selectedIdx ? "bg-primary/[0.06]" : "hover:bg-primary/[0.04]"}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_DOT[r.status] ?? "#6B7280" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{r.orderId}</span>
                            <span className="text-[10px] text-muted">{r.awb}</span>
                          </div>
                          <p className="text-[10px] text-muted mt-0.5">{formatKeyword(r.serviceProvider)} &middot; {r.city ?? "—"} &middot; {formatKeyword(r.status)}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : searching ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 text-muted animate-spin" /></div>
                ) : (
                  <div className="py-6 text-center"><p className="text-xs text-muted">No results for &ldquo;{query}&rdquo;</p></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`items-center gap-1.5 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
          {/* Wallet */}
          <Link
            to="/wallet"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border-light mr-0.5 hover:border-primary/30 hover:bg-primary/[0.03] transition-all no-underline"
          >
            <Wallet className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-foreground">
              {walletData ? formatCurrency(walletData.balance) : "—"}
            </span>
          </Link>

          <Link
            to="/support"
            title="Help & Support"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg sm:bg-background sm:border sm:border-border-light hover:bg-background sm:hover:border-primary/40 sm:hover:bg-primary/[0.04] text-muted hover:text-foreground transition-all no-underline"
          >
            <Headphones className="w-[18px] h-[18px] sm:w-3.5 sm:h-3.5 sm:text-primary" />
            <span className="hidden sm:inline text-xs font-semibold text-foreground">
              Support
            </span>
          </Link>

          <ThemeToggle />

          <NotificationBell />

          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
