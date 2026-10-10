"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  FileText,
  MapPin,
  Landmark,
  ShoppingBag,
  Mail,
  Calendar,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Newspaper,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    title: "Militância",
    items: [
      { href: "/militancia/pedidos", label: "Pedidos de Adesão", icon: Users },
      { href: "/militancia/membros", label: "Militantes", icon: UserCheck },
      { href: "/militancia/importar", label: "Importar em Bulk", icon: FileText },
    ],
  },
  {
    title: "Estrutura",
    items: [
      { href: "/estrutura/concelhias", label: "Concelhias", icon: MapPin },
      { href: "/estrutura/distritais", label: "Moderadores Distritais", icon: UserCheck },
      { href: "/estrutura/orgaos-nacionais", label: "Órgãos Nacionais", icon: Landmark },
      { href: "/estrutura/lideres", label: "Líderes", icon: ShieldCheck },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { href: "/noticias", label: "Atividades", icon: Newspaper },
      { href: "/documentacao", label: "Documentação", icon: FileText },
      { href: "/loja/produtos", label: "Loja — Produtos", icon: ShoppingBag },
      { href: "/loja/encomendas", label: "Loja — Encomendas", icon: ShoppingBag },
      { href: "/comunicacao", label: "Comunicação", icon: Mail },
      { href: "/eventos", label: "Eventos", icon: Calendar },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText },
      { href: "/administradores", label: "Administradores", icon: ShieldCheck },
    ],
  },
];

/** Ícone com tooltip suave que aparece ao lado, só na barra estreita (desktop). */
function RailLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200",
          active
            ? "bg-jp-yellow text-jp-blue-deep"
            : "text-white/60 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </Link>

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-jp-blue-deep px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          >
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-jp-blue-deep" />
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r border-jp-blue-deep bg-jp-blue-deep py-4 lg:flex">
      <Link
        href="/"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-jp-yellow text-jp-blue-deep transition-transform duration-200 hover:scale-105"
        aria-label="Admin JP — Início"
      >
        <ShieldCheck className="h-5 w-5" />
      </Link>

      <RailLink href="/" label="Início" icon={Home} active={pathname === "/"} />

      {navSections.map((section, i) => (
        <div key={section.title} className="flex flex-col items-center gap-1">
          <div className="my-2 h-px w-6 bg-white/10" aria-hidden="true" />
          {section.items.map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>
      ))}
    </aside>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          pathname === "/"
            ? "bg-jp-blue text-white"
            : "text-jp-ink hover:bg-jp-blue-tint",
        )}
      >
        <Home className="h-4 w-4" />
        Início
      </Link>

      {navSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-2.5 font-display text-[10px] uppercase tracking-wider text-jp-ink-soft">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-jp-blue text-white"
                      : "text-jp-ink hover:bg-jp-blue-tint",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: barra estreita, só ícones, com tooltip suave ao passar o rato */}
      <DesktopRail />

      {/* Mobile: sem "hover", por isso mantém-se o menu completo com etiquetas */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-jp-line bg-white shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-jp-ink" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-jp-blue-deep/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-jp-line px-5 py-4">
                <span className="font-headline text-sm text-jp-ink">Admin JP</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-jp-blue-tint"
                >
                  <X className="h-4 w-4 text-jp-ink" />
                </button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
