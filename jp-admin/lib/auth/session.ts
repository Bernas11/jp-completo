import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CurrentProfile = {
  id: string;
  email: string;
  fullName: string;
  cargo: string | null;
  role: string;
};

/**
 * Busca o utilizador autenticado e o respetivo perfil numa só chamada.
 * Redireciona para /login se não houver sessão — usar em Server Components
 * de páginas/layouts protegidos, em vez de repetir a verificação em cada
 * página.
 *
 * Server-only (usa next/headers via o client Supabase) — nunca importar
 * isto de um Client Component. Para funções puras (greeting, initials),
 * usar @/lib/auth/format em vez deste ficheiro.
 */
export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, cargo, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    cargo: profile.cargo,
    role: profile.role,
  };
}
