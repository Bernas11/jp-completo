"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTopic } from "@/actions/forum";

export function NewTopicForm({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const router = useRouter();

  const create = useAction(createTopic, {
    onSuccess: ({ data }) => {
      setOpen(false);
      setTitle("");
      setBody("");
      if (data?.topicId) router.push(`/comunidade/forum/${categoryId}/${data.topicId}`);
    },
  });

  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Novo tópico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo tópico</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Escreve o teu tópico..."
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {create.result?.serverError && (
            <p className="text-sm text-destructive">{create.result.serverError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit || create.isExecuting}
            onClick={() => create.execute({ categoryId, title, body })}
          >
            {create.isExecuting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
