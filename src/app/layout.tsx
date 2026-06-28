import type { Metadata } from "next";
import "./globals.css";
import { Telemetry } from "@/components/analytics/Telemetry";
import { AppShell } from "@/components/layout/AppShell";
import { StructuredData } from "@/components/seo/StructuredData";
import { getSiteUrl, siteDescription, siteName, siteTitle } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["NBA stats", "basketball analytics", "NBA player comparison", "NBA team stats", "player similarity"],
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <StructuredData />
        <Telemetry />
      </body>
    </html>
  );
}
