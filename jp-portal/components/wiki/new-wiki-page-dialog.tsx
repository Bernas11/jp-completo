"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createWikiPage } from "@/actions/wiki";

const CATEGORIES = [
  { value: "estatutos", label: "Estatutos" },
  { value: "guias", label: "Guias" },
  { value: "glossario", label: "Glossário" },
] as const;

export function NewWikiPageDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("guias");

  const action = useAction(createWikiPage, {
    onSuccess: ({ data }) => {
      setOpen(false);
      setTitle("");
      setBody("");
      if (data?.slug) router.push(`/wiki/${data.slug}`);
    },
  });

  const canSubmit = title.trim().length >= 3 && body.trim().length >= 10;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nova página
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">Nova Página da Wiki</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-blue"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <Textarea
              placeholder="Conteúdo da página…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={50000}
            />

            {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}

            <DialogFooter>
              <Button
                disabled={!canSubmit || action.isExecuting}
                onClick={() => action.execute({ title: title.trim(), body: body.trim(), category })}
              >
                {action.isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar página
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
