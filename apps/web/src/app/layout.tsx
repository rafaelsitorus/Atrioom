// Root layout — load Instrument Serif (heading) & Barlow (body).
import type { Metadata } from "next";
import { Instrument_Serif, Barlow } from "next/font/google";
import "@atrioom/ui-tokens/globals.css";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="min-h-screen bg-black text-white antialiased">{children}</body>
    </html>
  );
}