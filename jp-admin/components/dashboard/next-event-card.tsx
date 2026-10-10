import { CalendarDays, MapPin } from "lucide-react";

type NextEvent = { title: string; starts_at: string; location: string | null } | null;

export function NextEventCard({ event }: { event: NextEvent }) {
  return (
    <div className="relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-jp-blue bg-jp-blue-tint2 p-6">
      <div className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-jp-blue/10" />
      <div className="absolute -right-2 -bottom-2 h-20 w-20 rotate-12 rounded-2xl bg-jp-yellow/40" />

      <div className="relative flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-jp-blue" />
        <p className="font-headline text-base text-jp-blue-deep">Próximo evento</p>
      </div>

      <div className="relative">
        {event ? (
          <>
            <p className="font-headline text-lg text-jp-blue-deep">{event.title}</p>
            <p className="mt-1 text-sm text-jp-ink-soft">
              {new Date(event.starts_at).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            {event.location && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-jp-ink-soft">
                <MapPin className="h-3.5 w-3.5" /> {event.location}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-jp-ink-soft">Ainda não há eventos agendados.</p>
        )}
      </div>
    </div>
  );
}
