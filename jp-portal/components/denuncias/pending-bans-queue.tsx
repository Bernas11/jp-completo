"use client";

import { useAction } from "next-safe-action/hooks";
import { Ban, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { approveBanRequest, rejectBanRequest } from "@/actions/reports";

type PendingBan = {
  id: string;
  target_display_name: string;
  reason: string;
  applied_by_display_name: string;
  created_at: string;
};

export function PendingBansQueue({ pendingBans }: { pendingBans: PendingBan[] }) {
  const approveAction = useAction(approveBanRequest);
  const rejectAction = useAction(rejectBanRequest);

  return (
    <div className="space-y-4">
      <h2 className="font-display uppercase text-2xl text-jp-blue-deep">
        Bans Pendentes de Aprovação
      </h2>

      {pendingBans.length === 0 && (
        <EmptyState icon={Ban} title="Sem pedidos pendentes" description="Os pedidos de expulsão para aprovação da CPN aparecem aqui." />
      )}

      <div className="space-y-3">
        {pendingBans.map((ban) => (
          <div
            key={ban.id}
            className="surface-card flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/30 p-5"
          >
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-medium">{ban.target_display_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ban.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedido por {ban.applied_by_display_name} em{" "}
                {new Date(ban.created_at).toLocaleDateString("pt-PT")}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={approveAction.isExecuting}
                  onClick={() => approveAction.execute({ moderationActionId: ban.id })}
                >
                  {approveAction.isExecuting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Aprovar Ban
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rejectAction.isExecuting}
                  onClick={() => rejectAction.execute({ moderationActionId: ban.id })}
                >
                  <X className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
