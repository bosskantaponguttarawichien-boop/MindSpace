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
  // The status bar stays opaque on purpose. Under `black-translucent` iOS pins
  // the web view to the top of the screen but still sizes it to the safe height,
  // so the last status-bar-tall strip of the screen sits below the web view
  // entirely — unreachable by any layout, which is the blank band users saw.
  appleWebApp: { capable: true, title: "MindSpace", statusBarStyle: "default" },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/mindspace-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/mindspace-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

// `viewport-fit=cover` keeps the web view spanning the screen's full width and
// its bottom edge, over the home indicator, and is what makes the
// `env(safe-area-inset-*)` values the UI pads with resolve to real numbers.
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
