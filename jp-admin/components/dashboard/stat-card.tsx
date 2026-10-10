"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "light",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: "light" | "blue" | "yellow";
}) {
  const styles = {
    light: {
      card: "bg-white border-jp-line",
      blob: "bg-jp-blue-tint2",
      iconWrap: "bg-jp-blue text-white",
      value: "text-jp-ink",
      title: "text-jp-ink-soft",
      hint: "text-jp-ink-soft/80",
    },
    blue: {
      card: "bg-jp-blue-deep border-jp-blue-deep",
      blob: "bg-white/10",
      iconWrap: "bg-jp-yellow text-jp-blue-deep",
      value: "text-white",
      title: "text-white/70",
      hint: "text-white/50",
    },
    yellow: {
      card: "bg-jp-yellow border-jp-yellow",
      blob: "bg-white/40",
      iconWrap: "bg-jp-blue-deep text-jp-yellow",
      value: "text-jp-blue-deep",
      title: "text-jp-blue-deep/70",
      hint: "text-jp-blue-deep/60",
    },
  }[tone];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${styles.card}`}
    >
      {/* mancha decorativa, como na referência */}
      <div className={`absolute -right-6 -top-8 h-28 w-28 rounded-full ${styles.blob}`} />
      <div className={`absolute -right-2 top-10 h-16 w-16 rotate-12 rounded-2xl ${styles.blob}`} />

      <div className="relative">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.iconWrap}`}>
          {icon}
        </div>
        <p className={`mt-5 text-2xl font-semibold leading-none ${styles.value}`}>{value}</p>
        <p className={`mt-2 text-sm font-medium ${styles.title}`}>{title}</p>
        {hint && <p className={`mt-0.5 text-xs ${styles.hint}`}>{hint}</p>}
      </div>
    </motion.div>
  );
}

