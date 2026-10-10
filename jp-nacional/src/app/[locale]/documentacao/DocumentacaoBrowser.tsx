"use client";

import { useMemo, useState } from "react";
import { m } from "framer-motion";
import { FileText, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Documento = { titulo: string; categoria: string; data: string; ficheiro: string };
type Categoria = { id: string; label: string };

export default function DocumentacaoBrowser({
  categorias, documentos, searchPlaceholder,
}: { categorias: Categoria[]; documentos: Documento[]; searchPlaceholder: string }) {
  const [ativa, setAtiva] = useState<string>("todos");
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    return documentos.filter((d) => {
      const passaCategoria = ativa === "todos" || d.categoria === ativa;
      const passaQuery = d.titulo.toLowerCase().includes(query.toLowerCase());
      return passaCategoria && passaQuery;
    });
  }, [documentos, ativa, query]);

  return (
    <div>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-jp-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-jp-line bg-jp-blue-tint2 pl-11 pr-5 py-3.5 text-jp-ink placeholder:text-jp-ink-soft focus:outline-none focus:border-jp-blue"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[{ id: "todos", label: "Todos" }, ...categorias].map((c) => (
          <button
            key={c.id}
            onClick={() => setAtiva(c.id)}
            className={cn(
              "px-4 py-2 rounded-full font-display text-xs transition-all",
              ativa === c.id ? "bg-jp-blue text-white" : "bg-jp-blue-tint2 text-jp-blue-deep border border-jp-line hover:border-jp-blue/40"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtrados.length === 0 && (
          <p className="text-jp-ink-soft text-center py-10">Nenhum documento encontrado.</p>
        )}
        {filtrados.map((d, i) => (
          <m.a
            key={d.titulo}
            href={d.ficheiro}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.04 }}
            className="group flex items-center justify-between gap-4 bg-jp-blue-tint2 border border-jp-line rounded-xl px-5 py-4 hover:border-jp-blue/40 hover:shadow-md hover:shadow-jp-blue/10 transition-all"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-jp-blue/10 text-jp-blue flex items-center justify-center shrink-0 group-hover:bg-jp-blue group-hover:text-white transition-colors">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-jp-blue-deep truncate">{d.titulo}</p>
                <p className="text-xs text-jp-ink-soft">
                  {new Date(d.data).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <Download size={16} className="text-jp-ink-soft group-hover:text-jp-blue shrink-0 transition-colors" />
          </m.a>
        ))}
      </div>
    </div>
  );
}
