import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

interface SubmitButtonProps {
  loading: boolean;
  label: string;
  disabled?: boolean;
}

export function SubmitButton({ loading, label, disabled = false }: SubmitButtonProps) {
  const isDisabled = loading || disabled;
  return (
    <motion.button
      type="submit"
      disabled={isDisabled}
      whileHover={{ scale: loading ? 1 : 1.01 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
      className="w-full inline-flex items-center justify-center gap-2 h-12 text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Please wait...
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </motion.button>
  );
}
