/**
 * Demonstração pública: por omissão não recolhe dados nem inicia transações.
 * Para um ambiente oficialmente operado, a equipa responsável tem de optar
 * explicitamente por NEXT_PUBLIC_DEMO_MODE=false.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

/** A loja só fica disponível fora do modo demo e com opt-in explícito. */
export const SHOP_ENABLED =
  !DEMO_MODE && process.env.NEXT_PUBLIC_SHOP_ENABLED === "true";
