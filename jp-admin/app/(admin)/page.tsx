import Link from "next/link";
import {
  Users,
  Landmark,
  BarChart3,
  FileText,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  CalendarDays,
  ArrowRight,
  Newspaper,
  Bell,
  Home as HomeIcon,
} from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { greeting } from "@/lib/auth/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { RecentRequestsTable } from "@/components/dashboard/recent-requests";
import { ApprovalStatsCard } from "@/components/dashboard/approval-stats-card";
import { NextEventCard } from "@/components/dashboard/next-event-card";

export const dynamic = "force-dynamic";

const areas = [
  { href: "/militancia/pedidos", icon: Users, title: "Militantes e Adesões", description: "Rever e aprovar pedidos de adesão pendentes." },
  { href: "/militancia/membros", icon: UserCheck, title: "Militantes", description: "Lista de militantes aprovados, exportar e revogar filiações." },
  { href: "/estrutura/concelhias", icon: Landmark, title: "Estruturas", description: "Concelhias, distritais e órgãos nacionais." },
  { href: "/estatisticas", icon: BarChart3, title: "Dados e Estatísticas", description: "Crescimento da militância e taxas de aprovação." },
  { href: "/noticias", icon: Newspaper, title: "Notícias", description: "Notícias públicas mostradas no JP-Nacional." },
  { href: "/documentacao", icon: FileText, title: "Documentos", description: "Documentação institucional e comunicações." },
  { href: "/loja/produtos", icon: ShoppingBag, title: "Loja", description: "Produtos e encomendas da Juventude Popular." },
  { href: "/administradores", icon: ShieldCheck, title: "Administração", description: "Gestão de contas administrativas e auditoria." },
];

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function HomePage() {
  const profile = await requireProfile();
  const firstName = profile.fullName.split(" ")[0];
  const supabase = await createSupabaseServerClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [
    { count: activeMembers },
    { count: pendingRequests },
    { count: approvedRequests },
    { count: rejectedRequests },
    { count: activeConcelhias },
    { count: upcomingEventsCount },
    { data: nextEventRow },
    { data: joinedRows },
    { data: recentRequestsRaw },
  ] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("membership_requests").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("membership_requests").select("id", { count: "exact", head: true }).eq("status", "aprovado"),
    supabase.from("membership_requests").select("id", { count: "exact", head: true }).eq("status", "recusado"),
    supabase.from("concelhias").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    supabase
      .from("events")
      .select("title, starts_at, location")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("members").select("joined_at").eq("status", "ativo").gte("joined_at", sixMonthsAgo.toISOString()),
    supabase
      .from("membership_requests")
      .select("id, full_name, created_at, status, concelhia:concelhias(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const monthBuckets: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthBuckets.push({ month: MONTH_LABELS[d.getMonth()], total: 0 });
  }
  for (const row of joinedRows ?? []) {
    const d = new Date(row.joined_at);
    const monthLabel = MONTH_LABELS[d.getMonth()];
    const bucket = monthBuckets.find((b) => b.month === monthLabel);
    if (bucket) bucket.total += 1;
  }
  let running = 0;
  const growthData = monthBuckets.map((b) => {
    running += b.total;
    return { month: b.month, total: running };
  });

  const recentRequests = (recentRequestsRaw ?? []).map((r: any) => ({
    id: r.id,
    full_name: r.full_name,
    created_at: r.created_at,
    status: r.status,
    concelhia_name: r.concelhia?.name ?? null,
  }));

  const today = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho, tipo "Hi Thomas 👋" da referência */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-headline text-2xl text-jp-ink">
            {greeting()}, {firstName} 👋
          </p>
          <p className="text-sm text-jp-ink-soft">{profile.cargo}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-jp-line bg-white p-1 sm:flex">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full bg-jp-blue-tint2 px-3 py-1.5 text-xs font-medium text-jp-blue"
            >
              <HomeIcon className="h-3.5 w-3.5" /> Início
            </Link>
            <Link
              href="/militancia/pedidos"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-jp-ink-soft hover:bg-jp-blue-tint"
            >
              + Rever pedidos
            </Link>
          </div>
          <button
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-jp-line bg-white text-jp-ink-soft hover:text-jp-blue"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="hidden text-right text-xs text-jp-ink-soft sm:block">
            <p className="font-medium text-jp-ink">
              {today.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p>{today.toLocaleDateString("pt-PT", { day: "numeric", month: "short", weekday: "long" })}</p>
          </div>
        </div>
      </div>

      {/* Linha de estatísticas, estilo cartão com mancha decorativa */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Militantes ativos" value={String(activeMembers ?? 0)} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard title="Concelhias ativas" value={String(activeConcelhias ?? 0)} icon={<Landmark className="h-5 w-5" />} />
        <StatCard
          title="Pedidos pendentes"
          value={String(pendingRequests ?? 0)}
          hint={pendingRequests ? "Precisam da tua atenção" : "Tudo em dia"}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard title="Eventos agendados" value={String(upcomingEventsCount ?? 0)} icon={<CalendarDays className="h-5 w-5" />} tone="yellow" />
      </div>

      {/* Gráfico + estatísticas de aprovação, como o gráfico + cartão verde da referência */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-jp-line bg-white p-6 lg:col-span-2">
          <div className="mb-4">
            <p className="font-headline text-lg text-jp-ink">Crescimento da militância</p>
            <p className="text-sm text-jp-ink-soft">Militantes ativos acumulados, últimos 6 meses</p>
          </div>
          <GrowthChart data={growthData} />
        </div>

        <ApprovalStatsCard
          approved={approvedRequests ?? 0}
          pending={pendingRequests ?? 0}
          rejected={rejectedRequests ?? 0}
        />
      </div>

      {/* Tabela de pedidos recentes + próximo evento, como "Last notes" + "Teamwork" da referência */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-4 font-headline text-lg text-jp-ink">Pedidos de filiação recentes</p>
          <RecentRequestsTable requests={recentRequests} />
        </div>
        <div>
          <p className="mb-4 font-headline text-lg text-jp-ink">&nbsp;</p>
          <NextEventCard event={nextEventRow ?? null} />
        </div>
      </div>

      <div>
        <p className="mb-4 font-headline text-lg text-jp-ink">Acesso rápido</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="group rounded-2xl border border-jp-line bg-white p-5 transition-all hover:-translate-y-1 hover:border-jp-blue/30 hover:shadow-lg hover:shadow-jp-blue/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jp-blue-tint2 text-jp-blue">
                <area.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-medium text-jp-ink">{area.title}</p>
              <p className="mt-1 text-sm text-jp-ink-soft">{area.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
