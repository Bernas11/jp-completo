"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Pencil, Loader2, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateWikiPage } from "@/actions/wiki";

type Revision = { id: string; body: string; created_at: string; editor_name: string | null };

export function WikiPageView({
  pageId,
  title,
  body,
  canEdit,
  revisions,
  lastEditedBy,
  updatedAt,
}: {
  pageId: string;
  title: string;
  body: string;
  canEdit: boolean;
  revisions: Revision[];
  lastEditedBy: string | null;
  updatedAt: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [showHistory, setShowHistory] = useState(false);

  const router = useRouter();
  const updateAction = useAction(updateWikiPage, {
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">{title}</h1>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory((s) => !s)}>
              <History className="h-4 w-4 mr-1" /> Histórico
            </Button>
            <Button size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Última edição {lastEditedBy ? `por ${lastEditedBy}` : ""} em{" "}
        {new Date(updatedAt).toLocaleDateString("pt-PT")}
      </p>

      {showHistory && (
        <div className="surface-card rounded-xl border border-jp-line p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-display uppercase text-muted-foreground">
              Revisões anteriores
            </p>
            <button onClick={() => setShowHistory(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {revisions.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem revisões anteriores.</p>
          )}
          <ul className="space-y-1 text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="text-muted-foreground">
                {new Date(r.created_at).toLocaleString("pt-PT")} — {r.editor_name ?? "desconhecido"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={16} />
          {updateAction.result.serverError && (
            <p className="text-sm text-red-600">{updateAction.result.serverError}</p>
          )}
          <div className="flex gap-2">
            <Button
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={updateAction.isExecuting}
              onClick={() => updateAction.execute({ pageId, body: draft })}
            >
              {updateAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(body);
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <article className="prose prose-sm max-w-none whitespace-pre-wrap">{body}</article>
      )}
    </div>
  );
}
