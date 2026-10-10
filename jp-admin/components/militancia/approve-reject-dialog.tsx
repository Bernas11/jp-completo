"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveMembershipRequest, rejectMembershipRequest } from "@/actions/membership-requests";
import type { MembershipRequestRow } from "./membership-requests-table";

const rejectSchema = z.object({
  reason: z.string().min(10, "Explica em poucas palavras o motivo da recusa.").max(500),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

export function ApproveRejectDialog({
  request,
  action,
  onClose,
}: {
  request: MembershipRequestRow | null;
  action: "aprovar" | "recusar" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const approveAction = useAction(approveMembershipRequest, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });

  const rejectAction = useAction(rejectMembershipRequest, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!request) {
      form.reset();
      approveAction.reset();
      rejectAction.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request || !action) return null;

  const isApprove = action === "aprovar";
  const currentAction = isApprove ? approveAction : rejectAction;

  const handleApprove = () => {
    approveAction.execute({ membershipRequestId: request.id });
  };

  const handleReject = form.handleSubmit((values) => {
    rejectAction.execute({ membershipRequestId: request.id, reason: values.reason });
  });

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            {isApprove ? "Aprovar filiação" : "Recusar filiação"}
          </DialogTitle>
          <DialogDescription>
            {request.fullName} — {request.concelhiaName}, {request.districtName}
          </DialogDescription>
        </DialogHeader>

        {isApprove ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao aprovar, é gerado automaticamente um número de militante e é enviado um email de
              boas-vindas. Esta ação não pode ser desfeita.
            </p>
            {approveAction.result.serverError && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" /> {approveAction.result.serverError}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={approveAction.isExecuting}>
                Cancelar
              </Button>
              <Button
                className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                onClick={handleApprove}
                disabled={approveAction.isExecuting}
              >
                {approveAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar aprovação
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <Textarea
                {...form.register("reason")}
                placeholder="Motivo da recusa (será incluído no email enviado ao candidato)"
                rows={4}
              />
              {form.formState.errors.reason && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
            {rejectAction.result.serverError && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" /> {rejectAction.result.serverError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={rejectAction.isExecuting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                disabled={rejectAction.isExecuting}
              >
                {rejectAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar recusa
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
