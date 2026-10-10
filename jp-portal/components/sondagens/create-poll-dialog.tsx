"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createPoll } from "@/actions/polls";
import { ScopePicker, defaultScopeFor, type ScopeValue, type ModeratorContext } from "@/components/moderacao/scope-picker";

export function CreatePollDialog({
  moderator,
  districts,
  concelhias,
}: {
  moderator: ModeratorContext;
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [scope, setScope] = useState<ScopeValue>(defaultScopeFor(moderator));

  const router = useRouter();
  const action = useAction(createPoll, {
    onSuccess: () => {
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      setMultipleChoice(false);
      setScope(defaultScopeFor(moderator));
      router.refresh();
    },
  });

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    question.trim().length >= 5 &&
    cleanOptions.length >= 2 &&
    (scope.scope !== "distrital" || !!scope.scopeDistrictId) &&
    (scope.scope !== "concelhia" || !!scope.scopeConcelhiaId);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nova sondagem
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">Nova Sondagem</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="Pergunta da sondagem"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              maxLength={300}
            />

            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opção ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    maxLength={150}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={() => setOptions([...options, ""])}
                  className="text-xs font-medium text-jp-blue hover:underline"
                >
                  + Adicionar opção
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-jp-ink">
              <input
                type="checkbox"
                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
                className="h-4 w-4 rounded border-jp-line text-jp-blue focus:ring-jp-blue"
              />
              Permitir escolha múltipla
            </label>

            <ScopePicker
              moderator={moderator}
              districts={districts}
              concelhias={concelhias}
              value={scope}
              onChange={setScope}
            />

            {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}

            <DialogFooter>
              <Button
                disabled={!canSubmit || action.isExecuting}
                onClick={() =>
                  action.execute({
                    question: question.trim(),
                    options: cleanOptions,
                    multipleChoice,
                    segment: scope,
                  })
                }
              >
                {action.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar sondagem
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
