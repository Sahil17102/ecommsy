import type { TourStep } from "@/components/common/ThemedTour";

const TOUR_STORAGE_KEY = "kyc-tour-seen";

/** Check if the user has already seen the KYC tour */
export function hasSeenKycTour(): boolean {
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

/** Mark the KYC tour as seen */
export function markKycTourSeen(): void {
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

/** Reset the tour (for replay) */
export function resetKycTour(): void {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

/**
 * Build the KYC tour steps.
 * `goToStep` callback lets the tour actually navigate the KYC form.
 */
export function getKycTourSteps(goToStep: (step: number) => void): TourStep[] {
  return [
    {
      title: "Welcome to KYC Verification",
      description:
        "Complete 3 simple steps to unlock COD orders, wallet withdrawals, and invoice generation. Let's walk you through it!",
      target: () =>
        document.querySelector('[data-tour="kyc-title"]') as HTMLElement,
      placement: "bottom",
      onEnter: () => goToStep(0),
    },
    {
      title: "Track Your Progress",
      description:
        "This bar shows which step you're on. Each step turns green once completed. You can always go back to a previous step.",
      target: () =>
        document.querySelector('[data-tour="kyc-steps"]') as HTMLElement,
      placement: "bottom",
    },
    {
      title: "Step 1 — Choose Your Business Type",
      description:
        "Pick the card that matches your business. If you're a registered company, you'll also select the company type (Pvt Ltd, LLP, etc.).",
      target: () =>
        document.querySelector('[data-tour="kyc-form"]') as HTMLElement,
      placement: "top",
    },
    {
      title: "Step 2 — Take a Selfie",
      description:
        "Use your webcam to take a quick selfie for identity verification. If your camera isn't available, you can upload a photo instead.",
      target: () =>
        document.querySelector('[data-tour="kyc-form"]') as HTMLElement,
      placement: "top",
      onEnter: () => goToStep(1),
    },
    {
      title: "Step 3 — Upload Documents",
      description:
        "Upload the required documents (PAN, Aadhaar, etc.) based on your business type. Our team reviews them within 1–2 business days.",
      target: () =>
        document.querySelector('[data-tour="kyc-form"]') as HTMLElement,
      placement: "top",
      onEnter: () => goToStep(2),
    },
    {
      title: "Need Help?",
      description:
        "Click this button anytime to replay this guide. If you have questions, reach out to our support team.",
      target: () =>
        document.querySelector('[data-tour="kyc-help"]') as HTMLElement,
      placement: "left",
      onEnter: () => goToStep(0),
    },
  ];
}
