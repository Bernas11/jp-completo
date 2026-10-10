import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * `Link`, `useRouter`, `usePathname`, `redirect` e `getPathname` com
 * conhecimento da língua atual — preservam sempre o prefixo /xx ao
 * navegar internamente. Usar em vez dos equivalentes de "next/link"
 * e "next/navigation" em qualquer link ou navegação dentro do site.
 */
export const { Link, useRouter, usePathname, redirect, getPathname } =
  createNavigation(routing);
