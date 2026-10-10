"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Pin, Lock, Unlock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReply, pinTopic, setTopicStatus } from "@/actions/forum";
import { ReportButton } from "@/components/denuncias/report-button";

type Reply = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

type Topic = {
  id: string;
  title: string;
  pinned: boolean;
  status: "aberto" | "fechado";
  authorName: string;
};

export function TopicView({
  categoryId,
  topic,
  replies,
  canModerate,
}: {
  categoryId: string;
  topic: Topic;
  replies: Reply[];
  canModerate: boolean;
}) {
  const [body, setBody] = useState("");

  const router = useRouter();
  const reply = useAction(createReply, {
    onSuccess: () => {
      setBody("");
      router.refresh();
    },
  });
  const pin = useAction(pinTopic, { onSuccess: () => router.refresh() });
  const close = useAction(setTopicStatus, { onSuccess: () => router.refresh() });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          {topic.pinned && <Pin className="h-4 w-4 text-jp-yellow" />}
          <h1 className="font-display uppercase text-2xl text-jp-blue-deep">{topic.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">por {topic.authorName}</p>
      </div>

      {canModerate && (
        <div className="flex gap-2 rounded-xl border border-jp-line p-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pin.isExecuting}
            onClick={() => pin.execute({ topicId: topic.id, pinned: !topic.pinned })}
          >
            <Pin className="mr-1.5 h-3.5 w-3.5" /> {topic.pinned ? "Desafixar" : "Fixar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={close.isExecuting}
            onClick={() =>
              close.execute({
                topicId: topic.id,
                status: topic.status === "aberto" ? "fechado" : "aberto",
              })
            }
          >
            {topic.status === "aberto" ? (
              <>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Fechar
              </>
            ) : (
              <>
                <Unlock className="mr-1.5 h-3.5 w-3.5" /> Reabrir
              </>
            )}
          </Button>
        </div>
      )}

      <ul className="space-y-3">
        {replies.map((r) => (
          <li key={r.id} className="surface-card rounded-2xl border border-jp-line p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-jp-ink dark:text-white">{r.authorName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("pt-PT")}
                <ReportButton entityType="forum_reply" entityId={r.id} />
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{r.body}</p>
          </li>
        ))}
      </ul>

      {topic.status === "aberto" ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Escreve a tua resposta..."
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {reply.result?.serverError && (
            <p className="text-sm text-destructive">{reply.result.serverError}</p>
          )}
          <Button
            disabled={body.trim().length < 2 || reply.isExecuting}
            onClick={() => reply.execute({ topicId: topic.id, body, mentionedProfileIds: [] })}
          >
            {reply.isExecuting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Responder
          </Button>
        </div>
      ) : (
        <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">
          Este tópico está fechado para novas respostas.
        </p>
      )}
    </div>
  );
}
