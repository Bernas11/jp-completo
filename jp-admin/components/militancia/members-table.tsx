"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Search, UserX, Pencil, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/states";
import { revokeMembership, updateMember } from "@/actions/membership-requests";

type Member = {
  id: string;
  member_number: number;
  status: "ativo" | "revogado" | "suspenso";
  joined_at: string;
  concelhia_id: string;
  full_name: string;
  email: string;
  concelhia_name: string;
};

type Concelhia = { id: string; name: string };

const statusStyles: Record<Member["status"], string> = {
  ativo: "bg-emerald-50 text-emerald-700",
  revogado: "bg-red-50 text-red-700",
  suspenso: "bg-amber-50 text-amber-700",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function EditMemberDialog({ member, concelhias }: { member: Member; concelhias: Concelhia[] }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(member.full_name);
  const [email, setEmail] = useState(member.email);
  const [concelhiaId, setConcelhiaId] = useState(member.concelhia_id);
  const router = useRouter();

  const editAction = useAction(updateMember, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-1.5 h-4 w-4" /> Editar
      </Button>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            Editar militante — #{member.member_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome completo</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Concelhia</label>
            <select
              className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
              value={concelhiaId}
              onChange={(e) => setConcelhiaId(e.target.value)}
            >
              {concelhias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {concelhiaId !== member.concelhia_id && (
              <p className="mt-1 text-xs text-amber-600">
                Mudar a concelhia transfere o militante e avisa o Portal.
              </p>
            )}
          </div>
          {editAction.result.serverError && (
            <p className="text-sm text-red-600">{editAction.result.serverError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={fullName.trim().length < 3 || !email.includes("@") || editAction.isExecuting}
            onClick={() =>
              editAction.execute({ memberId: member.id, fullName: fullName.trim(), email: email.trim(), concelhiaId })
            }
          >
            {editAction.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersTable({ members, concelhias }: { members: Member[]; concelhias: Concelhia[] }) {
  const [query, setQuery] = useState("");
  const [revoking, setRevoking] = useState<Member | null>(null);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const revokeAction = useAction(revokeMembership, {
    onSuccess: () => {
      setRevoking(null);
      setReason("");
      router.refresh();
    },
  });

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return members;
    return members.filter((m) =>
      normalize(`${m.full_name} ${m.email} ${m.concelhia_name} ${m.member_number}`).includes(q),
    );
  }, [members, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jp-ink-soft" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar por nome, email, concelhia ou nº..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={members.length === 0 ? "Ainda não há militantes aprovados" : "Sem resultados"}
          description={
            members.length === 0
              ? "Assim que aprovares o primeiro pedido de filiação, aparece aqui."
              : `Não encontrámos nenhum militante para "${query}".`
          }
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-jp-blue/5">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">Concelhia</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Filiado em</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-jp-line">
                  <td className="px-4 py-3 text-jp-ink-soft">#{m.member_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-jp-ink">{m.full_name}</p>
                    <p className="text-xs text-jp-ink-soft">{m.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-jp-ink-soft sm:table-cell">{m.concelhia_name}</td>
                  <td className="hidden px-4 py-3 text-jp-ink-soft md:table-cell">
                    {new Date(m.joined_at).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <EditMemberDialog member={m} concelhias={concelhias} />
                      {m.status === "ativo" && (
                        <Button variant="ghost" size="sm" onClick={() => setRevoking(m)}>
                          <UserX className="mr-1.5 h-4 w-4 text-red-600" /> Revogar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">
              Revogar filiação — {revoking?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-jp-ink-soft">
              Esta ação marca a filiação como revogada e é sincronizada com o Portal. Indica o
              motivo, para ficar registado em auditoria.
            </p>
            <Textarea
              placeholder="Motivo da revogação (mínimo 10 carateres)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {revokeAction.result.serverError && (
              <p className="text-sm text-red-600">{revokeAction.result.serverError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 10 || revokeAction.isExecuting}
              onClick={() => {
                if (!revoking) return;
                revokeAction.execute({ memberId: revoking.id, reason: reason.trim() });
              }}
            >
              {revokeAction.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar revogação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
