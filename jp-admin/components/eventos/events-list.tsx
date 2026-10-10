"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Users, Trash2, MapPin, Calendar, Globe } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createEvent, deleteEvent, getEventAttendees, updateEvent } from "@/actions/events";
import { toggleEventPublic } from "@/actions/news";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  concelhia_id: string | null;
  concelhia_name: string | null;
  is_public: boolean;
  external_link?: string | null;
};

const eventFormSchema = z.object({
  title: z.string().min(3, "Título demasiado curto"),
  description: z.string().optional(),
  location: z.string().optional(),
  startsAt: z.string().min(1, "Indica a data/hora de início"),
  endsAt: z.string().optional(),
  externalLink: z.string().optional(),
});

export function EventsList({
  events,
  concelhias,
}: {
  events: EventRow[];
  concelhias: { id: string; name: string }[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [attendeesEventId, setAttendeesEventId] = useState<string | null>(null);
  const router = useRouter();

  const deleteAction = useAction(deleteEvent, { onSuccess: () => router.refresh() });
  const togglePublicAction = useAction(toggleEventPublic, { onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-headline text-2xl text-jp-ink">Eventos</p>
          <p className="mt-1 text-sm text-jp-ink-soft">Encontros, ações e iniciativas da Juventude Popular.</p>
        </div>
        <Button
          className="bg-jp-blue text-white hover:bg-jp-blue-deep"
          onClick={() => {
            setEditingEvent(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Ainda não há eventos criados"
          description="Cria o primeiro evento para começares a organizar a agenda."
        />
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div key={event.id} className="surface-card p-5">
            <p className="font-medium text-jp-ink">{event.title}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-jp-ink-soft">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(event.starts_at).toLocaleString("pt-PT")}
            </p>
            {event.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {event.location}
              </p>
            )}
            {event.concelhia_name && (
              <Badge variant="outline" className="mt-2 border-jp-line font-normal">
                {event.concelhia_name}
              </Badge>
            )}
            <div className="mt-2">
              <Badge
                variant={event.is_public ? "default" : "outline"}
                className={event.is_public ? "bg-jp-blue text-white" : "border-jp-line font-normal text-jp-ink-soft"}
              >
                <Globe className="h-3 w-3 mr-1" />
                {event.is_public ? "Visível no site público" : "Só interno"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={togglePublicAction.isExecuting}
                onClick={() =>
                  togglePublicAction.execute({ eventId: event.id, isPublic: !event.is_public })
                }
              >
                <Globe className="h-4 w-4 mr-1" />
                {event.is_public ? "Tornar interno" : "Publicar no site"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingEvent(event);
                  setFormOpen(true);
                }}
              >
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendeesEventId(event.id)}
              >
                <Users className="h-4 w-4 mr-1" /> Presenças
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                disabled={deleteAction.isExecuting}
                onClick={() => {
                  if (confirm(`Eliminar o evento "${event.title}"?`)) {
                    deleteAction.execute({ eventId: event.id });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        concelhias={concelhias}
      />

      <AttendeesDialog
        eventId={attendeesEventId}
        onClose={() => setAttendeesEventId(null)}
      />
    </div>
  );
}

function EventFormDialog({
  open,
  onOpenChange,
  event,
  concelhias,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRow | null;
  concelhias: { id: string; name: string }[];
}) {
  const router = useRouter();
  const createAction = useAction(createEvent, {
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });
  const updateAction = useAction(updateEvent, {
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });
  const isEditing = !!event;
  const action = isEditing ? updateAction : createAction;

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    values: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      location: event?.location ?? "",
      startsAt: event?.starts_at ? event.starts_at.slice(0, 16) : "",
      endsAt: event?.ends_at ? event.ends_at.slice(0, 16) : "",
      externalLink: event?.external_link ?? "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            {isEditing ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            const payload = {
              title: values.title,
              description: values.description || undefined,
              location: values.location || undefined,
              startsAt: new Date(values.startsAt).toISOString(),
              endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
              externalLink: values.externalLink || undefined,
            };
            if (isEditing) {
              updateAction.execute({ ...payload, eventId: event.id });
            } else {
              createAction.execute(payload);
            }
          })}
          className="space-y-4"
        >
          <Input placeholder="Título" {...form.register("title")} />
          <Textarea placeholder="Descrição" rows={3} {...form.register("description")} />
          <Input placeholder="Local" {...form.register("location")} />
          <Input placeholder="Link externo (opcional, ex: Instagram)" {...form.register("externalLink")} />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Início</label>
              <Input type="datetime-local" {...form.register("startsAt")} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Fim (opcional)</label>
              <Input type="datetime-local" {...form.register("endsAt")} />
            </div>
          </div>
          {action.result.serverError && (
            <p className="text-sm text-red-600">{action.result.serverError}</p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={action.isExecuting}
            >
              {action.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AttendeesDialog({ eventId, onClose }: { eventId: string | null; onClose: () => void }) {
  const attendeesAction = useAction(getEventAttendees);

  return (
    <Dialog
      open={!!eventId}
      onOpenChange={(open) => {
        if (!open) onClose();
        else if (eventId) attendeesAction.execute({ eventId });
      }}
    >
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            Presenças Confirmadas
          </DialogTitle>
        </DialogHeader>

        {attendeesAction.isExecuting && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-jp-blue" />
          </div>
        )}

        {attendeesAction.result.serverError && (
          <p className="text-sm text-red-600">{attendeesAction.result.serverError}</p>
        )}

        {attendeesAction.result.data && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {attendeesAction.result.data.attendees.length === 0 && (
              <p className="text-sm text-muted-foreground">Ainda ninguém confirmou presença.</p>
            )}
            {attendeesAction.result.data.attendees.map((attendee, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-jp-line px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{attendee.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {attendee.memberNumber ?? "Simpatizante"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(attendee.confirmedAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
