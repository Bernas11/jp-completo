"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import concelhosOficiais from "@/lib/concelhos-oficiais.json";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

/* O mapa público (jp-nacional / MunicipiosMap.tsx) associa concelhias a
 * municípios comparando `concelhias.name` (em minúsculas) com a propriedade
 * "concelho" do GeoJSON oficial — não existem coordenadas nem seleção manual
 * no mapa. CAUSA RAIZ do item 4: como o campo "Nome da concelhia" era texto
 * livre, sem validação, qualquer variação de grafia (acento em falta,
 * abreviatura, espaço a mais) cria uma concelhia que parece guardar/ativar
 * sem erro no Admin, mas nunca corresponde a nenhum polígono no mapa —
 * silenciosamente nunca aparece como ativa. A validação abaixo impede que
 * isso aconteça, comparando sempre contra a lista oficial dos 278 municípios
 * usada no GeoJSON. */
const municipiosValidosSet = new Set(
  (concelhosOficiais as string[]).map((n) => n.toLowerCase()),
);

function validarNomeMunicipio(name: string) {
  if (!municipiosValidosSet.has(name.trim().toLowerCase())) {
    throw new ActionError(
      `"${name}" não corresponde a nenhum município oficial reconhecido pelo mapa. Escolhe um nome da lista de municípios para garantir que a concelhia aparece corretamente ativada no mapa público.`,
    );
  }
}

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ------------------------------------------------------------------ */
/* CRIAR                                                              */
/* ------------------------------------------------------------------ */

const createConcelhiaSchema = z.object({
  name: z.string().min(2).max(120),
  districtId: z.string().uuid(),
});

export const createConcelhia = roleProtectedActionClient("administrador")
  .schema(createConcelhiaSchema)
  .action(async ({ parsedInput, ctx }) => {
    validarNomeMunicipio(parsedInput.name);

    const slug = slugify(parsedInput.name);

    const { data: existing } = await ctx.supabase
      .from("concelhias")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      throw new ActionError("Já existe uma concelhia com um nome muito semelhante.");
    }

    const { data: concelhia, error } = await ctx.supabase
      .from("concelhias")
      .insert({
        name: parsedInput.name,
        slug,
        district_id: parsedInput.districtId,
        active: false,
        // email institucional padrão: <concelhia sem hífenes>@juventudepopular.pt
        // (ex.: vagos@juventudepopular.pt, aguiardabeira@juventudepopular.pt)
        contact_email: `${slug.replace(/-/g, "")}@juventudepopular.pt`,
      })
      .select("id")
      .single();

    if (error || !concelhia) {
      throw new ActionError("Não foi possível criar a concelhia.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "concelhia",
      entity_id: concelhia.id,
      metadata: { name: parsedInput.name },
    });

    revalidatePath("/estrutura/concelhias");

    flushSyncOutboxAfterResponse();
    return { concelhiaId: concelhia.id };
  });

/* ------------------------------------------------------------------ */
/* EDITAR                                                             */
/* ------------------------------------------------------------------ */

const updateConcelhiaSchema = z.object({
  concelhiaId: z.string().uuid(),
  name: z.string().min(2).max(120),
});

