"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { FileText, Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApproveRejectDialog } from "./approve-reject-dialog";
import { getCitizenCardSignedUrl } from "@/actions/membership-requests";
import { initials } from "@/lib/auth/format";
import { cn } from "@/lib/utils";

type RequestData = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  hasDocument: boolean;
  concelhiaName: string;
  districtName: string;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-jp-yellow text-jp-blue-deep",
  aprovado: "bg-green-100 text-green-700",
  recusado: "bg-red-100 text-red-700",
};

export function RequestDetail({ request }: { request: RequestData }) {
  const [dialogAction, setDialogAction] = useState<"aprovar" | "recusar" | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docIsPdf, setDocIsPdf] = useState(false);

  const viewDoc = useAction(getCitizenCardSignedUrl, {
    onSuccess: ({ data }) => {
      setDocUrl(data?.url ?? null);
      setDocIsPdf(!!data?.isPdf);
    },
  });

  const fields: [string, string][] = [
    ["Email", request.email],
    ["Telemóvel", request.phone],
    ["Data de nascimento", new Date(request.birthDate).toLocaleDateString("pt-PT")],
    ["Concelhia", request.concelhiaName],
    ["Distrito", request.districtName],
    ["Submetido em", new Date(request.createdAt).toLocaleDateString("pt-PT")],
  ];

  return (
    <div className="max-w-2xl">
      <Link
        href="/militancia/pedidos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-jp-ink-soft hover:text-jp-blue-deep"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar aos pedidos
      </Link>

      <div className="surface-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-jp-blue text-sm font-semibold text-white">
            {initials(request.fullName)}
          </div>
          <div>
            <p className="font-headline text-xl text-jp-ink">{request.fullName}</p>
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_STYLE[request.status] ?? "bg-jp-blue-tint text-jp-ink-soft",
              )}
            >
              {STATUS_LABEL[request.status] ?? request.status}
            </span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-jp-line pt-6 text-sm sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-jp-ink-soft">{label}</dt>
              <dd className="mt-0.5 font-medium text-jp-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {request.rejectionReason && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border-l-4 border-red-500 bg-red-50 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              <strong>Motivo da recusa:</strong> {request.rejectionReason}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-jp-line pt-6">
          {request.hasDocument && (
            <Button
              variant="outline"
              className="border-jp-line text-jp-ink hover:bg-jp-blue-tint2"
              disabled={viewDoc.isExecuting}
              onClick={() => viewDoc.execute({ membershipRequestId: request.id })}
            >
              {viewDoc.isExecuting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Ver Cartão de Cidadão
            </Button>
          )}
          {request.status === "pendente" && (
            <>
              <Button
                className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                onClick={() => setDialogAction("aprovar")}
              >
                Aprovar adesão
              </Button>
              <Button variant="destructive" onClick={() => setDialogAction("recusar")}>
                Recusar adesão
              </Button>
            </>
          )}
        </div>

        {docUrl && (
          <div className="mt-6 space-y-2 border-t border-jp-line pt-6">
            {docIsPdf ? (
              <>
                <iframe
                  src={docUrl}
                  title="Cartão de Cidadão submetido (PDF)"
                  className="h-[70vh] w-full rounded-xl border border-jp-line bg-white"
                />
                <p className="text-xs text-jp-ink-soft">
                  Se o PDF não aparecer (alguns browsers/dispositivos móveis não mostram PDFs embutidos),{" "}
                  <a href={docUrl} target="_blank" rel="noreferrer" className="underline">
                    abre-o numa aba nova
                  </a>
                  .
                </p>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={docUrl}
                alt="Cartão de Cidadão submetido"
                className="w-full rounded-xl border border-jp-line"
              />
            )}
            <p className="text-xs text-jp-ink-soft">
              Este acesso expira dentro de 1 hora e ficou registado no histórico de auditoria.
            </p>
          </div>
        )}
      </div>

      {dialogAction && (
        <ApproveRejectDialog
          request={{
            id: request.id,
            fullName: request.fullName,
            email: request.email,
            phone: request.phone,
            concelhiaName: request.concelhiaName,
            districtName: request.districtName,
            createdAt: request.createdAt,
          }}
          action={dialogAction}
          onClose={() => setDialogAction(null)}
        />
      )}
    </div>
  );
}
