import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cargo, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.cargo) redirect("/onboarding");

  // O backoffice é para staff (moderadores e acima); um simpatizante ou
  // militante comum nunca deveria conseguir entrar aqui só por ter sessão
  // válida — antes disto, o layout só verificava login + onboarding.
  const STAFF_ROLES = [
    "moderador_concelhio",
    "moderador_distrital",
    "moderador_nacional",
    "cpn",
    "administrador",
  ];
  if (!STAFF_ROLES.includes(profile.role)) {
    redirect("/sem-permissao");
  }

  return (
    <div className="flex min-h-screen bg-jp-blue-tint">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-jp-line bg-white px-6 pl-16 lg:pl-6">
          <UserMenu fullName={profile.full_name} cargo={profile.cargo} onLogout={logout} />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
