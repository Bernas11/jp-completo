"use client";

import { useAction } from "next-safe-action/hooks";
import { Loader2, Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToEventInvitation } from "@/actions/events";

type Invitation = {
  id: string;
  eventTitle: string;
  eventStartsAt: string;
};

export function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  const action = useAction(respondToEventInvitation);

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-jp-yellow/60 bg-jp-yellow/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-jp-blue-deep">
        <Mail className="h-4 w-4" /> Convites pendentes
      </p>
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm">
          <div>
            <p className="font-medium text-jp-ink">{inv.eventTitle}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(inv.eventStartsAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              disabled={action.isExecuting}
              onClick={() => action.execute({ invitationId: inv.id, accept: true })}
            >
              {action.isExecuting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={action.isExecuting}
              onClick={() => action.execute({ invitationId: inv.id, accept: false })}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
