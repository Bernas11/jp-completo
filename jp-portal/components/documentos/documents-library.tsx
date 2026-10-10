"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { FileText, Search, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deletePortalDocument } from "@/actions/documents";
import { UploadDocumentDialog } from "@/components/documentos/upload-document-dialog";
import { canPublishScoped, canModerateScope } from "@/lib/roles";
import type { ModeratorScopeContext } from "@/lib/moderator-scope";

type PortalDocument = {
  id: string;
  title: string;
  scope: "nacional" | "distrital" | "concelhia";
  scope_district_id: string | null;
  scope_concelhia_id: string | null;
  scope_label?: string;
  downloadUrl: string;
  created_at: string;
  /* true para documentos que na verdade vêm do Admin (public_documents,
   * outro projeto Supabase) e só aparecem aqui fundidos para leitura —
   * nunca podem ser eliminados a partir desta lista, porque
   * deletePortalDocument só sabe apagar linhas de "portal_documents". */
  readOnly?: boolean;
};

const scopeLabels: Record<PortalDocument["scope"], string> = {
  nacional: "Nacional",
  distrital: "Distrital",
  concelhia: "Concelhia",
};

export function DocumentsLibrary({
  documents,
  scopeContext,
}: {
  documents: PortalDocument[];
  scopeContext: ModeratorScopeContext;
}) {
  const [search, setSearch] = useState("");
  const deleteAction = useAction(deletePortalDocument);
  const canModerate = scopeContext.canModerate;
  const canPublishHere = canModerate && canPublishScoped(scopeContext.moderator.role);

  const filtered = useMemo(
    () => documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase())),
    [documents, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Documentos</h1>
        {canPublishHere && (
          <UploadDocumentDialog
            moderator={scopeContext.moderator}
            districts={scopeContext.districts}
            concelhias={scopeContext.concelhias}
          />
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar documentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="surface-card flex items-center justify-between rounded-xl border border-jp-line p-4"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-jp-blue" />
              <div>
                <p className="text-sm font-medium text-jp-blue-deep">{doc.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="border-jp-line text-xs font-normal">
                    {doc.scope_label ?? scopeLabels[doc.scope]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("pt-PT")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              {!doc.readOnly &&
                canModerate &&
                canModerateScope(
                  { role: scopeContext.moderator.role, districtId: scopeContext.moderator.ownDistrictId, concelhiaId: scopeContext.moderator.ownConcelhiaId },
                  { scope: doc.scope, districtId: doc.scope_district_id, concelhiaId: doc.scope_concelhia_id },
                ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => deleteAction.execute({ documentId: doc.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 py-10 text-center text-muted-foreground">
            Nenhum documento encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
