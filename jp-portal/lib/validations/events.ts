import { z } from "zod";

const eventTypeEnum = z.enum(["geral", "conselho_nacional", "congresso_nacional"]);

const segmentSchema = z
  .object({
    concelhiaId: z.string().uuid().nullable(),
    districtId: z.string().uuid().nullable(),
    eventType: eventTypeEnum,
  })
  .refine((value) => !(value.concelhiaId && value.districtId), {
    message: "Um evento tem concelhia OU distrito, nunca os dois.",
  });

export const rsvpEventSchema = z.object({ eventId: z.string().uuid() });

export const cancelRsvpSchema = z.object({ eventId: z.string().uuid() });

export const createEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  location: z.string().trim().max(200).optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  segment: segmentSchema,
});

export const deleteEventSchema = z.object({ eventId: z.string().uuid() });

export const inviteToEventSchema = z
  .object({
    eventId: z.string().uuid(),
    invitedConcelhiaId: z.string().uuid().nullable(),
    invitedDistrictId: z.string().uuid().nullable(),
  })
  .refine(
    (value) => !!value.invitedConcelhiaId !== !!value.invitedDistrictId,
    {
      message: "Convida uma concelhia OU um distrito, nunca os dois.",
    },
  );

export const createEventGrantSchema = z
  .object({
    concelhiaId: z.string().uuid().nullable(),
    districtId: z.string().uuid().nullable(),
    eventType: z.enum(["conselho_nacional", "congresso_nacional"]),
  })
  .refine((value) => !!value.concelhiaId !== !!value.districtId, {
    message: "Escolhe uma concelhia OU um distrito, nunca os dois.",
  });

export const revokeEventGrantSchema = z.object({ grantId: z.string().uuid() });

export const respondToEventInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  accept: z.boolean(),
});
