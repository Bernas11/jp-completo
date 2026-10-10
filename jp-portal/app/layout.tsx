import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Portal Juventude Popular",
  description: "Comunidade oficial da Juventude Popular",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Portal JP" },
};

export const viewport: Viewport = {
  themeColor: "#0033c6",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let darkMode = false;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("portal_profiles")
        .select("dark_mode")
        .eq("id", user.id)
        .single();
      darkMode = profile?.dark_mode ?? false;
    }
  } catch {
    // sem sessão válida ainda (ex: primeira visita) — mantém modo claro
  }

  return (
    <html lang="pt-PT" className={`${archivo.variable} ${darkMode ? "dark" : ""}`}>
      <body>{children}</body>
    </html>
  );
}
