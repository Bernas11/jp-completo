"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Calendar, MapPin, Users, Loader2, Check, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { rsvpEvent, cancelRsvp, deleteEvent, inviteToEvent } from "@/actions/events";

type Place = { id: string; name: string };

type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  attendeeCount: number;
  userConfirmed: boolean;
  canModerate: boolean;
};

function InviteDialog({
  eventId,
  eventTitle,
  districts,
  concelhias,
}: {
  eventId: string;
  eventTitle: string;
  districts: Place[];
  concelhias: Place[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"concelhia" | "distrito">("concelhia");
  const [targetId, setTargetId] = useState("");

  const invite = useAction(inviteToEvent, {
    onSuccess: () => {
      setOpen(false);
      setTargetId("");
    },
  });

  const options = kind === "concelhia" ? concelhias : districts;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Send className="mr-1.5 h-4 w-4" /> Convidar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para &ldquo;{eventTitle}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === "concelhia" ? "default" : "outline"}
              onClick={() => {
                setKind("concelhia");
                setTargetId("");
              }}
            >
              Concelhia
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === "distrito" ? "default" : "outline"}
              onClick={() => {
                setKind("distrito");
                setTargetId("");
              }}
            >
              Distrito
            </Button>
          </div>
          <select
            className="w-full rounded-lg border border-jp-line bg-background px-3 py-2 text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Escolhe {kind === "concelhia" ? "uma concelhia" : "um distrito"}...</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {invite.result.serverError && (
            <p className="text-sm text-red-600">{invite.result.serverError}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!targetId || invite.isExecuting}
            onClick={() =>
              invite.execute({
                eventId,
                invitedConcelhiaId: kind === "concelhia" ? targetId : null,
                invitedDistrictId: kind === "distrito" ? targetId : null,
              })
            }
          >
            {invite.isExecuting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({
  event,
  districts,
  concelhias,
}: {
  event: Event;
  districts: Place[];
  concelhias: Place[];
}) {
  const rsvp = useAction(rsvpEvent);
  const cancel = useAction(cancelRsvp);
  const remove = useAction(deleteEvent);
  const busy = rsvp.isExecuting || cancel.isExecuting;

  return (
    <div className="surface-card space-y-2 rounded-2xl border border-jp-line p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-jp-ink dark:text-white">{event.title}</p>
        {event.canModerate && (
          <div className="flex shrink-0 items-center gap-1">
            <InviteDialog
              eventId={event.id}
              eventTitle={event.title}
              districts={districts}
              concelhias={concelhias}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              disabled={remove.isExecuting}
              onClick={() => {
                if (confirm("Apagar este evento?")) remove.execute({ eventId: event.id });
              }}
            >
              {remove.isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(event.startsAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {event.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {event.attendeeCount} confirmados
        </span>
      </div>
      {event.userConfirmed ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => cancel.execute({ eventId: event.id })}
        >
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
          Presença confirmada — cancelar
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={() => rsvp.execute({ eventId: event.id })}>
          {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Confirmar presença
        </Button>
      )}
    </div>
  );
}

export function EventsList({
  events,
  districts = [],
  concelhias = [],
}: {
  events: Event[];
  districts?: Place[];
  concelhias?: Place[];
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sem eventos agendados"
        description="Assim que houver novas iniciativas, vais vê-las aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} districts={districts} concelhias={concelhias} />
      ))}
    </div>
  );
}
