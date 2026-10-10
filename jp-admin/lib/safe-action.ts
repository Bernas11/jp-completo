import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class ActionError extends Error {}

const roleHierarchy = [
  "simpatizante",
  "militante",
  "moderador_concelhio",
  "moderador_distrital",
  "moderador_nacional",
  "administrador",
  "cpn",
] as const;

export type Role = (typeof roleHierarchy)[number];

function roleAtLeast(role: Role, minimum: Role): boolean {
  return roleHierarchy.indexOf(role) >= roleHierarchy.indexOf(minimum);
}

const baseClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) {
      return error.message;
    }
    return "Ocorreu um erro inesperado. Tenta novamente.";
  },
});

/**
 * Action client autenticado: garante que existe uma sessão válida e injeta
 * `profile` (id + role) no contexto. Todas as actions do Admin usam este
 * client ou o `roleProtectedActionClient` abaixo — nunca o baseClient direto.
 */
export const authenticatedActionClient = baseClient.use(async ({ next }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ActionError("Sessão expirada. Inicia sessão novamente.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new ActionError("Perfil não encontrado.");
  }

  return next({ ctx: { profile, supabase } });
});

/**
 * Gera um action client que exige um nível mínimo de role. A verificação
 * aqui é uma primeira barreira de UX — a segurança real e definitiva é
 * sempre imposta pelas policies RLS na base de dados.
 */
export function roleProtectedActionClient(minimumRole: Role) {
  return authenticatedActionClient.use(async ({ next, ctx }) => {
    if (!roleAtLeast(ctx.profile.role as Role, minimumRole)) {
      throw new ActionError("Não tens permissão para executar esta ação.");
    }
    return next({ ctx });
  });
}

export const zSchema = z; // re-export de conveniência para os ficheiros de actions
