"use client";

import { LazyMotion } from "framer-motion";

// O framer-motion só é descarregado quando algum componente que o usa (menu, separadores,
// formulário) está montado, e apenas com as features DOM básicas (~5× mais pequeno).
const loadFeatures = () => import("./motionFeatures").then((m) => m.default);

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
