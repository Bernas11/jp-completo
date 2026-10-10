"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronDown, UserCircle } from "lucide-react";
import { initials } from "@/lib/auth/format";

export function UserMenu({
  fullName,
  cargo,
  onLogout,
}: {
  fullName: string;
  cargo: string | null;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-jp-blue-tint"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-jp-blue text-xs font-semibold text-white">
          {initials(fullName || "?")}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-jp-ink">{fullName}</p>
          {cargo && <p className="text-xs leading-tight text-jp-ink-soft">{cargo}</p>}
        </div>
        <ChevronDown className="hidden h-4 w-4 text-jp-ink-soft sm:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-jp-line bg-white shadow-lg"
          >
            <div className="border-b border-jp-line px-4 py-3 sm:hidden">
              <p className="text-sm font-medium text-jp-ink">{fullName}</p>
              {cargo && <p className="text-xs text-jp-ink-soft">{cargo}</p>}
            </div>
            <Link
              href="/perfil"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-jp-ink hover:bg-jp-blue-tint"
              onClick={() => setOpen(false)}
            >
              <UserCircle className="h-4 w-4 text-jp-ink-soft" />
              Ver perfil
            </Link>
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await onLogout();
              }}
              className="flex w-full items-center gap-2.5 border-t border-jp-line px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "A terminar sessão…" : "Terminar sessão"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
