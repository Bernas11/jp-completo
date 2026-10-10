"use client";

import { ReactNode } from "react";
import { useReveal } from "./useReveal";

/**
 * Animação de entrada ao scroll feita com IntersectionObserver + transições CSS (antes usava
 * framer-motion, que obrigava a descarregar e executar uma biblioteca grande no telemóvel).
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left";
}) {
  const [ref, visible] = useReveal<HTMLDivElement>("-80px");
  const hidden = direction === "left" ? "-translate-x-5" : "translate-y-5";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}s` : "0s" }}
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${hidden}`
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
