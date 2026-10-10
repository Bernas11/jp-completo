"use server";

import { revalidatePath } from "next/cache";
import { authenticatedActionClient, ActionError } from "@/lib/safe-action";
import {
  cancelRsvpSchema,
  createEventGrantSchema,
  createEventSchema,
  deleteEventSchema,
  inviteToEventSchema,
  respondToEventInvitationSchema,
  revokeEventGrantSchema,
  rsvpEventSchema,
} from "@/lib/validations/events";

export const rsvpEvent = authenticatedActionClient
  .schema(rsvpEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_event_rsvps")
      .insert({ event_id: parsedInput.eventId, profile_id: ctx.profile.id });

    if (error && !error.message.includes("duplicate")) {
      throw new ActionError("Não foi possível confirmar presença.");
    }

    revalidatePath("/eventos");
    return { success: true as const };
  });

export const cancelRsvp = authenticatedActionClient
  .schema(cancelRsvpSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("portal_event_rsvps")
      .delete()
      .eq("event_id", parsedInput.eventId)
      .eq("profile_id", ctx.profile.id);

    if (error) throw new ActionError("Não foi possível cancelar a presença.");

    revalidatePath("/eventos");
    return { success: true as const };
  });

export const createEvent = authenticatedActionClient
  .schema(createEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("portal_events").insert({
      title: parsedInput.title,
      description: parsedInput.description ?? null,
      location: parsedInput.location ?? null,
      starts_at: parsedInput.startsAt,
      ends_at: parsedInput.endsAt ?? null,
      concelhia_id: parsedInput.segment.concelhiaId,
      district_id: parsedInput.segment.districtId,
      event_type: parsedInput.segment.eventType,
    });

    if (error) {
      throw new ActionError(
        "Não foi possível criar o evento. Confirma que tens permissão para este âmbito/tipo de evento.",
      );
    }

    revalidatePath("/eventos");
    return { success: true as const };
  });

export const deleteEvent = authenticatedActionClient
  .schema(deleteEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("portal_events").delete().eq("id", parsedInput.eventId);
    if (error) throw new ActionError("Não foi possível remover o evento.");

    revalidatePath("/eventos");
    return { success: true as const };
  });

export const inviteToEvent = authenticatedActionClient
  .schema(inviteToEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("event_invitations").insert({
      event_id: parsedInput.eventId,
      invited_concelhia_id: parsedInput.invitedConcelhiaId,
      invited_district_id: parsedInput.invitedDistrictId,
      invited_by_profile_id: ctx.profile.id,
    });

    if (error) throw new ActionError("Não foi possível enviar o convite.");

    revalidatePath("/eventos");
    return { success: true as const };
  });

export const createEventGrant = authenticatedActionClient
  .schema(createEventGrantSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.profile.role !== "cpn") {
      throw new ActionError("Só a CPN pode delegar permissões de eventos.");
    }

    const { error } = await ctx.supabase.from("event_permission_grants").insert({
      grantee_concelhia_id: parsedInput.concelhiaId,
      grantee_district_id: parsedInput.districtId,
      event_type: parsedInput.eventType,
      granted_by_profile_id: ctx.profile.id,
    });

    if (error) throw new ActionError("Não foi possível criar a delegação.");

    revalidatePath("/moderacao");
    return { success: true as const };
  });

export const revokeEventGrant = authenticatedActionClient
  .schema(revokeEventGrantSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.profile.role !== "cpn") {
      throw new ActionError("Só a CPN pode revogar permissões de eventos.");
    }

    const { error } = await ctx.supabase
      .from("event_permission_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", parsedInput.grantId);

    if (error) throw new ActionError("Não foi possível revogar a delegação.");

    revalidatePath("/moderacao");
    return { success: true as const };
  });

export const respondToEventInvitation = authenticatedActionClient
  .schema(respondToEventInvitationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("event_invitations")
      .update({
        status: parsedInput.accept ? "aceite" : "recusado",
        responded_by_profile_id: ctx.profile.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", parsedInput.invitationId);

    if (error) throw new ActionError("Não foi possível responder ao convite.");

    revalidatePath("/eventos");
    return { success: true as const };
  });
