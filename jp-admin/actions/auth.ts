"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Recebe os tokens da sessão já autenticada (password + MFA verificados no
 * cliente) e estabelece-a do lado do servidor, escrevendo as cookies de
 * forma síncrona dentro desta Server Action.
 *
 * Existe porque confiar na escrita de cookies feita pelo browser client
 * (createBrowserClient) seguida imediatamente de navegação — mesmo com
 * window.location.href — mostrou-se sujeita a race conditions: a escrita
 * das cookies pode não estar concluída antes do reload destruir o
 * contexto JS, resultando num bounce de volta a /login. Fazendo o próprio
 * servidor chamar setSession(), a escrita fica garantida antes do
 * redirect responder.
 */
export async function establishServerSession(accessToken: string, refreshToken: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    redirect("/login?motivo=sessao_invalida");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // limpa o cache de Server Components de toda a app — sem isto, navegar
  // "para trás" no browser podia mostrar uma versão em cache de uma página
  // protegida antes do middleware ter oportunidade de redirecionar
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();

  if (!fullName || !cargo) {
    redirect("/onboarding?erro=campos_em_falta");
  }

  await supabase.from("profiles").update({ full_name: fullName, cargo }).eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/");
}
