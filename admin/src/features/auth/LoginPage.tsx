import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Layers3, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@/features/auth/queries";
import { AppLogo } from "@/components/common/AppLogo";

const tiles = [
  { label: "Courier stack", value: "Unified" },
  { label: "Rate cards", value: "Controlled" },
  { label: "Ops view", value: "Live" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const loginMutation = useLogin();
  const loading = loginMutation.isPending;
  const error = loginMutation.error?.message ?? null;

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    loginMutation.reset();
    try {
      const result = await loginMutation.mutateAsync({ email: email.trim(), password });
      login(result.user);
      navigate("/", { replace: true });
    } catch {
      /* mutation owns the error */
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f2ff] text-[#17133b]">
      <div className="absolute inset-0" style={{
        backgroundImage:
          "linear-gradient(rgba(78,74,195,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(78,74,195,.09) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#7f6dff]/25 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#4e4ac3]/25 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.02fr_.98fr]">
        <section className="hidden lg:flex flex-col justify-between bg-[#15133a] p-12 text-white">
          <AppLogo size="lg" textClassName="text-white" className="relative z-10" />
          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-[#d8d2ff]">
              <Sparkles size={14} />
              Searchcraft admin command
            </div>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight">
              Control every shipment layer from one purple workspace.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
              Manage users, rates, courier credentials, support, wallets and delivery operations with a branded admin surface.
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:border-[#a99dff]">
                  <p className="text-xl font-black text-white">{tile.value}</p>
                  <p className="mt-1 text-xs text-white/55">{tile.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/65">
            <ShieldCheck size={16} className="text-[#bdb4ff]" />
            Secure superadmin access
          </div>
        </section>

        <section className="flex min-h-screen flex-col">
          <div className="lg:hidden flex h-16 items-center border-b border-[#dddafa] bg-white/80 px-5">
            <AppLogo size="sm" />
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="w-full max-w-md rounded-[28px] border border-[#d9d5ff] bg-white/90 p-7 shadow-2xl shadow-[#332d7a]/12 backdrop-blur"
            >
              <div className="mb-8">
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#ebe8ff]">
                  <Layers3 className="h-7 w-7 text-[#4E4AC3]" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#191446]">Admin Login</h2>
                <p className="mt-2 text-sm text-[#6f6a8d]">Sign in to the Searchcraft control panel.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className={`flex h-12 items-center rounded-2xl border transition ${focusedField === "email" ? "border-[#4E4AC3] bg-[#f5f3ff] ring-4 ring-[#4E4AC3]/10" : "border-[#dedbf4] bg-white hover:border-[#8f83ff]"}`}>
                  <span className={`flex h-full w-11 items-center justify-center ${focusedField === "email" ? "text-[#4E4AC3]" : "text-[#8c87a7]"}`}>
                    <Mail className="h-4 w-4" />
                  </span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} placeholder="admin@boxandbeyond.in" autoComplete="username" autoFocus required className="h-full flex-1 bg-transparent pr-3 text-sm font-semibold text-[#191446] outline-none placeholder:text-[#aaa5c1]" />
                </div>

                <div className={`flex h-12 items-center rounded-2xl border transition ${focusedField === "password" ? "border-[#4E4AC3] bg-[#f5f3ff] ring-4 ring-[#4E4AC3]/10" : "border-[#dedbf4] bg-white hover:border-[#8f83ff]"}`}>
                  <span className={`flex h-full w-11 items-center justify-center ${focusedField === "password" ? "text-[#4E4AC3]" : "text-[#8c87a7]"}`}>
                    <Lock className="h-4 w-4" />
                  </span>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} placeholder="Password" autoComplete="current-password" required className="h-full flex-1 bg-transparent text-sm font-semibold text-[#191446] outline-none placeholder:text-[#aaa5c1]" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} tabIndex={-1} className="px-3 text-[#8c87a7] transition hover:text-[#191446]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

                <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#4E4AC3] via-[#675cf0] to-[#332D7A] text-sm font-extrabold text-white shadow-xl shadow-[#4E4AC3]/25 transition hover:shadow-[#4E4AC3]/40 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Signing in...</span> : "Sign in"}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
