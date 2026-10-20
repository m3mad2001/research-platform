import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./healthtwin.css";
import ActivityTracker from "../components/ActivityTracker";
import SiteVisitTracker from "../components/SiteVisitTracker";
import { BRAND_NAME, BRAND_SUBTITLE } from "../components/HealthTwinBrand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#061726" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ActivityTracker />
        <SiteVisitTracker />
        {children}
      </body>
    </html>
  );
}
