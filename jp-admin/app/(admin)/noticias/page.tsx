import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewsPanel } from "@/components/noticias/news-panel";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function NoticiasPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: news, error } = await supabase
    .from("news")
    .select("id, title, summary, body, image_url, category, external_link, status, slug, published_at, created_at")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[noticias] falha ao carregar notícias:", error);
    return (
      <ErrorState
        title="Não foi possível carregar as notícias"
        description="Tenta novamente dentro de instantes ou contacta o suporte técnico."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Atividades"
        description="Notícias, comunicados e outras atividades mostradas na secção Atividades do JP-Nacional."
      />
      <NewsPanel news={news ?? []} />
    </div>
  );
}