export const updateConcelhia = roleProtectedActionClient("administrador")
  .schema(updateConcelhiaSchema)
  .action(async ({ parsedInput, ctx }) => {
    validarNomeMunicipio(parsedInput.name);

    const { error } = await ctx.supabase
      .from("concelhias")
      .update({ name: parsedInput.name, slug: slugify(parsedInput.name) })
      .eq("id", parsedInput.concelhiaId);

    if (error) {
      throw new ActionError("Não foi possível atualizar a concelhia.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "concelhia",
      entity_id: parsedInput.concelhiaId,
      metadata: { name: parsedInput.name },
    });

    revalidatePath("/estrutura/concelhias");

    flushSyncOutboxAfterResponse();
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* ATIVAR / DESATIVAR (mapa)                                          */
/* ------------------------------------------------------------------ */

const toggleConcelhiaActiveSchema = z.object({
  concelhiaId: z.string().uuid(),
  active: z.boolean(),
});

export const toggleConcelhiaActive = roleProtectedActionClient("administrador")
  .schema(toggleConcelhiaActiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.active) {
      // Uma concelhia existe e pode estar no mapa independentemente de ter moderador.
      const { data: concelhia } = await ctx.supabase
        .from("concelhias")
        .select("name")
        .eq("id", parsedInput.concelhiaId)
        .single();

      if (!concelhia) {
        throw new ActionError("Concelhia não encontrada.");
      }

      // defesa em profundidade: concelhias criadas antes desta validação
      // existir podem ter um nome que não corresponde a nenhum município
      // do GeoJSON do mapa público.
      if (concelhia.name && !municipiosValidosSet.has(concelhia.name.trim().toLowerCase())) {
        throw new ActionError(
          `O nome "${concelhia.name}" não corresponde a nenhum município do mapa público, por isso ativar esta concelhia não a fará aparecer no mapa. Corrige o nome (Renomear) para o nome oficial do município antes de ativar.`,
        );
      }
    }

    const { error } = await ctx.supabase
      .from("concelhias")
      .update({ active: parsedInput.active })
      .eq("id", parsedInput.concelhiaId);

    if (error) {
      throw new ActionError("Não foi possível alterar o estado da concelhia.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "concelhia",
      entity_id: parsedInput.concelhiaId,
      metadata: { active: parsedInput.active },
    });

    revalidatePath("/estrutura/concelhias");
    revalidatePath("/"); // mapa público reflete o estado

    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* ATRIBUIR MODERADOR                                                 */
/* ------------------------------------------------------------------ */

const assignModeratorSchema = z.object({
  concelhiaId: z.string().uuid(),
  moderatorProfileId: z.string().uuid().nullable(),
});

export const assignConcelhiaModerator = roleProtectedActionClient("administrador")
  .schema(assignModeratorSchema)
  .action(async ({ parsedInput, ctx }) => {
    // moderador atual, para lhe retirar o papel se for substituído ou removido
    const { data: current } = await ctx.supabase
      .from("concelhias")
      .select("moderator_profile_id, active")
      .eq("id", parsedInput.concelhiaId)
      .single();
    const previousModeratorId = current?.moderator_profile_id ?? null;

    if (parsedInput.moderatorProfileId) {
      const { data: candidate } = await ctx.supabase
        .from("profiles")
        .select("id, role")
        .eq("id", parsedInput.moderatorProfileId)
        .single();

      if (!candidate) {
        throw new ActionError("Perfil de moderador não encontrado.");
      }

      // promove automaticamente a moderador_concelhio se ainda não tiver
      // um papel de moderação igual ou superior
      if (candidate.role === "militante" || candidate.role === "simpatizante") {
        await ctx.supabase
          .from("profiles")
          .update({ role: "moderador_concelhio" })
          .eq("id", candidate.id);
      }
    }

    const { error } = await ctx.supabase
      .from("concelhias")
      .update({ moderator_profile_id: parsedInput.moderatorProfileId })
      .eq("id", parsedInput.concelhiaId);

    if (error) {
      throw new ActionError("Não foi possível atribuir o moderador.");
    }

    // o moderador anterior deixa de ter poderes de moderação/publicação (a menos que
    // ainda modere outra concelhia ou seja moderador distrital)
    if (previousModeratorId && previousModeratorId !== parsedInput.moderatorProfileId) {
      const { count: stillModerates } = await ctx.supabase
        .from("concelhias")
        .select("id", { count: "exact", head: true })
        .eq("moderator_profile_id", previousModeratorId);

      if (!stillModerates) {
        await ctx.supabase
          .from("profiles")
          .update({ role: "militante" })
          .eq("id", previousModeratorId)
          .eq("role", "moderador_concelhio");
      }
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "concelhia",
      entity_id: parsedInput.concelhiaId,
      metadata: { moderator_profile_id: parsedInput.moderatorProfileId },
    });

    revalidatePath("/estrutura/concelhias");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* ELIMINAR — só se não tiver militantes associados                   */
/* ------------------------------------------------------------------ */

const deleteConcelhiaSchema = z.object({
  concelhiaId: z.string().uuid(),
});

export const deleteConcelhia = roleProtectedActionClient("cpn")
  .schema(deleteConcelhiaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { count } = await ctx.supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("concelhia_id", parsedInput.concelhiaId);

    if (count && count > 0) {
      throw new ActionError(
        "Não é possível eliminar uma concelhia com militantes associados. Desativa-a em vez disso.",
      );
    }

    const { error } = await ctx.supabase
      .from("concelhias")
      .delete()
      .eq("id", parsedInput.concelhiaId);

    if (error) {
      throw new ActionError("Não foi possível eliminar a concelhia.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "delete",
      entity_type: "concelhia",
      entity_id: parsedInput.concelhiaId,
    });

    revalidatePath("/estrutura/concelhias");

    return { success: true as const };
  });
