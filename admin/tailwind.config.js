/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          bg: "var(--color-primary-bg)",
          light: "var(--color-primary-light)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          bg: "var(--color-accent-bg)",
        },
        foreground: "var(--color-text)",
        muted: "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        border: "var(--color-border)",
        "border-light": "var(--color-border-light)",
        background: "var(--color-bg)",
        "background-elevated": "var(--color-bg-elevated)",
        "hero-dark": "var(--color-hero-dark)",
        "hero-end": "var(--color-hero-gradient-end)",
        "loading-overlay": "var(--color-loading-overlay)",
        "surface-muted": "var(--color-surface-muted)",
        success: {
          DEFAULT: "var(--color-success)",
          bg: "var(--color-success-bg)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          bg: "var(--color-danger-bg)",
        },
      },
      fontFamily: {
        sans: "var(--font-sans), system-ui, sans-serif",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      maxWidth: {
        "container-sm": "var(--container-max-w-sm)",
        "container-md": "var(--container-max-w-md)",
        "container-lg": "var(--container-max-w-lg)",
        "container-xl": "var(--container-max-w-xl)",
        "container-2xl": "var(--container-max-w-2xl)",
      },
      spacing: {
        "section-gap": "var(--spacing-section-gap)",
        "content-gap": "var(--spacing-content-gap)",
        "content-y": "var(--spacing-content-y)",
        "content-y-sm": "var(--spacing-content-y-sm)",
        "empty-state": "var(--spacing-empty-state)",
        "page-header-gap": "var(--spacing-page-header-gap)",
        "page-header-margin": "var(--spacing-page-header-margin)",
        "container": "var(--spacing-container)",
        "container-sm": "var(--spacing-container-sm)",
      },
      minHeight: {
        "loading-min-height": "var(--loading-min-height)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
