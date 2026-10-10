import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  MessageSquare,
  MessageCircle,
  Calendar,
  User,
  Home,
  FileText,
  BarChart3,
  BookOpen,
  Archive,
  ShieldCheck,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { roleLabel, isModeratorRole } from "@/lib/roles";
import { UserMenu } from "@/components/layout/user-menu";

const primaryNavItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mural", label: "Mural", icon: Home },
  { href: "/comunidade/forum", label: "Fóruns", icon: MessageSquare },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/eventos", label: "Eventos", icon: Calendar },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/sondagens", label: "Sondagens", icon: BarChart3 },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
  { href: "/arquivo", label: "Arquivo", icon: Archive },
];

// Nav inferior (mobile): apenas as áreas mais usadas no dia a dia.
// As restantes (Documentos, Sondagens, Wiki) ficam acessíveis a partir
// da navegação de topo e dos acessos rápidos na homepage.
const mobileNavItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mural", label: "Mural", icon: MessageSquare },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/eventos", label: "Eventos", icon: Calendar },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ count: unreadCount }, profile] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .is("read_at", null),
    getOrCreateProfile(supabase, user),
  ]);

  const displayName = profile?.display_name ?? "Novo membro";
  const role = profile?.role ?? null;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <header className="sticky top-0 z-10 border-b border-jp-line bg-white/90 backdrop-blur-md dark:bg-jp-blue-deep/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display uppercase text-sm text-jp-blue-deep dark:text-white">
            Portal JP
          </Link>

          <nav className="hidden flex-1 flex-wrap items-center justify-center gap-1 lg:flex">
            {primaryNavItems
              .filter((item) => item.href !== "/mural") // "Mural" e "Início" coincidem no bottom nav; no topo mostramos só "Início"
              .concat(isModeratorRole(role) ? [{ href: "/moderacao", label: "Moderação", icon: ShieldCheck }] : [])
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-jp-ink-soft transition-colors hover:bg-jp-blue/5 hover:text-jp-blue-deep dark:text-jp-line dark:hover:bg-white/5 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/notificacoes" className="relative rounded-full p-2 hover:bg-jp-blue/5 dark:hover:bg-white/5">
              <Bell className="h-5 w-5 text-jp-blue-deep dark:text-white" />
              {!!unreadCount && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-jp-yellow text-[10px] font-bold text-jp-blue-deep">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <UserMenu
              displayName={displayName}
              roleLabel={roleLabel(role)}
              isModerator={isModeratorRole(role)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-24 pt-4 text-center text-xs text-muted-foreground lg:pb-6">
        <Link href="/politica-privacidade" className="hover:underline">
          Privacidade
        </Link>
        {" · "}
        <Link href="/politica-cookies" className="hover:underline">
          Cookies
        </Link>
        {" · "}
        <Link href="/termos-condicoes" className="hover:underline">
          Termos
        </Link>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-jp-line bg-white/95 py-2 backdrop-blur-md dark:bg-jp-blue-deep/95 lg:hidden">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-jp-blue-deep dark:text-white"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
