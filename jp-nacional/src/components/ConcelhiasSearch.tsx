"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import RevealGrid from "@/components/RevealGrid";

type Concelhia = {
  nome: string;
  distrito: string;
  email: string | null;
  instagram: string | null;
};

type Props = {
  concelhias: Concelhia[];
  searchPlaceholder: string;
  searchClearLabel: string;
  noResultsTitle: string;
  noResultsHint: string;
  emptyInstagramLabel: string;
};

// Remove acentos e normaliza para comparação, para que "Sao Joao" encontre "São João".
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ConcelhiasSearch({
  concelhias,
  searchPlaceholder,
  searchClearLabel,
  noResultsTitle,
  noResultsHint,
  emptyInstagramLabel,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return concelhias;
    return concelhias.filter((c) => {
      const haystack = normalize(`${c.nome} ${c.distrito} ${c.email ?? ""}`);
      return haystack.includes(q);
    });
  }, [concelhias, query]);

  return (
    <>
      <div className="relative mb-8">
        <label htmlFor="procurar" className="sr-only">
          {searchPlaceholder}
        </label>
        <input
          id="procurar"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-jp-line bg-jp-blue-tint2 px-5 py-3.5 pr-11 text-jp-ink placeholder:text-jp-ink-soft focus:outline-none focus:border-jp-blue"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={searchClearLabel}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-jp-ink-soft hover:text-jp-blue transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-jp-line rounded-2xl">
          <p className="font-headline text-lg text-jp-blue-deep mb-1">{noResultsTitle}</p>
          <p className="text-sm text-jp-ink-soft">{noResultsHint.replace("{query}", query)}</p>
        </div>
      ) : (
        <RevealGrid
          items={filtered.map((c) => (
            <div
              key={c.nome}
              id={c.nome}
              className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-6 flex items-start justify-between gap-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-jp-blue/10 transition-all duration-300"
            >
              <div>
                <p className="font-display text-xs text-jp-blue mb-1">{c.distrito}</p>
                <h2 className="font-headline text-xl text-jp-blue-deep mb-3">{c.nome}</h2>
                <p className="text-sm text-jp-ink-soft break-words">{c.email}</p>
                <p className="text-sm text-jp-ink-soft">{c.instagram ?? emptyInstagramLabel}</p>
              </div>
              <span className="shrink-0 w-3 h-3 rounded-full bg-jp-yellow mt-1" aria-hidden="true" />
            </div>
          ))}
        />
      )}
    </>
  );
}
