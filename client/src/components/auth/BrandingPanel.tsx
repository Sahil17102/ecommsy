import { ArrowUpRight, Boxes, Check, Radar, Route } from "lucide-react";

const points = [
  { icon: Boxes, label: "Order workspace" },
  { icon: Route, label: "Courier control" },
  { icon: Radar, label: "Live tracking" },
];

export function BrandingPanel() {
  return (
    <aside className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden flex-col justify-between p-10 xl:p-14 bg-[#15133a] text-white">
      <div className="absolute inset-0 opacity-35" style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
        backgroundSize: "34px 34px",
      }} />
      <div className="absolute -right-28 top-20 h-72 w-72 rounded-full bg-[#8f7cff]/25 blur-3xl" />
      <div className="absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-[#8F83FF]/20 blur-3xl" />

      <a href={import.meta.env.VITE_MARKETING_URL || "https://boxsbeyond.com"} className="relative z-10 flex items-center gap-3 text-white no-underline">
        <img src="/brand-mark.png" alt="" className="h-12 w-12 object-contain" />
        <div>
          <strong className="block text-sm tracking-[0.18em]">BOX & BEYOND</strong>
          <span className="text-xs text-white/60">Moving more possibilities</span>
        </div>
      </a>

      <div className="relative z-10">
        <div className="mb-10 grid h-56 w-56 place-items-center rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <img src="/brand-mark.png" alt="Box and Beyond" className="h-40 w-40 object-contain drop-shadow-2xl" />
        </div>
        <h1 className="max-w-md text-5xl font-extrabold leading-[1.02] tracking-tight">
          Ship faster from a cleaner command center.
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-6 text-white/68">
          Login to manage rates, orders, pickups and tracking across the courier network built for Box & Beyond.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {points.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-3 transition hover:-translate-y-1 hover:border-[#a99dff] hover:bg-white/[0.12]">
              <Icon className="mb-3 h-5 w-5 text-[#bdb4ff]" />
              <p className="text-xs font-semibold leading-4 text-white/85">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Check size={15} className="text-[#bdb4ff]" />
          Secure seller access
        </div>
        <a href={import.meta.env.VITE_MARKETING_URL || "https://boxsbeyond.com"} className="flex items-center gap-2 text-xs font-semibold text-[#cfc9ff] no-underline">
          Back to site <ArrowUpRight size={15} />
        </a>
      </div>
    </aside>
  );
}
