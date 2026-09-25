import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ScanFace,
  AlertCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { validateFace } from "@/lib/faceDetection";
import { useUploadKycDocument } from "../queries";
import type { KycRecord } from "../types";

interface SelfieStepProps {
  kyc: KycRecord;
  onNext: () => void;
  onBack: () => void;
}

type Mode = "camera" | "preview" | "uploaded";

export function SelfieStep({ kyc, onNext, onBack }: SelfieStepProps) {
  const webcamRef = useRef<Webcam>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // Increment to force-remount the Webcam component
  const [cameraKey, setCameraKey] = useState(0);
  const uploadMutation = useUploadKycDocument();

  const selfieUploaded =
    kyc.selfie?.url && kyc.selfie.status !== "not_uploaded";

  const [mode, setMode] = useState<Mode>(selfieUploaded ? "uploaded" : "camera");

  // Stop the camera stream on unmount to turn off the green light
  useEffect(() => {
    return () => {
      const video = webcamRef.current?.video;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = useCallback(() => {
    setCameraReady(false);
    setCameraError(null);
    setCameraKey((k) => k + 1); // force remount Webcam
    setMode("camera");
  }, []);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image. Please try again.");
      return;
    }

    // Validate face using MediaPipe
    setValidating(true);
    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const result = await validateFace(img, img.naturalWidth, img.naturalHeight);

      if (!result.valid) {
        toast.error(result.reason || "No face detected. Please try again.");
        setValidating(false);
        return;
      }
    } catch {
      // If validation setup fails, allow the image (admin will review)
    }
    setValidating(false);

    setCapturedImage(imageSrc);
    setMode("preview");
  }, []);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleUpload = async () => {
    if (!capturedImage) return;
    const file = dataURLtoFile(capturedImage, "selfie.jpg");
    try {
      await uploadMutation.mutateAsync({ documentKey: "selfie", file });
      toast.success("Selfie uploaded successfully");
      onNext();
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || "Failed to upload selfie";
      toast.error(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-background-elevated rounded-2xl border border-border-light">
        {/* Card header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <ScanFace className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Selfie Capture
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Take a clear photo of your face for identity verification
              </p>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {/* ── Already uploaded ── */}
            {mode === "uploaded" && (
              <motion.div
                key="uploaded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-6 sm:py-8"
              >
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    Selfie uploaded
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {kyc.selfie.status === "approved"
                      ? "Your selfie has been verified."
                      : kyc.selfie.status === "rejected"
                        ? "Your selfie was rejected. Please re-take."
                        : "Your selfie is awaiting review."}
                  </p>
                </div>
                {kyc.selfie.status === "rejected" && kyc.selfie.rejectionReason && (
                  <div className="w-full max-w-sm px-3 py-2 rounded-lg bg-error/[0.06] border border-error/20">
                    <p className="text-xs text-error font-medium text-center">
                      Reason: {kyc.selfie.rejectionReason}
                    </p>
                  </div>
                )}
                {kyc.selfie.status !== "approved" && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-primary bg-primary/[0.06] hover:bg-primary/[0.12] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Re-take selfie
                  </button>
                )}
              </motion.div>
            )}

            {/* ── Camera ── */}
            {mode === "camera" && (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-sm mx-auto flex flex-col items-center"
              >
                {/* Webcam */}
                <div className="relative rounded-xl overflow-hidden bg-black w-56 h-72 sm:w-64 sm:h-80">
                  {!cameraError ? (
                    <Webcam
                      key={cameraKey}
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.85}
                      videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 480 },
                        height: { ideal: 640 },
                      }}
                      onUserMedia={() => setCameraReady(true)}
                      onUserMediaError={(err) => {
                        const msg =
                          err instanceof DOMException && err.name === "NotAllowedError"
                            ? "Camera permission denied. Please allow camera access in your browser settings."
                            : "Camera not available. Please check your device.";
                        setCameraError(msg);
                      }}
                      mirrored
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                      <AlertCircle className="w-10 h-10 text-error/70" />
                      <p className="text-sm font-semibold text-white/90">
                        Camera Unavailable
                      </p>
                      <p className="text-xs text-white/50 max-w-[250px]">
                        {cameraError}
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary/80 hover:bg-primary transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Face guide overlay */}
                  {!cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className="rounded-full border-2 border-dashed transition-colors duration-500"
                        style={{
                          width: "55%",
                          height: "65%",
                          borderColor: cameraReady
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.15)",
                        }}
                      />
                    </div>
                  )}

                  {/* Loading indicator */}
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                        <p className="text-xs text-white/70">Starting camera...</p>
                      </div>
                    </div>
                  )}

                  {/* Validating overlay */}
                  {validating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-xs text-white/70">Checking photo...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {["Good lighting", "Face the camera", "No sunglasses"].map((tip) => (
                    <span
                      key={tip}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/[0.06] text-primary"
                    >
                      {tip}
                    </span>
                  ))}
                </div>

                {/* Capture button */}
                <div className="mt-4 w-full">
                  <button
                    type="button"
                    onClick={capture}
                    disabled={!cameraReady || !!cameraError || validating}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {validating ? "Validating..." : "Capture Selfie"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Preview ── */}
            {mode === "preview" && capturedImage && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-sm mx-auto flex flex-col items-center"
              >
                <div className="relative rounded-xl overflow-hidden w-56 h-72 sm:w-64 sm:h-80">
                  <img
                    src={capturedImage}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                  {/* Success badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/90 text-white text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Looks good
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 w-full">
                  <button
                    type="button"
                    onClick={retake}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-foreground border-2 border-border-light hover:border-primary/20 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-success to-green-500 shadow-md shadow-green-500/20 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Use This Photo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-border-light bg-surface-muted/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-foreground border-2 border-border-light hover:border-primary/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            {selfieUploaded && (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
