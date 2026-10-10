"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScopePicker, defaultScopeFor, type ScopeValue, type ModeratorContext } from "@/components/moderacao/scope-picker";
import { createForumCategory } from "@/actions/forum";

export function NewCategoryDialog({
  moderator,
  districts,
  concelhias,
}: {
  moderator: ModeratorContext;
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<ScopeValue>(() => defaultScopeFor(moderator));

  const action = useAction(createForumCategory, {
    onSuccess: () => {
      setOpen(false);
      setName("");
      setSegment(defaultScopeFor(moderator));
      router.refresh();
    },
  });

  const scopeOk =
    segment.scope === "nacional" ||
    (segment.scope === "distrital" && !!segment.scopeDistrictId) ||
    (segment.scope === "concelhia" && !!segment.scopeConcelhiaId);
  const canSubmit = name.trim().length >= 3 && scopeOk;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">Nova Categoria de Fórum</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />

            <ScopePicker
              moderator={moderator}
              districts={districts}
              concelhias={concelhias}
              value={segment}
              onChange={setSegment}
            />

            {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}

            <DialogFooter>
              <Button
                disabled={!canSubmit || action.isExecuting}
                onClick={() =>
                  action.execute({
                    name: name.trim(),
                    scope: segment.scope,
                    scopeDistrictId: segment.scope === "distrital" ? segment.scopeDistrictId : null,
                    scopeConcelhiaId: segment.scope === "concelhia" ? segment.scopeConcelhiaId : null,
                  })
                }
              >
                {action.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar categoria
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
