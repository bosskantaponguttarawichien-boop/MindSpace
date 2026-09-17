import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { PwaRegistration } from "@/components/pwa/pwa-registration";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"], display: "swap" });

export const metadata: Metadata = {
  title: "MindSpace — Personal knowledge board",
  description: "An infinite board for connecting ideas and building knowledge.",
  applicationName: "MindSpace",
  appleWebApp: { capable: true, title: "MindSpace", statusBarStyle: "black-translucent" },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/mindspace-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/mindspace-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

// `viewport-fit=cover` lets the PWA paint edge to edge on notched devices.
// Without it iOS letterboxes the web view inside the safe area and every
// `env(safe-area-inset-*)` used across the UI resolves to 0px.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable}`}>
      <body>
        <LocaleProvider>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </LocaleProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
