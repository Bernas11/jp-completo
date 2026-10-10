import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/components/notificacoes/notifications-panel";
import { ErrorState } from "@/components/ui/error-state";

export default async function NotificacoesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao carregar notificações:", error);
    return <ErrorState message="Não foi possível carregar as notificações." />;
  }

  return <NotificationsPanel notifications={notifications ?? []} />;
}
