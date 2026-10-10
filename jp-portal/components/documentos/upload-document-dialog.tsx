"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UploadButton } from "@/lib/uploadthing";
import { uploadPortalDocument } from "@/actions/documents";
import { ScopePicker, defaultScopeFor, type ScopeValue, type ModeratorContext } from "@/components/moderacao/scope-picker";

export function UploadDocumentDialog({
  moderator,
  districts,
  concelhias,
}: {
  moderator: ModeratorContext;
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<ScopeValue>(defaultScopeFor(moderator));
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const router = useRouter();
  const uploadAction = useAction(uploadPortalDocument, {
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setFileUrl(null);
      setScope(defaultScopeFor(moderator));
      router.refresh();
    },
  });

  const canSubmit =
    title.trim().length >= 3 &&
    !!fileUrl &&
    (scope.scope !== "distrital" || !!scope.scopeDistrictId) &&
    (scope.scope !== "concelhia" || !!scope.scopeConcelhiaId);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Adicionar documento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">
              Novo Documento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Título do documento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />

            <ScopePicker
              moderator={moderator}
              districts={districts}
              concelhias={concelhias}
              value={scope}
              onChange={setScope}
            />

            <div className="rounded-lg border border-dashed border-jp-line p-4 text-center">
              {fileUrl ? (
                <p className="text-sm font-medium text-green-700">Ficheiro carregado ✓</p>
              ) : (
                <UploadButton
                  endpoint="documentUploader"
                  onClientUploadComplete={(res) => setFileUrl(res[0]?.ufsUrl ?? null)}
                  onUploadError={(err) => alert(`Erro no carregamento: ${err.message}`)}
                  appearance={{
                    button: "bg-jp-blue hover:bg-jp-blue-deep ut-uploading:bg-jp-blue/50",
                    allowedContent: "text-xs text-muted-foreground",
                  }}
                />
              )}
            </div>

            {uploadAction.result.serverError && (
              <p className="text-sm text-red-600">{uploadAction.result.serverError}</p>
            )}

            <DialogFooter>
              <Button
                disabled={!canSubmit || uploadAction.isExecuting}
                onClick={() =>
                  uploadAction.execute({
                    title: title.trim(),
                    storagePath: fileUrl!,
                    segment: scope,
                  })
                }
              >
                {uploadAction.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publicar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
