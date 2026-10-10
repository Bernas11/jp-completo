/**
 * Interruptor da loja online (merch). LIGADO por omissão; para a desligar de imediato
 * (menu, páginas e checkout) define NEXT_PUBLIC_SHOP_ENABLED=false e faz novo deploy.
 */
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED !== "false";
