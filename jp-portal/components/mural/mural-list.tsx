"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Megaphone, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createMuralPost, deleteMuralPost } from "@/actions/mural";
import { ScopePicker, defaultScopeFor, type ScopeValue } from "@/components/moderacao/scope-picker";
import { canPublishScoped, canModerateScope } from "@/lib/roles";
import type { ModeratorScopeContext } from "@/lib/moderator-scope";

type MuralPost = {
  id: string;
  title: string;
  body: string;
  scope: "nacional" | "distrital" | "concelhia";
  scope_district_id: string | null;
  scope_concelhia_id: string | null;
  scope_label?: string;
  created_at: string;
  author_display_name: string;
};

const scopeLabels: Record<MuralPost["scope"], string> = {
  nacional: "Nacional",
  distrital: "Distrital",
  concelhia: "Concelhia",
};

export function MuralList({
  posts,
  scopeContext,
}: {
  posts: MuralPost[];
  scopeContext: ModeratorScopeContext;
}) {
  const canModerate = scopeContext.canModerate;
  const canPublishHere = canModerate && canPublishScoped(scopeContext.moderator.role);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<ScopeValue>(
    canModerate ? defaultScopeFor(scopeContext.moderator) : { scope: "nacional" },
  );

  const router = useRouter();
  const createAction = useAction(createMuralPost, {
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setBody("");
      if (canModerate) setScope(defaultScopeFor(scopeContext.moderator));
      router.refresh();
    },
  });
  const deleteAction = useAction(deleteMuralPost, { onSuccess: () => router.refresh() });

  const canSubmit =
    title.trim().length >= 3 &&
    body.trim().length >= 5 &&
    (scope.scope !== "distrital" || !!scope.scopeDistrictId) &&
    (scope.scope !== "concelhia" || !!scope.scopeConcelhiaId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Mural</h1>

        {canPublishHere && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-jp-blue text-white hover:bg-jp-blue-deep">
                <Plus className="h-4 w-4 mr-2" /> Publicar Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="border-jp-line">
              <DialogHeader>
                <DialogTitle className="font-display uppercase text-jp-blue-deep">
                  Novo Aviso
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea
                  placeholder="Conteúdo do aviso"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <ScopePicker
                  moderator={scopeContext.moderator}
                  districts={scopeContext.districts}
                  concelhias={scopeContext.concelhias}
                  value={scope}
                  onChange={setScope}
                />
                {createAction.result.serverError && (
                  <p className="text-sm text-red-600">{createAction.result.serverError}</p>
                )}
                <DialogFooter>
                  <Button
                    className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                    disabled={createAction.isExecuting || !canSubmit}
                    onClick={() =>
                      createAction.execute({ title: title.trim(), body: body.trim(), segment: scope })
                    }
                  >
                    {createAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Publicar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {posts.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Sem avisos publicados.</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="surface-card rounded-2xl border border-jp-line p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-jp-blue" />
                <p className="font-display uppercase text-jp-blue-deep">{post.title}</p>
              </div>
              {canModerate &&
                canModerateScope(
                  { role: scopeContext.moderator.role, districtId: scopeContext.moderator.ownDistrictId, concelhiaId: scopeContext.moderator.ownConcelhiaId },
                  { scope: post.scope, districtId: post.scope_district_id, concelhiaId: post.scope_concelhia_id },
                ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => deleteAction.execute({ postId: post.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{post.body}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-jp-line font-normal">
                {post.scope_label ?? scopeLabels[post.scope]}
              </Badge>
              <span>{post.author_display_name}</span>
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleDateString("pt-PT")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
