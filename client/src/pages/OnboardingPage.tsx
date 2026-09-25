import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Briefcase,
  Plug,
  Check,
  MapPin,
  Mail,
  Phone,
  LogOut,
} from "lucide-react";
import { animationConfig } from "@/config/animations";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/common/AppLogo";
import { useOnboarding } from "@/queries/useAuth";
import { usePincodeLookup } from "@/queries/usePincode";
import { BrandLogo } from "@/components/BrandLogos";
import { regex } from "@/lib/constants";


type OnboardingStep = 1 | 2 | 3;

const STEPS = [
  { number: 1, label: "Personal Info", description: "Your contact details", icon: <User className="w-4 h-4" /> },
  { number: 2, label: "Business Details", description: "About your business", icon: <Briefcase className="w-4 h-4" /> },
  { number: 3, label: "Integrations", description: "Connect your store", icon: <Plug className="w-4 h-4" /> },
];

const SALES_CHANNELS = [
  { id: "website", label: "Own Website", domain: "google.com", color: "#4285F4" },
  { id: "amazon", label: "Amazon", domain: "amazon.com", color: "#FF9900" },
  { id: "flipkart", label: "Flipkart", domain: "flipkart.com", color: "#2874F0" },
  { id: "meesho", label: "Meesho", domain: "meesho.com", color: "#F43397" },
  { id: "myntra", label: "Myntra", domain: "myntra.com", color: "#FF3F6C" },
  { id: "social", label: "Social Media", domain: "instagram.com", color: "#E4405F" },
  { id: "whatsapp", label: "WhatsApp", domain: "whatsapp.com", color: "#25D366" },
  { id: "other", label: "Other" },
];

const VOLUME_BANDS = [
  { id: "0-100", label: "0 – 100" },
  { id: "100-500", label: "100 – 500" },
  { id: "500-1000", label: "500 – 1K" },
  { id: "1000-5000", label: "1K – 5K" },
  { id: "5000+", label: "5,000+" },
];

const INTEGRATIONS = [
  { id: "shopify", label: "Shopify", description: "E-commerce platform", domain: "shopify.com", color: "#96BF48" },
  { id: "woocommerce", label: "WooCommerce", description: "WordPress plugin", domain: "woocommerce.com", color: "#96588A" },
  { id: "amazon-seller", label: "Amazon Seller", description: "Marketplace seller", domain: "amazon.com", color: "#FF9900" },
  { id: "flipkart-seller", label: "Flipkart Seller", description: "Marketplace seller", domain: "flipkart.com", color: "#2874F0" },
  { id: "magento", label: "Magento", description: "E-commerce platform", domain: "magento.com", color: "#EE672F" },
  { id: "custom-api", label: "Custom API", description: "Direct integration" },
];

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};


