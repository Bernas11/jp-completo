import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/auth/format";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  cpn: "CPN",
  administrador: "TI / Suporte Técnico-Digital",
  moderador_nacional: "Moderador Nacional",
  moderador_distrital: "Moderador Distrital",
  moderador_concelhio: "Moderador Concelhio",
  militante: "Militante",
  simpatizante: "Simpatizante",
};

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "full_name, email, role, cargo, totp_enabled, last_login_at, created_at, district:districts(name)",
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <ErrorState
        title="Não foi possível carregar o teu perfil"
        description="Tenta novamente dentro de instantes ou contacta o suporte técnico."
      />
    );
  }

  const district = profile.district as unknown as { name: string } | null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="O meu perfil" description="Os teus dados de acesso ao JP-Admin." />

      <div className="surface-card rounded-2xl border border-jp-line p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-jp-blue text-lg font-semibold text-white">
            {initials(profile.full_name || "?")}
          </div>
          <div>
            <p className="font-headline text-xl text-jp-ink">{profile.full_name}</p>
            <p className="text-sm text-jp-ink-soft">{profile.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-jp-ink-soft">Role</dt>
            <dd className="mt-1">
              <Badge variant="outline" className="border-jp-line font-normal">
                {roleLabels[profile.role] ?? profile.role}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-jp-ink-soft">Cargo</dt>
            <dd className="mt-1 text-sm text-jp-ink">{profile.cargo ?? "—"}</dd>
          </div>
          {district && (
            <div>
              <dt className="text-xs uppercase text-jp-ink-soft">Distrito</dt>
              <dd className="mt-1 text-sm text-jp-ink">{district.name}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase text-jp-ink-soft">Verificação em dois passos</dt>
            <dd className="mt-1 text-sm text-jp-ink">
              {profile.totp_enabled ? "Ativa" : "Não ativa"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-jp-ink-soft">Último acesso</dt>
            <dd className="mt-1 text-sm text-jp-ink">
              {profile.last_login_at
                ? new Date(profile.last_login_at).toLocaleString("pt-PT")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-jp-ink-soft">Conta criada em</dt>
            <dd className="mt-1 text-sm text-jp-ink">
              {new Date(profile.created_at).toLocaleDateString("pt-PT")}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-jp-ink-soft">
          Para alterar o teu nome, cargo ou role, contacta a CPN ou o suporte técnico-digital.
        </p>
      </div>
    </div>
  );
}
