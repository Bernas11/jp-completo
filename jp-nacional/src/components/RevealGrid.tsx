"use client";

import { ReactNode } from "react";
import { useReveal } from "./useReveal";

function Item({ children, delay }: { children: ReactNode; delay: number }) {
  const [ref, visible] = useReveal<HTMLDivElement>("-60px");
  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}s` : "0s" }}
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </div>
  );
}

export default function RevealGrid({
  items,
  columns = "md:grid-cols-2",
}: {
  items: ReactNode[];
  columns?: string;
}) {
  return (
    <div className={`grid ${columns} gap-5`}>
      {items.map((item, i) => (
        <Item key={i} delay={Math.min(i * 0.08, 0.6)}>
          {item}
        </Item>
      ))}
    </div>
  );
}
