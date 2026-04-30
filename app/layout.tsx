import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthModalProvider from "@/features/auth/components/AuthModalProvider";
import GlobalPostModal from "@/features/posts/components/GlobalPostModal";
import NavBar from "@/shared/components/layout/navbar";
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
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" className="scroll-smooth bg-[#fafafa]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#fafafa] text-neutral-950 antialiased`}
      >
        <AuthModalProvider>
          <NavBar
            user={
              profile?.username
                ? {
                    username: profile.username,
                    avatar_url: profile.avatar_url ?? null,
                    is_admin: profile.is_admin ?? false,
                  }
                : null
            }
          />

          {/* Padding-Bottom (pb-32):
              Wichtig für die Floating NavBar. 
          */}
          <main className="app-page-enter min-h-screen bg-[#fafafa] pb-32 sm:pb-32">
            {children}
            <footer className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-8 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              <Link href="/imprint" className="transition hover:text-neutral-950">
                Impressum
              </Link>
              <Link href="/privacy" className="transition hover:text-neutral-950">
                Datenschutz
              </Link>
              <Link href="/terms" className="transition hover:text-neutral-950">
                Terms
              </Link>
            </footer>
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
