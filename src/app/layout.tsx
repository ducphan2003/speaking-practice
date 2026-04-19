import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SrsQuickReviewBubble } from "@/components/srs/SrsQuickReviewBubble";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Speaking Practice App",
  description: "AI-powered English speaking practice application with dual-transcript evaluation",
  // Tránh Referrer-Policy quá chặt làm GSI (gsi/status) trả 403
  referrer: "strict-origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
        <SrsQuickReviewBubble />
      </body>
    </html>
  );
}
