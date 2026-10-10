import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessageSquare,
  Calendar,
  FileText,
  BarChart3,
  BookOpen,
  Archive,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { roleLabel } from "@/lib/roles";

const quickLinks = [
  { href: "/mural", label: "Mural", description: "Avisos e novidades da JP", icon: MessageSquare },
  { href: "/comunidade/forum", label: "Fóruns", description: "Participa na discussão", icon: MessageSquare },
  { href: "/eventos", label: "Eventos", description: "Iniciativas e encontros", icon: Calendar },
  { href: "/documentos", label: "Documentos", description: "Recursos e materiais", icon: FileText },
  { href: "/sondagens", label: "Sondagens", description: "Dá a tua opinião", icon: BarChart3 },
  { href: "/wiki", label: "Wiki", description: "Consulta os conteúdos", icon: BookOpen },
  { href: "/arquivo", label: "Arquivo", description: "Congressos e resoluções", icon: Archive },
];

function firstName(displayName: string) {
  return displayName.split(" ")[0];
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PortalHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Garante que existe perfil antes de pedir os dados relacionados (concelhia, etc.)
  await getOrCreateProfile(supabase, user);

  const [{ data: profile }, { data: recentPosts }, { data: upcomingEvents }] = await Promise.all([
    supabase
      .from("portal_profiles")
      .select("display_name, role, concelhia:concelhias!portal_profiles_concelhia_id_fkey(name)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("mural_posts")
      .select("id, title, created_at, author:portal_profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("portal_events")
      .select("id, title, starts_at, location")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(2),
  ]);

  const displayName = profile?.display_name ?? "Novo membro";
  const concelhiaName = (profile?.concelhia as any)?.name as string | undefined;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-jp-line bg-white p-6 dark:bg-jp-blue-deep/40">
        <p className="font-display text-2xl text-jp-blue-deep dark:text-white">
          Olá, {firstName(displayName)} 👋
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bem-vindo ao Portal da Juventude Popular.
        </p>

        {profile && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-jp-blue-tint px-3 py-1 text-xs font-medium text-jp-blue-deep dark:bg-jp-blue-mid/30 dark:text-white">
              {roleLabel(profile.role)}
            </span>
            {concelhiaName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-jp-blue-tint px-3 py-1 text-xs font-medium text-jp-blue-deep dark:bg-jp-blue-mid/30 dark:text-white">
                <MapPin className="h-3 w-3" />
                {concelhiaName}
              </span>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-jp-ink-soft">
          Acesso rápido
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-2 rounded-2xl border border-jp-line bg-white p-4 transition-colors hover:border-jp-blue dark:bg-jp-blue-deep/40"
            >
              <item.icon className="h-5 w-5 text-jp-blue" />
              <div>
                <p className="text-sm font-semibold text-jp-ink dark:text-white">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-wide text-jp-ink-soft">
              Novidades no mural
            </h2>
            <Link href="/mural" className="flex items-center gap-1 text-xs font-medium text-jp-blue hover:underline">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentPosts && recentPosts.length > 0 ? (
            <ul className="space-y-2">
              {recentPosts.map((post: any) => (
                <li key={post.id}>
                  <Link
                    href="/mural"
                    className="block rounded-xl border border-jp-line bg-white p-3 text-sm hover:border-jp-blue dark:bg-jp-blue-deep/40"
                  >
                    <p className="font-medium text-jp-ink dark:text-white">{post.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {post.author?.display_name ?? "Direção"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-jp-line p-6 text-center">
              <p className="text-sm font-medium text-jp-ink dark:text-white">Ainda não há novidades</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Quando houver novas publicações, aparecerão aqui.
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-wide text-jp-ink-soft">
              Próximos eventos
            </h2>
            <Link href="/eventos" className="flex items-center gap-1 text-xs font-medium text-jp-blue hover:underline">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {upcomingEvents && upcomingEvents.length > 0 ? (
            <ul className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <li key={event.id}>
                  <Link
                    href="/eventos"
                    className="block rounded-xl border border-jp-line bg-white p-3 text-sm hover:border-jp-blue dark:bg-jp-blue-deep/40"
                  >
                    <p className="font-medium text-jp-ink dark:text-white">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatEventDate(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-jp-line p-6 text-center">
              <p className="text-sm font-medium text-jp-ink dark:text-white">
                Sem eventos marcados
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assim que houver novas iniciativas, vais vê-las aqui.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
