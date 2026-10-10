import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/actions/auth";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

const CARGOS_SUGERIDOS = [
  "Presidente",
  "Vice-Presidente",
  "Secretário-Geral",
  "Coordenador",
  "Responsável Concelhio",
  "Responsável Distrital",
  "TI / Suporte Técnico-Digital",
];

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cargo")
    .eq("id", user.id)
    .single();

  // já tem cargo definido — nada a fazer aqui
  if (profile?.cargo) {
    redirect("/");
  }

  return (
    <OnboardingForm
      action={completeOnboarding}
      defaultFullName={profile?.full_name ?? ""}
      cargosSugeridos={CARGOS_SUGERIDOS}
    />
  );
}
