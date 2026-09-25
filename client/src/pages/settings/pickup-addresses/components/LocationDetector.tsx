import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LocateFixed,
  Loader2,
  MapPinOff,
  PenLine,
  CheckCircle2,
} from "lucide-react";
import { geocodeApi, type GeocodeResult } from "@/lib/geoapifyApi";

interface LocationDetectorProps {
  onLocationDetected: (result: GeocodeResult) => void;
  onManualEntry: () => void;
}

type DetectorState = "idle" | "detecting" | "success" | "error";

export function LocationDetector({
  onLocationDetected,
  onManualEntry,
}: LocationDetectorProps) {
  const [state, setState] = useState<DetectorState>("idle");
  const [error, setError] = useState("");
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setState("error");
      return;
    }

    setState("detecting");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await geocodeApi.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );
          setDetectedAddress(result.formatted);
          setState("success");
          onLocationDetected(result);
        } catch {
          setError("Could not determine your address. Please enter manually.");
          setState("error");
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow access or enter manually.",
          2: "Unable to determine your location. Please enter manually.",
          3: "Location request timed out. Please try again or enter manually.",
        };
        setError(messages[err.code] ?? "Could not detect location.");
        setState("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [onLocationDetected]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-muted mb-1">
          We'll use your location to prefill address details automatically
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Idle / Detecting */}
        {(state === "idle" || state === "detecting") && (
          <motion.div
            key="detect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={detectLocation}
              disabled={state === "detecting"}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {state === "detecting" ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <LocateFixed className="w-4.5 h-4.5" />
              )}
              {state === "detecting"
                ? "Detecting your location..."
                : "Spot Me / Use My Current Location"}
            </button>
            <p className="text-[11px] text-tertiary">
              Allow browser location access when prompted
            </p>
          </motion.div>
        )}

        {/* Success */}
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800 mb-1">
                  Location detected successfully!
                </p>
                {detectedAddress && (
                  <p className="text-xs text-green-700">{detectedAddress}</p>
                )}
                <p className="text-[11px] text-green-600 mt-2">
                  Address fields have been prefilled. You can review and edit
                  them below.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <MapPinOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">
                  Didn't find me? Set up on map
                </p>
                <p className="text-xs text-red-600">{error}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={detectLocation}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onManualEntry}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground bg-background hover:bg-border-light transition-colors"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always show manual entry option */}
      {state !== "error" && (
        <div className="text-center">
          <button
            type="button"
            onClick={onManualEntry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" />
            Enter Manually
          </button>
        </div>
      )}
    </div>
  );
}
