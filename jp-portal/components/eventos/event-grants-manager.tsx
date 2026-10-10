"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEventGrant, revokeEventGrant } from "@/actions/events";

type Grant = {
  id: string;
  eventType: "conselho_nacional" | "congresso_nacional";
  concelhiaName: string | null;
  districtName: string | null;
};

const EVENT_TYPE_LABEL = {
  conselho_nacional: "Conselho Nacional",
  congresso_nacional: "Congresso Nacional",
};

export function EventGrantsManager({
  grants,
  districts,
  concelhias,
}: {
  grants: Grant[];
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
}) {
  const [granteeType, setGranteeType] = useState<"concelhia" | "distrital">("concelhia");
  const [granteeId, setGranteeId] = useState("");
  const [eventType, setEventType] = useState<"conselho_nacional" | "congresso_nacional">("conselho_nacional");

  const router = useRouter();
  const create = useAction(createEventGrant, {
    onSuccess: () => {
      setGranteeId("");
      router.refresh();
    },
  });
  const revoke = useAction(revokeEventGrant, { onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <h2 className="font-display uppercase text-lg text-jp-blue-deep">
        Delegações de Eventos (Conselho/Congresso Nacional)
      </h2>
      <p className="text-sm text-muted-foreground">
        Por omissão, só a CPN pode criar Conselhos e Congressos Nacionais. Aqui podes autorizar
        uma concelhia ou distrito específico a organizar um destes eventos.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={granteeType}
          onChange={(e) => {
            setGranteeType(e.target.value as typeof granteeType);
            setGranteeId("");
          }}
          className="h-9 rounded-lg border border-jp-line bg-white px-3 text-sm"
        >
          <option value="concelhia">Concelhia</option>
          <option value="distrital">Distrito</option>
        </select>

        <select
          value={granteeId}
          onChange={(e) => setGranteeId(e.target.value)}
          className="h-9 min-w-[180px] rounded-lg border border-jp-line bg-white px-3 text-sm"
        >
          <option value="">
            {granteeType === "concelhia" ? "Escolhe uma concelhia…" : "Escolhe um distrito…"}
          </option>
          {(granteeType === "concelhia" ? concelhias : districts).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as typeof eventType)}
          className="h-9 rounded-lg border border-jp-line bg-white px-3 text-sm"
        >
          <option value="conselho_nacional">Conselho Nacional</option>
          <option value="congresso_nacional">Congresso Nacional</option>
        </select>

        <Button
          size="sm"
          disabled={!granteeId || create.isExecuting}
          onClick={() =>
            create.execute({
              concelhiaId: granteeType === "concelhia" ? granteeId : null,
              districtId: granteeType === "distrital" ? granteeId : null,
              eventType,
            })
          }
        >
          {create.isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {grants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma delegação ativa.</p>
      ) : (
        <ul className="space-y-1.5">
          {grants.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-xl border border-jp-line bg-white px-3 py-2 text-sm"
            >
              <span>
                <strong>{g.concelhiaName ?? g.districtName}</strong> — {EVENT_TYPE_LABEL[g.eventType]}
              </span>
              <button
                onClick={() => revoke.execute({ grantId: g.id })}
                disabled={revoke.isExecuting}
                className="rounded-full p-1 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
