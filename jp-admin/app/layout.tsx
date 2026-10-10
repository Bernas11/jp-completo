import type { Metadata } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin — Juventude Popular",
  description: "Administração da plataforma digital da Juventude Popular",
  robots: { index: false, follow: false }, // painel interno, nunca indexar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
