"use client";

import { MessageSquare, Globe, Landmark, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

type Category = { id: string; name: string; scope: "nacional" | "distrital" | "concelhia"; scopeLabel: string; topicCount: number };

const SCOPE_ICON = { nacional: Globe, distrital: Landmark, concelhia: MapPin };

export function ForumCategories({ categories, action }: { categories: Category[]; action?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Fóruns</h1>
        {action}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Ainda não há categorias de fórum"
          description="Assim que forem criadas categorias, vão aparecer aqui."
        />
      ) : (
        <div className="space-y-2">
          {categories.map((c) => {
            const Icon = SCOPE_ICON[c.scope];
            return (
              <Link
                key={c.id}
                href={`/comunidade/forum/${c.id}`}
                className="surface-card flex items-center justify-between rounded-2xl border border-jp-line p-4 transition-colors hover:border-jp-blue"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-jp-blue" />
                  <div>
                    <p className="font-medium text-jp-ink dark:text-white">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.scopeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {c.topicCount} tópicos
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
