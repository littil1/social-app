import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthModalProvider from "@/features/auth/components/AuthModalProvider";
import GlobalPostModal from "@/features/posts/components/GlobalPostModal";
import { createClient } from "@/lib/supabase/server";

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
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  title: "APP - A Perfect Place",
  description: "Impact over Fame. Join today.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// =====================================================
// Layout
// =====================================================

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  
  // Auth-Check auf Server-Ebene
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#fafafa] text-neutral-950 antialiased`}
      >
        <AuthModalProvider>
          {/* Padding-Bottom (pb-32):
              Wichtig für die Floating NavBar. 
          */}
          <main className="pb-28 sm:pb-32">
            {children}
          </main>

          {/* GLOBAL POST MODAL:
              Hört jetzt auf jeder Seite auf das "+" Event.
          */}
          <GlobalPostModal 
            isLoggedIn={!!user} 
            currentUserProfile={profile} 
          />
        </AuthModalProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
