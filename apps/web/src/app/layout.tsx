// Root layout — load Instrument Serif (heading) & Barlow (body).
import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Barlow } from "next/font/google";
import "@atrioom/ui-tokens/globals.css";
import { SwRegister } from "@/components/sw/SwRegister";
import { ConnectivityBanner } from "@/components/offline/ConnectivityBanner";
import { SyncStatusBadge } from "@/components/offline/SyncStatusBadge";

const fontHeading = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const fontBody = Barlow({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atrioom Workspace",
  description: "Operational dashboard & front-desk system.",
  applicationName: "Atrioom",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atrioom",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="min-h-screen bg-black text-white antialiased">
        <SwRegister />
        <ConnectivityBanner />
        <SyncStatusBadge />
        {children}
      </body>
    </html>
  );
}