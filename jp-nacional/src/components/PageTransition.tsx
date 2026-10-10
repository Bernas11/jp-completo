/**
 * Antes: AnimatePresence/motion do framer-motion envolvia TODO o site (JS extra em todas as
 * páginas). Agora é um simples wrapper com um fade CSS de entrada, sem JavaScript.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
