import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminsTable } from "@/components/administradores/admins-table";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/shared/states";

export default async function AdministradoresPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, last_login_at, totp_enabled, created_at")
    .in("role", ["cpn", "administrador", "moderador_nacional"])
    .order("role")
    .order("full_name");

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar os administradores"
        description="Confirma que tens permissões para esta área."
      />
    );
  }

  return <AdminsTable admins={admins ?? []} currentUserId={user.id} />;
}
