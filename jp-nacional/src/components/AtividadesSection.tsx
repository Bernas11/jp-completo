"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type Item = { titulo: string; data: string; href?: string; imagemUrl?: string };

export default function AtividadesSection({
  eyebrow, title, lede, noticias, eventos, emptyNoticias, emptyEventos,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  noticias: Item[];
  eventos: Item[];
  emptyNoticias: string;
  emptyEventos: string;
}) {
  const [tab, setTab] = useState<"noticias" | "eventos">("noticias");
  const lista = tab === "noticias" ? noticias : eventos;
  const emptyMessage = tab === "noticias" ? emptyNoticias : emptyEventos;

  return (
    <section id="atividades" className="py-28 bg-jp-blue-tint">
      <div className="mx-auto max-w-6xl px-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-xl mb-10"
        >
          <p className="font-display text-xs text-jp-blue mb-3">{eyebrow}</p>
          <h2 className="font-headline text-3xl md:text-4xl text-jp-blue-deep mb-4">{title}</h2>
          <p className="text-jp-ink-soft text-lg">{lede}</p>
        </m.div>

        <div className="flex gap-2 mb-8">
          {(["noticias", "eventos"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-5 py-2.5 rounded-full font-display text-xs transition-all",
                tab === id ? "bg-jp-blue text-white" : "bg-jp-blue-tint2 text-jp-blue-deep border border-jp-line hover:border-jp-blue/40"
              )}
            >
              {id === "noticias" ? "Notícias" : "Eventos"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {lista.length === 0 ? (
            <m.div
              key={`${tab}-empty`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center py-16 border border-dashed border-jp-line rounded-2xl"
            >
              <p className="text-jp-ink-soft">{emptyMessage}</p>
            </m.div>
          ) : (
            <m.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-3 gap-6"
            >
              {lista.map((item) => {
                const isExternal = item.href?.startsWith("http");
                const card = (
                  <div className="group bg-jp-blue-tint2 border border-jp-line rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-jp-blue/10 transition-all duration-300 h-full">
                    <div className="h-40 bg-gradient-to-br from-jp-blue-deep via-jp-blue to-jp-blue-mid relative overflow-hidden">
                      {item.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL arbitrária do Admin
                        <img src={item.imagemUrl} alt={item.titulo} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-jp-yellow/20 rotate-45" />
                      )}
                    </div>
                    <div className="p-6">
                      <p className="text-xs text-jp-blue font-display mb-2">{item.data}</p>
                      <h3 className="font-headline text-base text-jp-blue-deep">{item.titulo}</h3>
                    </div>
                  </div>
                );

                if (!item.href) {
                  return <div key={item.titulo}>{card}</div>;
                }

                return isExternal ? (
                  <a key={item.titulo} href={item.href} target="_blank" rel="noreferrer" className="block h-full">
                    {card}
                  </a>
                ) : (
                  <Link key={item.titulo} href={item.href} className="block h-full">
                    {card}
                  </Link>
                );
              })}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
