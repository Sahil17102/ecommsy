import { motion } from "framer-motion";

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2"
    >
      {message}
    </motion.p>
  );
}
