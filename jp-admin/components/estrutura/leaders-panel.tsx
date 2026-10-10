"use client";

import { EmptyState } from "@/components/shared/states";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLeader, updateLeader, deleteLeader } from "@/actions/leaders";

type Leader = {
  id: string;
  full_name: string;
  photo_url: string | null;
  start_date: string;
  end_date: string;
  display_order: number;
};

function LeaderFormDialog({ leader, onDone }: { leader?: Leader; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(leader?.full_name ?? "");
  const [photoUrl, setPhotoUrl] = useState(leader?.photo_url ?? "");
  const [startDate, setStartDate] = useState(leader?.start_date ?? "");
  const [endDate, setEndDate] = useState(leader?.end_date ?? "");
  const [order, setOrder] = useState(String(leader?.display_order ?? 0));

  const router = useRouter();
  const create = useAction(createLeader, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });
  const update = useAction(updateLeader, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });

  const busy = create.isExecuting || update.isExecuting;
  const error = create.result?.serverError || update.result?.serverError;
  const canSubmit = fullName.trim().length >= 2 && startDate && endDate;

  const submit = () => {
    const payload = {
      fullName,
      photoUrl: photoUrl || undefined,
      startDate,
      endDate,
      displayOrder: parseInt(order || "0", 10),
    };
    if (leader) update.execute({ ...payload, leaderId: leader.id });
    else create.execute(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {leader ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="mr-1.5 h-4 w-4" /> Novo líder</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{leader ? "Editar líder" : "Novo líder"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="/lideres/nome.jpg ou https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Início do mandato</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Fim do mandato</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ordem de exibição</label>
            <Input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!canSubmit || busy} onClick={submit}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadersPanel({ leaders }: { leaders: Leader[] }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const remove = useAction(deleteLeader, {
    onSuccess: () => {
      router.refresh();
      setRefreshKey((k) => k + 1);
    },
  });

  return (
    <div className="space-y-4" key={refreshKey}>
      <LeaderFormDialog onDone={() => setRefreshKey((k) => k + 1)} />

      {leaders.length === 0 ? (
        <EmptyState
          icon={User}
          title="Ainda não há líderes anteriores registados"
          description="Adiciona os antigos dirigentes nacionais para manter o histórico da organização."
        />
      ) : (
        <ul className="surface-card divide-y divide-jp-line overflow-hidden">
          {leaders.map((l) => (
            <li key={l.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {l.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photo_url} alt={l.full_name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-jp-blue-tint">
                    <User className="h-5 w-5 text-jp-ink-soft" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-jp-ink">{l.full_name}</p>
                  <p className="text-sm text-jp-ink-soft">
                    {new Date(l.start_date).toLocaleDateString("pt-PT")} —{" "}
                    {new Date(l.end_date).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <LeaderFormDialog leader={l} onDone={() => setRefreshKey((k) => k + 1)} />
                <Button variant="ghost" size="icon" onClick={() => remove.execute({ leaderId: l.id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
