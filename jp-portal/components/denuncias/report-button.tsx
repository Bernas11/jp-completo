"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Flag, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createReport } from "@/actions/reports";

export function ReportButton({
  entityType,
  entityId,
}: {
  entityType: "forum_reply" | "forum_topic" | "mural_post";
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reportAction = useAction(createReport, {
    onSuccess: () => setTimeout(() => setOpen(false), 1500),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
      >
        <Flag className="h-3.5 w-3.5" /> Denunciar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">
              Denunciar Conteúdo
            </DialogTitle>
          </DialogHeader>

          {reportAction.result.data ? (
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Denúncia submetida. Um moderador vai analisar.
            </p>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="O que há de errado com este conteúdo?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              {reportAction.result.serverError && (
                <p className="text-sm text-red-600">{reportAction.result.serverError}</p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={reportAction.isExecuting || reason.trim().length < 10}
                  onClick={() => reportAction.execute({ entityType, entityId, reason })}
                >
                  {reportAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submeter Denúncia
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
