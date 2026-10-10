"use client";

import { useEffect } from "react";

export default function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Import dinâmico: o bundle do posthog-js só é descarregado quando o
    // browser estiver ocioso, para não competir com o conteúdo crítico
    // (LCP/TBT) no carregamento inicial da página.
    const init = async () => {
      const { default: posthog } = await import("posthog-js");
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(init, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(init, 2000);
    return () => clearTimeout(id);
  }, []);

  return null;
}
