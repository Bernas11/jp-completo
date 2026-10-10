export default function CrowdIllustration({ className = "" }: { className?: string }) {
  // Silhuetas geométricas de uma multidão com bandeiras — ilustração original,
  // não uma fotografia, para dar presença humana ao hero sem qualquer
  // problema de direitos de imagem.
  const pessoas = Array.from({ length: 13 }).map((_, i) => {
    const x = i * 62;
    const alturaCabeca = 14 + (i % 3) * 2;
    const comBandeira = i % 3 === 0;
    return { x, alturaCabeca, comBandeira, id: i };
  });

  return (
    <svg
      viewBox="0 0 820 130"
      className={className}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {pessoas.map((p) => (
        <g key={p.id} transform={`translate(${p.x}, 0)`}>
          {/* Corpo */}
          <path
            d="M 20 130 L 20 90 Q 20 68 40 68 Q 60 68 60 90 L 60 130 Z"
            fill="currentColor"
            opacity="0.9"
          />
          {/* Cabeça */}
          <circle cx="40" cy={58 - p.alturaCabeca / 2} r={p.alturaCabeca} fill="currentColor" opacity="0.9" />
          {/* Braço levantado, com ou sem bandeira */}
          {p.comBandeira && (
            <>
              <path
                d="M 50 78 L 68 40"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path d="M 68 40 L 68 14 L 96 22 L 68 30 Z" className="fill-jp-yellow" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
