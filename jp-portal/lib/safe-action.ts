import { createSafeActionClient } from "next-safe-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { canPublishScoped, canPublishScope } from "@/lib/roles";

export class ActionError extends Error {}

const moderatorRoles = ["cpn", "moderador_nacional", "moderador_distrital", "moderador_concelhio"];

export const baseClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) return error.message;
    console.error("Erro não tratado numa server action do Portal:", error);
    return "Ocorreu um erro inesperado. Tenta novamente.";
  },
});

export const authenticatedActionClient = baseClient.use(async ({ next }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ActionError("Sessão expirada. Inicia sessão novamente.");
  }

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile) {
    throw new ActionError("Não foi possível carregar o teu perfil. Tenta novamente.");
  }

  return next({ ctx: { profile, supabase } });
});

// bloqueia quem está silenciado/suspenso/banido de criar conteúdo —
// a garantia definitiva continua a ser o RLS (policies *_insert_not_restricted),
// isto é só feedback de UX mais claro do que um erro genérico de RLS
export const contentActionClient = authenticatedActionClient.use(async ({ next, ctx }) => {
  const { data: restriction } = await ctx.supabase
    .from("moderation_actions")
    .select("action, expires_at")
    .eq("target_profile_id", ctx.profile.id)
    .in("action", ["suspender", "ban_permanente"])
    .or("expires_at.is.null,expires_at.gt.now()")
    .maybeSingle();

  if (restriction) {
    throw new ActionError(
      restriction.action === "ban_permanente"
        ? "A tua conta está banida permanentemente."
        : "A tua conta está temporariamente suspensa e não pode publicar conteúdo.",
    );
  }

  return next({ ctx });
});

export function moderatorActionClient() {
  return authenticatedActionClient.use(async ({ next, ctx }) => {
    if (!moderatorRoles.includes(ctx.profile.role)) {
      throw new ActionError("Não tens permissão para executar esta ação.");
    }
    return next({ ctx });
  });
}

// Wiki e arquivo: só a CPN cria. Espelha a função SQL `portal_can_publish` — a RLS
// continua a ser a garantia final; isto dá uma mensagem clara em vez de um erro genérico.
export function publisherActionClient() {
  return authenticatedActionClient.use(async ({ next, ctx }) => {
    if (ctx.profile.role !== "cpn") {
      throw new ActionError("Só a Comissão Política Nacional pode criar este conteúdo.");
    }
    return next({ ctx });
  });
}

/**
 * Conteúdo com âmbito (mural, sondagens, documentos, categorias de fórum): CPN em
 * qualquer âmbito, distrital no seu distrito, concelhio na sua concelhia; o moderador
 * nacional não publica. Espelha `portal_can_publish_scope`. Devolve em `ctx.publisher`
 * o âmbito do utilizador para as actions validarem o alvo com `assertCanPublishScope`.
 */
export function scopedPublisherActionClient() {
  return contentActionClient.use(async ({ next, ctx }) => {
    if (!canPublishScoped(ctx.profile.role)) {
      throw new ActionError("Não tens permissão para publicar este conteúdo.");
    }
    const { data: own } = await ctx.supabase
      .from("portal_profiles")
      .select("district_id, concelhia_id")
      .eq("id", ctx.profile.id)
      .single();

    return next({
      ctx: {
        ...ctx,
        publisher: {
          role: ctx.profile.role,
          districtId: (own?.district_id as string | null) ?? null,
          concelhiaId: (own?.concelhia_id as string | null) ?? null,
        },
      },
    });
  });
}

export function assertCanPublishScope(
  publisher: { role: string; districtId: string | null; concelhiaId: string | null },
  segment: { scope: string; scopeDistrictId?: string | null; scopeConcelhiaId?: string | null },
) {
  const ok = canPublishScope(publisher, {
    scope: segment.scope,
    districtId: segment.scopeDistrictId ?? null,
    concelhiaId: segment.scopeConcelhiaId ?? null,
  });
  if (!ok) {
    throw new ActionError(
      segment.scope === "nacional"
        ? "Só a Comissão Política Nacional publica a nível nacional."
        : "Só podes publicar no teu próprio distrito ou concelhia.",
    );
  }
}