export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      // OnboardingRoute redirects a null session to /signup anyway; navigate
      // explicitly so it's immediate.
      navigate("/signup", { replace: true });
    } catch {
      setLoggingOut(false);
    }
  };

  // Step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  // Step 1 — Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [pincode, setPincode] = useState("");

  // Step 2 — Business Details
  const [businessName, setBusinessName] = useState("");
  const [sellsOn, setSellsOn] = useState<string[]>([]);
  const [monthlyShipmentVolume, setMonthlyShipmentVolume] = useState("");

  // Step 3 — Integrations
  const [integrationsOfInterest, setIntegrationsOfInterest] = useState<string[]>([]);

  // Pincode lookup
  const { data: pincodeInfo, isLoading: pincodeLoading } = usePincodeLookup(pincode);

  // Mutations
  const onboardingMutation = useOnboarding();

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const phoneDisabled = !!user?.phone;
  const emailDisabled = !!user?.email;

  /* ─── Validation ─── */

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    if (!regex.phone.test(phone.trim())) errs.phone = "Valid 10-digit phone is required";
    if (!regex.email.test(email.trim())) errs.email = "Valid email is required";
    if (!regex.pincode.test(pincode.trim())) errs.pincode = "Valid 6-digit pincode is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    if (sellsOn.length === 0) errs.sellsOn = "Select at least one channel";
    if (!monthlyShipmentVolume) errs.monthlyShipmentVolume = "Select your monthly volume";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ─── Handlers ─── */

  const goNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
  };

  const goBack = () => {
    setErrors({});
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const toggleChannel = (id: string) => {
    setSellsOn((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleIntegration = (id: string) => {
    setIntegrationsOfInterest((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const loading = onboardingMutation.isPending;

  const handleSubmit = async (skipIntegrations = false) => {
    setErrors({});
    try {
      const { user } = await onboardingMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        pincode: pincode.trim(),
        businessName: businessName.trim(),
        sellsOn,
        monthlyShipmentVolume,
        integrationsOfInterest: skipIntegrations ? [] : integrationsOfInterest,
      });
      login(user);
      navigate("/home", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      // Step-1 fields are the only ones the server can reject on uniqueness
      // (phone / email are unique across accounts). Surface the failure on the
      // offending field and walk the seller back to it — a message stranded on
      // step 3 next to a disabled field is unactionable.
      const lower = message.toLowerCase();
      if (lower.includes("phone")) {
        setErrors({ phone: message });
        setCurrentStep(1);
      } else if (lower.includes("email")) {
        setErrors({ email: message });
        setCurrentStep(1);
      } else {
        setErrors({ submit: message });
      }
    }
  };

  /* ─── Shared input component ─── */

  const renderInput = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { type?: string; placeholder?: string; disabled?: boolean; icon?: React.ReactNode; maxLength?: number } = {},
  ) => {
    const isFocused = focusedField === name;
    const disabled = opts.disabled ?? false;
    return (
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
        <div
          className={`relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 ${
            disabled
              ? "border-border-light bg-background opacity-60 cursor-not-allowed"
              : isFocused
                ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                : "border-border-light bg-background hover:border-primary/20"
          }`}
        >
          {opts.icon && (
            <span className={`flex items-center justify-center w-10 h-full transition-colors ${isFocused ? "text-primary" : "text-muted"}`}>
              {opts.icon}
            </span>
          )}
          <input
            type={opts.type ?? "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocusedField(name)}
            onBlur={() => setFocusedField(null)}
            placeholder={opts.placeholder}
            disabled={disabled}
            maxLength={opts.maxLength}
            className={`flex-1 h-full ${opts.icon ? "pr-4" : "px-4"} text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary disabled:cursor-not-allowed`}
          />
        </div>
        {errors[name] && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-500 font-medium mt-1.5"
          >
            {errors[name]}
          </motion.p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* ━━━ LEFT BRANDING PANEL (desktop only) ━━━ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden hero-bg flex-col justify-between p-10 xl:p-14">
        <div className="hero-blob-1" />
        <div className="hero-blob-2" />

        <div className="relative z-10">
          <AppLogo size="lg" textClassName="text-white" className="mb-16" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: animationConfig.ease.out }}
          >
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Let's set up
              <br />
              <span className="text-gradient-accent">your account</span>
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              Just a few details and you'll be ready to start shipping with the best rates.
            </p>
          </motion.div>
        </div>

        {/* Step progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: animationConfig.ease.out }}
          className="relative z-10 space-y-4"
        >
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300 ${
                  currentStep > s.number
                    ? "bg-accent text-white"
                    : currentStep === s.number
                      ? "bg-white/20 text-white border-2 border-white/60"
                      : "bg-white/[0.06] text-white/30 border border-white/[0.08]"
                }`}
              >
                {currentStep > s.number ? <Check className="w-4 h-4" /> : s.icon}
              </div>
              <div>
                <p className={`text-sm font-semibold transition-colors ${currentStep >= s.number ? "text-white" : "text-white/30"}`}>
                  {s.label}
                </p>
                <p className={`text-xs transition-colors ${currentStep >= s.number ? "text-white/50" : "text-white/20"}`}>
                  {s.description}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1" />
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ━━━ RIGHT FORM PANEL ━━━ */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Desktop logout — lets a user on the wrong account back out of onboarding */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="hidden lg:flex items-center gap-1.5 absolute top-5 right-6 z-20 text-xs font-medium text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          Log out
        </button>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-5 h-16 border-b border-border-light">
          <AppLogo size="sm" />
          <div className="flex items-center gap-3">
            {/* Mobile step indicator */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((s) => (
                <div
                  key={s.number}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentStep >= s.number ? "bg-accent" : "bg-border-light"
                  }`}
                />
              ))}
              <span className="text-xs text-muted ml-2">
                {currentStep}/3
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              className="flex items-center text-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-start justify-center px-5 sm:px-8 py-8 sm:py-12 overflow-y-auto">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {/* ━━━ STEP 1: Personal Info ━━━ */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: animationConfig.ease.out }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      Personal Info
                    </h2>
                    <p className="text-sm text-muted">
                      Tell us a bit about yourself
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {renderInput("firstName", "First Name", firstName, setFirstName, { placeholder: "John" })}
                      {renderInput("lastName", "Last Name", lastName, setLastName, { placeholder: "Doe" })}
                    </div>

                    {renderInput("email", "Email Address", email, setEmail, {
                      type: "email",
                      placeholder: "you@company.com",
                      disabled: emailDisabled,
                      icon: <Mail className="w-4 h-4" />,
                    })}

                    {renderInput("phone", "Phone Number", phone, setPhone, {
                      type: "tel",
                      placeholder: "9876543210",
                      disabled: phoneDisabled,
                      maxLength: 10,
                      icon: <Phone className="w-4 h-4" />,
                    })}

                    <div>
                      {renderInput("pincode", "Pincode", pincode, setPincode, {
                        placeholder: "110001",
                        maxLength: 6,
                        icon: <MapPin className="w-4 h-4" />,
                      })}
                      {pincodeLoading && regex.pincode.test(pincode) && (
                        <p className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Looking up pincode...
                        </p>
                      )}
                      {pincodeInfo && !pincodeLoading && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs font-medium text-emerald-600 mt-1.5"
                        >
                          {pincodeInfo.city}, {pincodeInfo.state}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={goNext}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full inline-flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 mt-6"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}

              {/* ━━━ STEP 2: Business Details ━━━ */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: animationConfig.ease.out }}
                >
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-6"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>

                  <div className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      Business Details
                    </h2>
                    <p className="text-sm text-muted">
                      Help us understand your shipping needs
                    </p>
                  </div>

                  <div className="space-y-6">
                    {renderInput("businessName", "Business Name", businessName, setBusinessName, {
                      placeholder: "Acme Pvt. Ltd.",
                      icon: <Briefcase className="w-4 h-4" />,
                    })}

                    {/* Sales channels */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-2">
                        Where do you sell your products?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SALES_CHANNELS.map((ch) => {
                          const selected = sellsOn.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => toggleChannel(ch.id)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                                selected
                                  ? "border-primary bg-primary/[0.06] text-primary"
                                  : "border-border-light bg-background text-muted hover:border-primary/20"
                              }`}
                            >
                              {ch.domain ? (
                                <BrandLogo domain={ch.domain} name={ch.label} color={ch.color!} size={28} />
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm text-muted">⋯</span>
                              )}
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>
                      {errors.sellsOn && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium mt-1.5">
                          {errors.sellsOn}
                        </motion.p>
                      )}
                    </div>

                    {/* Monthly volume */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-2">
                        Monthly shipment volume
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {VOLUME_BANDS.map((band) => (
                          <button
                            key={band.id}
                            type="button"
                            onClick={() => setMonthlyShipmentVolume(band.id)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                              monthlyShipmentVolume === band.id
                                ? "border-primary bg-primary/[0.06] text-primary"
                                : "border-border-light text-muted hover:border-primary/20"
                            }`}
                          >
                            {band.label}
                          </button>
                        ))}
                      </div>
                      {errors.monthlyShipmentVolume && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium mt-1.5">
                          {errors.monthlyShipmentVolume}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={goNext}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full inline-flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 mt-6"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}

              {/* ━━━ STEP 3: Integrations (skippable) ━━━ */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: animationConfig.ease.out }}
                >
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-6"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>

                  <div className="mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      Connect your store
                    </h2>
                    <p className="text-sm text-muted">
                      Select platforms you'd like to integrate. You can always do this later.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {INTEGRATIONS.map((int) => {
                      const selected = integrationsOfInterest.includes(int.id);
                      return (
                        <button
                          key={int.id}
                          type="button"
                          onClick={() => toggleIntegration(int.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/[0.06]"
                              : "border-border-light bg-background hover:border-primary/20"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                            selected ? "bg-primary/10" : "bg-gray-50"
                          }`}>
                            {int.domain ? (
                              <BrandLogo domain={int.domain} name={int.label} color={int.color!} size={24} />
                            ) : (
                              <Plug className={`w-5 h-5 ${selected ? "text-primary" : "text-muted"}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                              {int.label}
                            </p>
                            <p className="text-xs text-muted truncate">{int.description}</p>
                          </div>
                          {selected && (
                            <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {errors.submit && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2 mb-4"
                    >
                      {errors.submit}
                    </motion.p>
                  )}

                  <motion.button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full inline-flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="w-full text-center text-sm font-medium text-muted hover:text-foreground transition-colors mt-3 py-2 disabled:opacity-50"
                  >
                    Skip for now →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
