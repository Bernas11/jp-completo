"use client";

import Link from "next/link";
import { Pin, Lock, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type Topic = {
  id: string;
  title: string;
  pinned: boolean;
  status: "aberto" | "fechado";
  viewCount: number;
  replyCount: number;
  authorName: string;
  lastActivityAt: string;
};

export function TopicList({ topics, categoryId }: { topics: Topic[]; categoryId: string }) {
  if (topics.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Ainda não há tópicos nesta categoria"
        description="Sê o primeiro a escrever."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {topics.map((t) => (
        <li key={t.id}>
          <Link
            href={`/comunidade/forum/${categoryId}/${t.id}`}
            className="surface-card flex items-center justify-between gap-4 rounded-2xl border border-jp-line p-4 transition-colors hover:border-jp-blue"
          >
            <div className="flex min-w-0 items-center gap-2">
              {t.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-jp-yellow" />}
              {t.status === "fechado" && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0">
                <p className="truncate font-medium text-jp-ink dark:text-white">{t.title}</p>
                <p className="text-sm text-muted-foreground">por {t.authorName}</p>
              </div>
            </div>
            <div className="shrink-0 pl-4 text-right text-sm text-muted-foreground">
              <p>{t.replyCount} respostas</p>
              <p>{new Date(t.lastActivityAt).toLocaleDateString("pt-PT")}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
