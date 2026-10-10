import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EventsList } from "@/components/eventos/events-list";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/shared/states";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: events, error }, { data: concelhias }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, description, location, starts_at, ends_at, concelhia_id, is_public, external_link, concelhia:concelhias(name)",
      )
      .order("starts_at", { ascending: true }),
    supabase.from("concelhias").select("id, name").order("name"),
  ]);

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar os eventos"
        description="Confirma que tens permissões para esta área."
      />
    );
  }

  const rows = (events ?? []).map((e: any) => ({
    ...e,
    concelhia_name: e.concelhia?.name ?? null,
  }));

  return <EventsList events={rows} concelhias={concelhias ?? []} />;
}
