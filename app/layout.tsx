import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthModalProvider from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Fonts
// =====================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// =====================================================
// Metadata
// =====================================================

export const metadata: Metadata = {
  title: "APP",
  description: "a perfect place",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// =====================================================
// Layout
// =====================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthModalProvider>{children}</AuthModalProvider>
      </body>
    </html>
  );
}