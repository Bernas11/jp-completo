"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import { CITACOES } from "@/lib/citacoes";

export default function VozesDaCasa() {
  const [i, setI] = useState(0);
  const t = useTranslations("vozes_da_casa");

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % CITACOES.length), 6500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative py-24 bg-jp-blue-deep text-white overflow-hidden">
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-20 w-[600px] h-[300px] rounded-full opacity-[0.12] blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #FDE021, transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <p className="font-display text-xs text-jp-yellow mb-8">{t("label")}</p>
        <Quote className="mx-auto mb-6 text-jp-yellow/40" size={36} aria-hidden="true" />

        <div className="min-h-[160px] sm:min-h-[130px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <m.figure
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5 }}
            >
              <blockquote className="font-headline text-xl sm:text-2xl leading-snug mb-5">
                “{CITACOES[i].texto}”
              </blockquote>
              <figcaption className="text-white/60 text-sm">
                <span className="text-jp-yellow font-semibold">{CITACOES[i].autor}</span>
                {CITACOES[i].cargo && <> · {CITACOES[i].cargo}</>}
              </figcaption>
            </m.figure>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {CITACOES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={t("aria_ver", { n: idx + 1 })}
              className="p-2.5 -m-2.5 flex items-center justify-center"
            >
              <span className={`h-1.5 rounded-full transition-all block ${idx === i ? "w-6 bg-jp-yellow" : "w-1.5 bg-white/25"}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
