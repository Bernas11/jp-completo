"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { AlertTriangle, Loader2, ShieldOff, UserX, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveReport } from "@/actions/reports";

type Report = {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  created_at: string;
  reporter_display_name: string;
  target_profile_id: string;
  target_display_name: string;
  content_preview: string | null;
};

export function ReportsQueue({ reports }: { reports: Report[] }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Denúncias Pendentes</h1>

      {reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Sem denúncias pendentes" description="Quando houver novas denúncias, aparecem aqui." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const [reason, setReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const resolveAction = useAction(resolveReport);

  const resolve = (action: "nenhuma" | "silenciar" | "suspender" | "pedido_ban_cpn") => {
    if (action !== "nenhuma" && reason.trim().length < 5) {
      alert("Escreve um motivo antes de aplicar uma ação de moderação.");
      return;
    }
    resolveAction.execute({
      reportId: report.id,
      action,
      targetProfileId: report.target_profile_id,
      reason: reason || "Sem detalhes adicionais",
      suspensionDays: action === "suspender" ? suspensionDays : undefined,
    });
  };

  return (
    <div className="surface-card rounded-2xl border border-jp-line p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-jp-line font-normal">
              {report.entity_type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              denunciado por {report.reporter_display_name}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">Motivo: {report.reason}</p>
          {report.content_preview && (
            <p className="mt-1 rounded-lg bg-jp-blue/5 p-2 text-xs text-muted-foreground">
              "{report.content_preview}"
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Autor: {report.target_display_name}</p>

          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Motivo da ação de moderação (visível em auditoria)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => resolve("nenhuma")}>
                Ignorar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700"
                onClick={() => resolve("silenciar")}
              >
                <ShieldOff className="h-3.5 w-3.5 mr-1" /> Silenciar
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="w-16"
                  value={suspensionDays}
                  onChange={(e) => setSuspensionDays(Number(e.target.value))}
                  min={1}
                  max={90}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700"
                  onClick={() => resolve("suspender")}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> Suspender (dias)
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500 text-red-800"
                onClick={() => resolve("pedido_ban_cpn")}
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Pedir Ban à CPN
              </Button>
            </div>
            {resolveAction.isExecuting && <Loader2 className="h-4 w-4 animate-spin text-jp-blue" />}
            {resolveAction.result.serverError && (
              <p className="text-xs text-red-600">{resolveAction.result.serverError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
