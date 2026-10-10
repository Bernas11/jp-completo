"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createEvent } from "@/actions/events";

type NamedRef = { id: string; name: string } | null;
type EventType = "geral" | "conselho_nacional" | "congresso_nacional";

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  geral: "Evento geral",
  conselho_nacional: "Conselho Nacional",
  congresso_nacional: "Congresso Nacional",
};

export function CreateEventDialog({
  role,
  ownConcelhia,
  ownDistrict,
  districts,
  concelhias,
  grantedEventTypes,
}: {
  role: string;
  ownConcelhia: NamedRef;
  ownDistrict: NamedRef;
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
  grantedEventTypes: string[];
}) {
  const isCpn = role === "cpn";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [cpnScope, setCpnScope] = useState<"nacional" | "distrital" | "concelhia">("nacional");
  const [cpnDistrictId, setCpnDistrictId] = useState("");
  const [cpnConcelhiaId, setCpnConcelhiaId] = useState("");
  const [eventType, setEventType] = useState<EventType>("geral");

  const router = useRouter();
  const action = useAction(createEvent, {
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setEndsAt("");
      setEventType("geral");
      router.refresh();
    },
  });

  const availableEventTypes: EventType[] = isCpn
    ? ["geral", "conselho_nacional", "congresso_nacional"]
    : (["geral", ...grantedEventTypes] as EventType[]);

  function buildSegment() {
    if (isCpn) {
      if (cpnScope === "nacional") return { concelhiaId: null, districtId: null, eventType };
      if (cpnScope === "distrital") return { concelhiaId: null, districtId: cpnDistrictId || null, eventType: "geral" as EventType };
      return { concelhiaId: cpnConcelhiaId || null, districtId: null, eventType: "geral" as EventType };
    }
    if (role === "moderador_concelhio") return { concelhiaId: ownConcelhia?.id ?? null, districtId: null, eventType };
    if (role === "moderador_distrital") return { concelhiaId: null, districtId: ownDistrict?.id ?? null, eventType };
    // moderador_nacional
    return { concelhiaId: null, districtId: null, eventType: "geral" as EventType };
  }

  const segment = buildSegment();
  const canSubmit =
    title.trim().length >= 3 &&
    !!startsAt &&
    (!isCpn || cpnScope !== "distrital" || !!cpnDistrictId) &&
    (!isCpn || cpnScope !== "concelhia" || !!cpnConcelhiaId);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Novo evento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">Novo Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            <Textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Input placeholder="Local (opcional)" value={location} onChange={(e) => setLocation(e.target.value)} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Início</label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Fim (opcional)</label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            {isCpn ? (
              <div className="space-y-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Âmbito</label>
                <select
                  value={cpnScope}
                  onChange={(e) => setCpnScope(e.target.value as typeof cpnScope)}
                  className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm"
                >
                  <option value="nacional">Nacional</option>
                  <option value="distrital">Distrital</option>
                  <option value="concelhia">Concelhia</option>
                </select>

                {cpnScope === "distrital" && (
                  <select
                    value={cpnDistrictId}
                    onChange={(e) => setCpnDistrictId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm"
                  >
                    <option value="">Escolhe um distrito…</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}

                {cpnScope === "concelhia" && (
                  <select
                    value={cpnConcelhiaId}
                    onChange={(e) => setCpnConcelhiaId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm"
                  >
                    <option value="">Escolhe uma concelhia…</option>
                    {concelhias.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}

                {cpnScope === "nacional" && (
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm"
                  >
                    {availableEventTypes.map((t) => (
                      <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="rounded-lg border border-jp-line bg-jp-blue-tint/40 px-3 py-2 text-sm text-jp-blue-deep">
                  Âmbito:{" "}
                  {role === "moderador_concelhio" && `Concelhia — ${ownConcelhia?.name ?? "a tua concelhia"}`}
                  {role === "moderador_distrital" && `Distrital — ${ownDistrict?.name ?? "o teu distrito"}`}
                  {role === "moderador_nacional" && "Nacional (geral)"}
                </p>
                {availableEventTypes.length > 1 && (
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm"
                  >
                    {availableEventTypes.map((t) => (
                      <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}

            <DialogFooter>
              <Button
                disabled={!canSubmit || action.isExecuting}
                onClick={() =>
                  action.execute({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    location: location.trim() || undefined,
                    startsAt: new Date(startsAt).toISOString(),
                    endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
                    segment,
                  })
                }
              >
                {action.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar evento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
