"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";
import { signSyncPayload } from "@/lib/sync-signature";
import { flushSyncOutboxAfterResponse } from "@/lib/sync-outbox";

const eventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().max(300).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  concelhiaId: z.string().uuid().optional(),
  externalLink: z.string().url().optional().or(z.literal("")),
});

export const createEvent = roleProtectedActionClient("moderador_nacional")
  .schema(eventSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.endsAt && parsedInput.endsAt < parsedInput.startsAt) {
      throw new ActionError("A data de fim não pode ser anterior à data de início.");
    }

    const { data: event, error } = await ctx.supabase
      .from("events")
      .insert({
        title: parsedInput.title,
        description: parsedInput.description ?? null,
        location: parsedInput.location ?? null,
        starts_at: parsedInput.startsAt,
        ends_at: parsedInput.endsAt ?? null,
        concelhia_id: parsedInput.concelhiaId ?? null,
        external_link: parsedInput.externalLink || null,
        created_by_profile_id: ctx.profile.id,
      })
      .select("id")
      .single();

    if (error || !event) {
      throw new ActionError("Não foi possível criar o evento.");
    }

    // o trigger trg_enqueue_event_upserted já propaga ao Portal e ao site
    // público através do outbox — nada a fazer aqui além de revalidar.

    revalidatePath("/eventos");
    revalidatePath("/"); // agenda pública

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { eventId: event.id };
  });

const updateEventSchema = eventSchema.extend({ eventId: z.string().uuid() });

export const updateEvent = roleProtectedActionClient("moderador_nacional")
  .schema(updateEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.endsAt && parsedInput.endsAt < parsedInput.startsAt) {
      throw new ActionError("A data de fim não pode ser anterior à data de início.");
    }

    const { error } = await ctx.supabase
      .from("events")
      .update({
        title: parsedInput.title,
        description: parsedInput.description ?? null,
        location: parsedInput.location ?? null,
        starts_at: parsedInput.startsAt,
        ends_at: parsedInput.endsAt ?? null,
        concelhia_id: parsedInput.concelhiaId ?? null,
        external_link: parsedInput.externalLink || null,
      })
      .eq("id", parsedInput.eventId);

    if (error) {
      throw new ActionError("Não foi possível atualizar o evento.");
    }

    revalidatePath("/eventos");
    revalidatePath("/");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

const deleteEventSchema = z.object({ eventId: z.string().uuid() });

export const deleteEvent = roleProtectedActionClient("moderador_nacional")
  .schema(deleteEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("events").delete().eq("id", parsedInput.eventId);

    if (error) {
      throw new ActionError("Não foi possível eliminar o evento.");
    }

    revalidatePath("/eventos");
    revalidatePath("/");

    flushSyncOutboxAfterResponse(); // entrega já ao Portal (o cron diário é só rede de segurança)
    return { success: true as const };
  });

/* ------------------------------------------------------------------ */
/* LISTA DE PRESENÇAS — chamada assinada ao Portal (dados vivem lá)   */
/* ------------------------------------------------------------------ */

const getAttendeesSchema = z.object({ eventId: z.string().uuid() });

export const getEventAttendees = roleProtectedActionClient("moderador_nacional")
  .schema(getAttendeesSchema)
  .action(async ({ parsedInput }) => {
    const body = JSON.stringify({ eventId: parsedInput.eventId });
    const signature = await signSyncPayload(body);

    const response = await fetch(process.env.PORTAL_GET_ATTENDEES_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Signature": signature },
      body,
    });

    if (!response.ok) {
      throw new ActionError("Não foi possível obter a lista de presenças do Portal.");
    }

    const data = await response.json();
    return data as {
      attendees: {
        displayName: string;
        email: string;
        memberNumber: string | null;
        confirmedAt: string;
      }[];
    };
  });
