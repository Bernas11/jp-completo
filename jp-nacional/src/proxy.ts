import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Sem nonce por pedido: o nonce obrigava todas as páginas a renderizar dinamicamente (o layout
// tinha de ler o header). O site não injeta HTML de terceiros/utilizadores (o corpo das notícias
// é renderizado como texto), por isso `script-src 'self' 'unsafe-inline'` permite páginas
// estáticas/ISR (muito mais rápidas em mobile) sem abrir uma superfície real de XSS.
function buildCsp() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.supabase.co https://juventudepopular.pt",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://eu.i.posthog.com https://*.posthog.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export default function proxy(req: NextRequest) {
  const csp = buildCsp();

  const response = intlMiddleware(req);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Ignora ficheiros estáticos, _next, e a API
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
