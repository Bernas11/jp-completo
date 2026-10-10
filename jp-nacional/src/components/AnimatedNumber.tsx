"use client";

import { useEffect, useState } from "react";
import { useReveal } from "./useReveal";

/**
 * Conta de 0 até `value` quando entra no ecrã (IntersectionObserver + requestAnimationFrame;
 * antes usava framer-motion). Se `value` não for puramente numérico (ex.: "XXVII"), mostra-o
 * direto sem animar.
 */
export default function AnimatedNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [ref, inView] = useReveal<HTMLSpanElement>("-40px");
  const numeric = parseInt(value.replace(/\D/g, ""), 10);
  const isNumeric = !Number.isNaN(numeric) && /^\d+\+?$/.test(value);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || !isNumeric) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(numeric);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(numeric * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, isNumeric, numeric]);

  if (!isNumeric) return <span ref={ref}>{value}</span>;

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
