const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  importScripts: ["/push-sw.js"],
  runtimeCaching: [
    {
      // páginas de navegação: tenta rede primeiro (conteúdo fresco),
      // cai para cache se offline
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      // API/Server Actions: nunca cachear — dados têm de estar sempre atuais
      urlPattern: /\/api\/|\/_next\/static\/chunks\/pages\//,
      handler: "NetworkOnly",
    },
    {
      // assets estáticos (JS/CSS/fontes): cache agressivo, imutáveis por build
      urlPattern: /\.(?:js|css|woff2?)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // imagens: stale-while-revalidate — mostra a versão em cache
      // imediatamente, atualiza em segundo plano
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

module.exports = withPWA(nextConfig);
