import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { NewWikiPageDialog } from "@/components/wiki/new-wiki-page-dialog";
import { isModeratorRole, canPublish } from "@/lib/roles";

const CATEGORY_LABEL: Record<string, string> = {
  estatutos: "Estatutos",
  guias: "Guias",
  glossario: "Glossário",
};

export default async function WikiIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: pages, error }] = await Promise.all([
    supabase.from("portal_profiles").select("role").eq("id", user.id).single(),
    supabase.from("wiki_pages").select("id, slug, title, category, updated_at").order("category").order("title"),
  ]);

  if (error) {
    console.error("Erro ao carregar wiki:", error);
    return <ErrorState message="Não foi possível carregar a wiki." />;
  }

  const grouped = (pages ?? []).reduce<Record<string, typeof pages>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Wiki interna</h1>
        {canPublish(profile?.role) && <NewWikiPageDialog />}
      </div>

      {Object.keys(grouped).length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Ainda não há páginas na wiki"
          description="Os conteúdos aparecem aqui assim que forem publicados."
        />
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-2 text-xs font-display uppercase tracking-wide text-jp-ink-soft">
            {CATEGORY_LABEL[category] ?? category}
          </h2>
          <ul className="space-y-2">
            {items!.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/wiki/${p.slug}`}
                  className="surface-card flex items-center justify-between rounded-2xl border border-jp-line p-3 text-jp-ink transition-colors hover:border-jp-blue dark:text-white"
                >
                  {p.title}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
