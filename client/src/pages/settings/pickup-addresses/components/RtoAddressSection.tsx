import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { animationConfig } from "@/config/animations";
import { AddressFormFields } from "./AddressFormFields";

interface RtoAddressSectionProps {
  isVisible: boolean;
}

export function RtoAddressSection({ isVisible }: RtoAddressSectionProps) {
  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: animationConfig.ease.out }}
          className="overflow-hidden"
        >
          <div className="mt-5 pt-5 border-t border-border-light">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  RTO Address
                </h4>
                <p className="text-[11px] text-muted">
                  Where returns should be shipped to
                </p>
              </div>
            </div>

            <AddressFormFields prefix="rtoAddress" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
