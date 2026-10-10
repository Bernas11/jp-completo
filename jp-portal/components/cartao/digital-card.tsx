"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCw, Award } from "lucide-react";

type Badge = {
  earned_at: string;
  badge: { key: string; name: string; description: string; icon_url: string | null };
};

export function DigitalCard({
  displayName,
  memberNumber,
  concelhiaName,
  joinedAt,
  avatarUrl,
  badges,
  qrSvg,
}: {
  displayName: string;
  memberNumber: string;
  concelhiaName: string;
  joinedAt: string | null;
  avatarUrl: string | null;
  badges: Badge[];
  qrSvg: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="[perspective:1200px]">
        <motion.div
          className="relative h-56 w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Frente */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-jp-blue to-jp-blue-deep p-6 text-white shadow-lg [backface-visibility:hidden]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/70">
                  Cartão de Militante
                </p>
                <p className="mt-1 font-display text-lg uppercase">Juventude Popular</p>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white/20">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xl font-medium">{displayName}</p>
              <div className="mt-2 flex items-center justify-between text-sm text-white/80">
                <span>{concelhiaName}</span>
                <span className="font-mono tracking-wider">{memberNumber}</span>
              </div>
            </div>

            <p className="absolute bottom-4 right-6 text-[10px] text-white/60">
              Militante desde {joinedAt ? new Date(joinedAt).getFullYear() : "—"}
            </p>
          </div>

          {/* Verso */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-jp-line bg-white p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div
              className="[&_svg]:h-28 [&_svg]:w-28"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-xs text-muted-foreground">Verificação de autenticidade</p>
          </div>
        </motion.div>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="mx-auto flex items-center gap-2 text-sm text-jp-blue-mid hover:text-jp-blue-deep"
      >
        <RotateCw className="h-4 w-4" /> Ver código de verificação
      </button>

      {badges.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-display uppercase text-muted-foreground">
            Emblemas conquistados
          </p>
          <div className="flex flex-wrap gap-3">
            {badges.map(({ badge, earned_at }) => (
              <div
                key={badge.key}
                title={badge.description}
                className="flex flex-col items-center gap-1 rounded-xl border border-jp-line p-3 text-center"
              >
                <Award className="h-6 w-6 text-jp-yellow" />
                <span className="text-xs font-medium">{badge.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(earned_at).toLocaleDateString("pt-PT")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
