import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./refresh.css";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
export const metadata: Metadata = {
  title: {
    default: "Searchcraft | Moving more possibilities",
    template: "%s | Searchcraft",
  },
  description:
    "One place to compare courier rates, manage orders and follow every delivery. Shipping for businesses moving forward.",
  icons: {
    icon: [
      { url: "/favicon.png?v=box-beyond-purple-2", type: "image/png" },
      { url: "/brand-mark.png?v=box-beyond-purple-2", type: "image/png" },
    ],
    shortcut: "/favicon.png?v=box-beyond-purple-2",
    apple: "/apple-touch-icon.png?v=box-beyond-purple-2",
  },
};

export const viewport: Viewport = {
  themeColor: "#6757E8",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
