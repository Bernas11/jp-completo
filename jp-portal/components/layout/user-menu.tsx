"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  displayName: string;
  roleLabel: string;
  isModerator: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ displayName, roleLabel, isModerator }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu de utilizador"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-jp-blue text-xs font-semibold text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-yellow"
      >
        {initials(displayName) || <User className="h-4 w-4" />}
      </button>

      <div
        role="menu"
        className={cn(
          "absolute right-0 top-11 z-20 w-56 origin-top-right rounded-xl border border-jp-line bg-white p-1 shadow-lg transition-all dark:bg-jp-blue-deep",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="border-b border-jp-line px-3 py-2 dark:border-jp-blue-mid">
          <p className="truncate text-sm font-medium text-jp-ink dark:text-white">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>

        <Link
          href="/perfil"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-jp-ink hover:bg-jp-blue/5 dark:text-white dark:hover:bg-white/5"
        >
          <User className="h-4 w-4" />
          O meu perfil
        </Link>

        {isModerator && (
          <Link
            href="/moderacao"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-jp-ink hover:bg-jp-blue/5 dark:text-white dark:hover:bg-white/5"
          >
            <ShieldCheck className="h-4 w-4" />
            Moderação
          </Link>
        )}

        <form action={signOut}>
          <button
            type="submit"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </button>
        </form>
      </div>
    </div>
  );
}
