import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import "./apple.css"; // must stay last
import ActivityTracker from "../components/ActivityTracker";
import SiteVisitTracker from "../components/SiteVisitTracker";
import { BRAND_NAME, BRAND_SUBTITLE } from "../components/HealthTwinBrand";

// SF Pro can't be self-hosted, so Apple devices render it natively via the system stack.
// Everyone else gets Inter, which is visually the closest match.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s | ${BRAND_NAME}` },
  description: `${BRAND_SUBTITLE}. From Silicon to Intelligent Healthcare.`,
  icons: {
    icon: [
      { url: "/healthtwin/mark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ActivityTracker />
        <SiteVisitTracker />
        {children}
      </body>
    </html>
  );
}