export const MODERATOR_ROLES = [
  "cpn",
  "moderador_nacional",
  "moderador_distrital",
  "moderador_concelhio",
] as const;

const ROLE_LABELS: Record<string, string> = {
  cpn: "Comissão Política Nacional",
  moderador_nacional: "Moderador Nacional",
  moderador_distrital: "Moderador Distrital",
  moderador_concelhio: "Moderador Concelhio",
  militante: "Militante",
  simpatizante: "Simpatizante",
};

/** Nome humano para o estado de participação, nunca o valor técnico do enum. */
export function roleLabel(role: string | null | undefined) {
  return (role && ROLE_LABELS[role]) || "Membro da comunidade";
}

export function isModeratorRole(role: string | null | undefined) {
  return !!role && (MODERATOR_ROLES as readonly string[]).includes(role);
}

/**
 * Wiki e arquivo de congressos: só a CPN cria (conteúdo nacional, sem âmbito).
 * Espelha a função SQL `portal_can_publish`.
 */
export function canPublish(role: string | null | undefined) {
  return role === "cpn";
}

/**
 * Quem pode publicar conteúdo com âmbito (mural, sondagens, documentos, categorias
 * de fórum): a CPN em qualquer âmbito, o moderador distrital no seu distrito e o
 * concelhio na sua concelhia. O moderador nacional só modera — não publica.
 */
export function canPublishScoped(role: string | null | undefined) {
  return role === "cpn" || role === "moderador_distrital" || role === "moderador_concelhio";
}

/** Espelha a função SQL `portal_can_publish_scope`. */
export function canPublishScope(
  publisher: { role: string | null | undefined; districtId: string | null; concelhiaId: string | null },
  target: { scope: string; districtId: string | null; concelhiaId: string | null },
) {
  const role = publisher.role;
  if (role === "cpn") return true;
  if (role === "moderador_distrital") {
    return target.scope === "distrital" && !!publisher.districtId && publisher.districtId === target.districtId;
  }
  if (role === "moderador_concelhio") {
    return target.scope === "concelhia" && !!publisher.concelhiaId && publisher.concelhiaId === target.concelhiaId;
  }
  return false;
}

/**
 * Espelha a função SQL `portal_can_moderate_scope` usada nas RLS policies —
 * um moderador distrital só modera o seu próprio distrito, um concelhio só
 * a sua própria concelhia; o moderador nacional só o âmbito nacional; a CPN
 * modera qualquer âmbito. Mantém a UI (mostrar/esconder controlos de
 * moderação) alinhada com o que a base de dados vai realmente aceitar.
 */
/**
 * Espelha a função SQL `portal_can_moderate_event` — usada no servidor para
 * decidir, por evento, se se mostra o botão de editar/apagar (sem depender
 * só da RLS para dar feedback à UI).
 */
export function canModerateEvent(
  moderator: { role: string | null | undefined; ownConcelhiaId: string | null; ownDistrictId: string | null },
  target: { concelhiaId: string | null; districtId: string | null; eventType: string },
  grantedEventTypes: string[] = [],
) {
  const role = moderator.role;
  if (!role) return false;
  if (role === "cpn") return true;

  if (target.eventType !== "geral") {
    if (role === "moderador_concelhio" && target.concelhiaId && target.concelhiaId === moderator.ownConcelhiaId) {
      return grantedEventTypes.includes(target.eventType);
    }
    if (role === "moderador_distrital" && target.districtId && target.districtId === moderator.ownDistrictId) {
      return grantedEventTypes.includes(target.eventType);
    }
    return false;
  }

  if (target.concelhiaId && !target.districtId) {
    return role === "moderador_concelhio" && target.concelhiaId === moderator.ownConcelhiaId;
  }
  if (target.districtId && !target.concelhiaId) {
    return role === "moderador_distrital" && target.districtId === moderator.ownDistrictId;
  }
  if (!target.districtId && !target.concelhiaId) {
    return role === "moderador_nacional";
  }
  return false;
}

export function canModerateScope(
  moderator: { role: string | null | undefined; districtId: string | null; concelhiaId: string | null },
  target: { scope: string; districtId: string | null; concelhiaId: string | null },
) {
  const role = moderator.role;
  if (!role) return false;
  if (role === "cpn") return true;
  if (role === "moderador_nacional") return target.scope === "nacional";
  if (role === "moderador_distrital") {
    return target.scope === "distrital" && !!moderator.districtId && moderator.districtId === target.districtId;
  }
  if (role === "moderador_concelhio") {
    return (
      target.scope === "concelhia" && !!moderator.concelhiaId && moderator.concelhiaId === target.concelhiaId
    );
  }
  return false;
}
