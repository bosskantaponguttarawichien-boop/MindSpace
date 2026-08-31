import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"], display: "swap" });

export const metadata: Metadata = {
  title: "MindSpace — Personal knowledge board",
  description: "An infinite board for connecting ideas and building knowledge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable}`}>
      <body>
        <LocaleProvider>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
