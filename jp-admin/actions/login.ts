"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { loginLimiter, getClientIp } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginResult =
  | { success: true; accessToken: string; refreshToken: string }
  | { success: false; error: string };

/**
 * Verifica as credenciais no servidor, antes de qualquer chamada direta
 * do browser ao Supabase — é aqui que o rate limiting é aplicado. Sem
 * isto, o endpoint de password fica exposto a força bruta ilimitada,
 * porque `signInWithPassword` chamado diretamente do cliente não passa
 * por nenhum código nosso.
 *
 * Devolve os tokens da sessão (não a estabelece aqui) — o browser ainda
 * precisa de uma sessão local ativa para o passo seguinte de MFA
 * (listFactors/challenge/verify correm no cliente). A sessão definitiva
 * só fica persistida a sério depois do MFA, via establishServerSession.
 */
export async function verifyCredentials(input: unknown): Promise<LoginResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos." };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);

  const { success: withinLimit } = await loginLimiter.limit(ip);
  if (!withinLimit) {
    return {
      success: false,
      error: "Demasiadas tentativas a partir deste acesso. Tenta novamente daqui a alguns minutos.",
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    return { success: false, error: "Email ou palavra-passe incorretos." };
  }

  return {
    success: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}
