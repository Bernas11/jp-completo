"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { baseClient, ActionError } from "@/lib/safe-action";
import { magicLinkLimiter, getClientIp } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestMagicLinkSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url(),
});

/**
 * Pede o magic link de acesso ao Portal.
 *
 * Corre no servidor (não no browser) precisamente para poder aplicar
 * rate limiting por IP antes de chamar o Supabase Auth — sem isto o
 * endpoint fica aberto a abuso e a enumeração de emails.
 */
export const requestMagicLink = baseClient
  .schema(requestMagicLinkSchema)
  .action(async ({ parsedInput }) => {
    const headersList = await headers();
    const ip = getClientIp(headersList);

    const { success } = await magicLinkLimiter.limit(ip);
    if (!success) {
      throw new ActionError(
        "Demasiados pedidos a partir deste acesso. Tenta novamente daqui a alguns minutos.",
      );
    }

    // Cliente ligado às cookies do Next (não o createClient simples do
    // @supabase/supabase-js) — é isto que faz o code_verifier do PKCE
    // ser escrito como cookie HttpOnly real na resposta desta Server
    // Action, chegando ao browser do utilizador. Sem isto, o
    // signInWithOtp gera o code_verifier mas não tem forma nenhuma de o
    // persistir onde o browser o vai buscar mais tarde — o
    // exchangeCodeForSession no /auth/callback nunca o encontra, e a
    // troca falha sempre, apesar do fluxo já estar corretamente em
    // PKCE (?code=, não #access_token).
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: parsedInput.email,
      options: { emailRedirectTo: parsedInput.redirectTo },
    });

    if (error) {
      throw new ActionError("Não foi possível enviar o link. Tenta novamente.");
    }

    return { sent: true };
  });

/**
 * Termina a sessão do utilizador.
 *
 * Server action simples (sem next-safe-action, não há input a validar
 * nem erros a traduzir) que limpa a sessão Supabase — e as cookies
 * associadas, via o cliente ligado às cookies do Next — e envia o
 * utilizador de volta para o login. Sem isto não existia nenhuma forma
 * de sair do Portal.
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
