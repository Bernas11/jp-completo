"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MunicipioPath } from "@/lib/municipios-map";

type ConcelhoAtivo = { concelho: string; distrito: string };

/* Substitui o antigo mapa leaflet (ver src/lib/municipios-map.ts para o
 * porquê). Os paths já vêm calculados do servidor — este componente só
 * trata do hover/click, é código mínimo e não descarrega nenhuma
 * biblioteca de mapas. */
export default function MunicipiosMap({
  paths,
  viewBox,
  ativos,
}: {
  paths: MunicipioPath[];
  viewBox: string;
  ativos: ConcelhoAtivo[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  const ativosSet = useMemo(() => new Set(ativos.map((a) => a.concelho.toLowerCase())), [ativos]);

  return (
    <div className="aspect-[4/5] sm:aspect-[4/3] rounded-2xl border border-jp-line overflow-hidden shadow-lg shadow-jp-blue/10 relative bg-[#E7EBFA]">
      <svg viewBox={viewBox} className="w-full h-full" role="img" aria-label="Mapa dos concelhos com concelhia da Juventude Popular">
        {paths.map((p) => {
          const key = p.concelho.toLowerCase();
          const ativo = ativosSet.has(key);
          const isHovered = hovered === key;
          return (
            <path
              key={p.concelho}
              d={p.d}
              fill={ativo ? "#FDE021" : "#24399E"}
              fillOpacity={ativo ? (isHovered ? 0.95 : 0.85) : isHovered ? 0.5 : 0.28}
              stroke="#0E1D6B"
              strokeWidth={isHovered ? 1.5 : 0.6}
              className="cursor-pointer transition-[fill-opacity,stroke-width] duration-150"
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (ativo) router.push(`/concelhias#${encodeURIComponent(p.concelho)}`);
              }}
            >
              <title>
                {p.concelho} — {p.distrito}
                {ativo ? " ✓ Concelhia ativa" : ""}
              </title>
            </path>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-jp-ink-soft flex items-center gap-3 pointer-events-none">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-jp-yellow inline-block" /> Concelhia ativa</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-jp-blue/30 inline-block" /> Por criar</span>
      </div>
    </div>
  );
}
