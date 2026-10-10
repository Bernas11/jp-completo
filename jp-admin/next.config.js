/** @type {import('next').NextConfig} */

// CSP: 'unsafe-inline' em script-src é necessário para o mecanismo de
// hidratação do Next.js App Router (não há forma de o evitar sem CSP
// baseada em nonce, que exige threading do nonce por todo o middleware/
// layouts — não implementado aqui; documentado como limitação conhecida,
// não escondido). 'unsafe-eval' não é necessário e fica de fora.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // aumentado para os 15MB já validados no upload de documentos
    // (Server Actions do Next.js limitam o corpo do pedido a 1MB por
    // omissão — sem isto, o upload de um documento real falharia com
    // "Body exceeded 1mb limit" antes sequer de chegar à action).
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
