"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const NOMES: Record<string, string> = {
  pt: "Português", en: "English", fr: "Français", de: "Deutsch", es: "Español",
  it: "Italiano", nl: "Nederlands", sv: "Svenska", da: "Dansk", fi: "Suomi",
  el: "Ελληνικά", pl: "Polski", cs: "Čeština", sk: "Slovenčina", hu: "Magyar",
  ro: "Română", bg: "Български", hr: "Hrvatski", sl: "Slovenščina", et: "Eesti",
  lv: "Latviešu", lt: "Lietuvių", mt: "Malti", ga: "Gaeilge",
};

export default function LanguageSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (locale: string) => {
    router.replace(pathname, { locale });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-all text-xs font-display"
        aria-label={`Mudar idioma (atual: ${current.toUpperCase()})`}
      >
        <Globe size={14} /> {current.toUpperCase()}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 glass-panel rounded-xl p-2 max-h-72 overflow-y-auto min-w-[160px] z-50">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-all ${l === current ? "text-jp-yellow" : "text-white/80"}`}
            >
              {NOMES[l] || l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
