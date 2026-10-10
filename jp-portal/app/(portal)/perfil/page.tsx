import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { DigitalCard } from "@/components/cartao/digital-card";
import { EditNameField } from "@/components/perfil/edit-name-field";
import { DarkModeToggle } from "@/components/perfil/dark-mode-toggle";
import { WeeklyDigestToggle } from "@/components/perfil/weekly-digest-toggle";
import { PushNotificationsToggle } from "@/components/perfil/push-notifications-toggle";
import { getOrCreateProfile } from "@/lib/profile";
import { roleLabel } from "@/lib/roles";
import { ErrorState } from "@/components/ui/error-state";
import { MapPin, Calendar } from "lucide-react";

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Garante que existe perfil (ex.: simpatizante ainda não sincronizado)
  // antes de pedir os dados mais ricos abaixo.
  await getOrCreateProfile(supabase, user);

  const { data: profile, error } = await supabase
    .from("portal_profiles")
    .select(
      `display_name, email, avatar_url, role, member_number, joined_member_at, dark_mode, weekly_digest_opt_in,
       concelhia:concelhias!portal_profiles_concelhia_id_fkey(name),
       badges:profile_badges(earned_at, badge:badges(key, name, description, icon_url))`,
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Erro ao carregar o perfil:", error);
    return <ErrorState message="Não foi possível carregar o teu perfil." />;
  }

  const concelhiaName = (profile.concelhia as any)?.name as string | undefined;

  return (
    <div className="space-y-8">
      <h1 className="font-display uppercase text-2xl text-jp-blue-deep dark:text-white">Perfil</h1>

      <section className="surface-card space-y-5 rounded-2xl border border-jp-line bg-white p-6 dark:bg-jp-blue-deep/40">
        <div>
          <EditNameField initialName={profile.display_name} />
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-jp-blue-tint px-3 py-1 text-xs font-medium text-jp-blue-deep dark:bg-jp-blue-mid/30 dark:text-white">
            {roleLabel(profile.role)}
          </span>
          {concelhiaName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-jp-blue-tint px-3 py-1 text-xs font-medium text-jp-blue-deep dark:bg-jp-blue-mid/30 dark:text-white">
              <MapPin className="h-3 w-3" />
              {concelhiaName}
            </span>
          )}
          {profile.joined_member_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-jp-blue-tint px-3 py-1 text-xs font-medium text-jp-blue-deep dark:bg-jp-blue-mid/30 dark:text-white">
              <Calendar className="h-3 w-3" />
              Membro desde {new Date(profile.joined_member_at).getFullYear()}
            </span>
          )}
        </div>

        <div className="space-y-4 border-t border-jp-line pt-4 dark:border-jp-blue-mid">
          <DarkModeToggle initialValue={profile.dark_mode ?? false} />
          <WeeklyDigestToggle initialValue={profile.weekly_digest_opt_in ?? false} />
          <PushNotificationsToggle vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        </div>
      </section>

      {profile.role === "simpatizante" ? (
        <section className="surface-card mx-auto max-w-md rounded-2xl border border-jp-line p-8 text-center">
          <p className="font-display uppercase text-jp-blue-deep">Ainda não és Militante</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O Cartão Digital é exclusivo de Militantes. Submete o teu pedido de filiação junto da
            Juventude Popular Nacional para o desbloquear.
          </p>
          <a
            href="https://juventudepopular.pt/aderir/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-jp-blue px-4 py-2 text-sm text-white hover:bg-jp-blue-deep"
          >
            Pedir Filiação
          </a>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-xs font-display uppercase tracking-wide text-jp-ink-soft">
            O teu Cartão Digital
          </h2>
          <DigitalCardSection profile={profile} />
        </section>
      )}
    </div>
  );
}

async function DigitalCardSection({ profile }: { profile: any }) {
  const verificationUrl = `https://portal.juventudepopular.pt/verificar/${profile.member_number}`;
  const qrSvg = await QRCode.toString(verificationUrl, { type: "svg", margin: 1, width: 120 });

  return (
    <DigitalCard
      displayName={profile.display_name}
      memberNumber={profile.member_number ?? "—"}
      concelhiaName={(profile.concelhia as any)?.name ?? "—"}
      joinedAt={profile.joined_member_at}
      avatarUrl={profile.avatar_url}
      badges={(profile.badges as any[]) ?? []}
      qrSvg={qrSvg}
    />
  );
}
