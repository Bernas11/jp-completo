"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "./LanguageSwitcher";

type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export default function HeaderClient({ items, ctaLabel, locale }: { items: NavItem[]; ctaLabel: string; locale: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <m.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-jp-blue-deep/90 backdrop-blur-md shadow-lg shadow-black/10 py-3" : "bg-transparent py-5"
        )}
      >
        {scrolled && (
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-jp-yellow to-transparent opacity-70" />
        )}
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <Link href="/" aria-label="Juventude Popular — página inicial" className="leading-none transition-transform hover:scale-[1.03]">
            <Image src="/brand/logo-full-transparent.png" alt="Juventude Popular" width={281} height={158} className="h-16 sm:h-20 w-auto" priority />
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegação principal">
            {items.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setDropdown(item.label)}
                  onMouseLeave={() => setDropdown(null)}
                >
                  <button className="px-3 py-2 rounded-lg font-display text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1">
                    {item.label}
                    <ChevronDown size={12} className={cn("transition-transform", dropdown === item.label && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {dropdown === item.label && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2 min-w-[220px]"
                      >
                        <div className="glass-panel rounded-xl p-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-lg font-display text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} />
            <Link
              href="/aderir"
              className="hidden md:flex group items-center gap-1.5 pl-5 pr-4 py-2.5 rounded-full bg-jp-yellow text-jp-blue-deep font-display text-xs hover:shadow-[0_0_24px_2px_rgba(253,224,33,0.35)] transition-shadow"
            >
              {ctaLabel}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </m.header>

      <AnimatePresence>
        {open && (
          <>
            <m.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <m.nav
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[90vw] bg-jp-blue-deep flex flex-col"
              aria-label="Menu mobile"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <Image src="/brand/logo-full-transparent.png" alt="Juventude Popular" width={281} height={158} className="h-10 w-auto" />
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors" aria-label="Fechar menu">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {items.map((item, i) =>
                  item.children ? (
                    <m.div key={item.label} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }} className="mb-1">
                      <p className="px-4 pt-3 pb-1 font-display text-[11px] text-jp-yellow">{item.label}</p>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </m.div>
                  ) : (
                    <m.div key={item.href} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}>
                      <Link href={item.href} onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all font-medium">
                        {item.label}
                      </Link>
                    </m.div>
                  )
                )}
                <m.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: items.length * 0.06 }} className="pt-3">
                  <Link href="/aderir" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-jp-yellow text-jp-blue-deep font-display text-xs">
                    {ctaLabel} <ArrowRight size={14} />
                  </Link>
                </m.div>
              </div>
            </m.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
