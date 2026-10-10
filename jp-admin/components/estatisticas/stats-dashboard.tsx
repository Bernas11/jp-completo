"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useAction } from "next-safe-action/hooks";
import { motion } from "framer-motion";
import { Download, Loader2, TrendingUp, Users, MapPin, BarChart3, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportStatsExcel, exportStatsPdf } from "@/actions/stats";
import { exportMembersCsv, exportMembersExcel } from "@/actions/exports";
import { downloadBase64File, downloadTextFile } from "@/lib/download";

type GrowthRow = { month: string; new_members: number; cumulative_members: number };
type ApprovalRow = {
  month: string;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate_pct: number | null;
};
type ConcelhiaRow = {
  concelhia_id: string;
  concelhia_name: string;
  district_name: string;
  active: boolean;
  active_members: number;
  requests_last_90_days: number;
};
type DistrictRow = {
  district_id: string;
  district_name: string;
  concelhia_count: number;
  active_concelhia_count: number;
  active_members: number;
};

const JP_BLUE = "#0033c6";
const JP_YELLOW = "#fde021";
const JP_BLUE_MID = "#24399e";

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString("pt-PT", { month: "short", year: "2-digit" });
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function StatsDashboard({
  growth,
  approvalRate,
  concelhiaActivity,
  districtSummary,
}: {
  growth: GrowthRow[];
  approvalRate: ApprovalRow[];
  concelhiaActivity: ConcelhiaRow[];
  districtSummary: DistrictRow[];
}) {
  const pdfAction = useAction(exportStatsPdf, {
    onSuccess: ({ data }) => data && downloadBase64File(data.base64, data.filename, "application/pdf"),
  });
  const excelAction = useAction(exportStatsExcel, {
    onSuccess: ({ data }) =>
      data &&
      downloadBase64File(
        data.base64,
        data.filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
  });
  const membersCsvAction = useAction(exportMembersCsv, {
    onSuccess: ({ data }) => data && downloadTextFile(data.csv, data.filename, "text/csv;charset=utf-8"),
  });
  const membersExcelAction = useAction(exportMembersExcel, {
    onSuccess: ({ data }) =>
      data &&
      downloadBase64File(
        data.base64,
        data.filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
  });

  const totalActiveMembers = districtSummary.reduce((sum, d) => sum + d.active_members, 0);
  const totalActiveConcelhias = districtSummary.reduce((sum, d) => sum + d.active_concelhia_count, 0);
  const latestApprovalRate = approvalRate.at(-1)?.approval_rate_pct ?? null;
  const inactiveConcelhias = concelhiaActivity.filter((c) => c.requests_last_90_days === 0);

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p className="font-headline text-2xl text-jp-ink">Dashboard Estatístico</p>
          <p className="mt-0.5 text-sm text-jp-ink-soft">
            Visão geral da militância a nível nacional
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-jp-line text-jp-ink hover:bg-jp-blue-tint2"
            onClick={() => excelAction.execute({})}
            disabled={excelAction.isExecuting}
          >
            {excelAction.isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
          <Button
            className="bg-jp-blue text-white hover:bg-jp-blue-deep"
            onClick={() => pdfAction.execute({})}
            disabled={pdfAction.isExecuting}
          >
            {pdfAction.isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard index={1} icon={Users} label="Militantes Ativos" value={totalActiveMembers.toLocaleString("pt-PT")} />
        <KpiCard index={2} icon={MapPin} label="Concelhias Ativas" value={String(totalActiveConcelhias)} />
        <KpiCard
          index={3}
          icon={TrendingUp}
          label="Taxa de Aprovação (mês atual)"
          value={latestApprovalRate !== null ? `${latestApprovalRate}%` : "—"}
        />
      </div>

      {/* Crescimento de militantes */}
      <ChartCard index={4} title="Crescimento de Militantes">
        {growth.length === 0 ? (
          <EmptyChart message="Ainda não há histórico de adesões para mostrar." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growth}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={JP_BLUE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={JP_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f1" />
              <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="#4a5591" />
              <YAxis fontSize={12} stroke="#4a5591" />
              <Tooltip labelFormatter={formatMonth} />
              <Area
                type="monotone"
                dataKey="cumulative_members"
                name="Total acumulado"
                stroke={JP_BLUE}
                fill="url(#growthGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Aprovações vs recusas */}
      <ChartCard index={5} title="Aprovações / Recusas por Mês">
        {approvalRate.length === 0 ? (
          <EmptyChart message="Ainda não há pedidos processados este período." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={approvalRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f1" />
              <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="#4a5591" />
              <YAxis fontSize={12} stroke="#4a5591" />
              <Tooltip labelFormatter={formatMonth} />
              <Legend />
              <Bar dataKey="approved" name="Aprovados" fill={JP_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" name="Recusados" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Taxa de aprovação ao longo do tempo */}
      <ChartCard index={6} title="Evolução da Taxa de Aprovação">
        {approvalRate.length === 0 ? (
          <EmptyChart message="Sem dados suficientes para calcular a evolução." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={approvalRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f1" />
              <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="#4a5591" />
              <YAxis fontSize={12} unit="%" stroke="#4a5591" />
              <Tooltip labelFormatter={formatMonth} formatter={(v) => [`${v}%`, "Taxa de aprovação"]} />
              <Line
                type="monotone"
                dataKey="approval_rate_pct"
                stroke={JP_BLUE_MID}
                strokeWidth={2}
                dot={{ fill: JP_YELLOW, stroke: JP_BLUE_MID, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Concelhias mais ativas vs inativas */}
      <ChartCard index={7} title="Concelhias Mais Ativas vs Inativas">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 font-display text-xs uppercase tracking-wide text-jp-ink-soft">
              Top 10 mais ativas
            </p>
            {concelhiaActivity.length === 0 ? (
              <EmptyList message="Sem concelhias com atividade registada ainda." />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {concelhiaActivity.slice(0, 10).map((c) => (
                  <li
                    key={c.concelhia_id}
                    className="flex items-center justify-between rounded-xl border border-jp-line bg-white px-3 py-2.5"
                  >
                    <span className="text-jp-ink">
                      {c.concelhia_name}{" "}
                      <span className="text-xs text-jp-ink-soft">({c.district_name})</span>
                    </span>
                    <span className="font-display text-jp-blue-deep">{c.active_members}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-3 font-display text-xs uppercase tracking-wide text-jp-ink-soft">
              Sem pedidos nos últimos 90 dias
            </p>
            {inactiveConcelhias.length === 0 ? (
              <EmptyList message="Todas as concelhias tiveram atividade recente." positive />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {inactiveConcelhias.slice(0, 10).map((c) => (
                  <li
                    key={c.concelhia_id}
                    className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5"
                  >
                    <span className="text-jp-ink">
                      {c.concelhia_name}{" "}
                      <span className="text-xs text-jp-ink-soft">({c.district_name})</span>
                    </span>
                    <span className="text-xs font-medium text-red-600">inativa</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ChartCard>

      <ChartCard title="Exportar lista de militantes" index={5}>
        <p className="mb-4 text-sm text-jp-ink-soft">
          Lista completa de militantes ativos, com concelhia e distrito. Ficheiro descarregado
          diretamente, sem ficar guardado no servidor.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-jp-line text-jp-ink hover:bg-jp-blue-tint2"
            onClick={() => membersCsvAction.execute({})}
            disabled={membersCsvAction.isExecuting}
          >
            {membersCsvAction.isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            className="border-jp-line text-jp-ink hover:bg-jp-blue-tint2"
            onClick={() => membersExcelAction.execute({})}
            disabled={membersExcelAction.isExecuting}
          >
            {membersExcelAction.isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </div>
        {(membersCsvAction.result.serverError || membersExcelAction.result.serverError) && (
          <p className="mt-3 text-sm text-red-600">
            {membersCsvAction.result.serverError ?? membersExcelAction.result.serverError}
          </p>
        )}
      </ChartCard>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      className="rounded-2xl border border-jp-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-jp-blue-tint">
          <Icon className="h-5 w-5 text-jp-blue" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-jp-ink-soft">{label}</p>
          <p className="font-headline text-2xl text-jp-ink">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({
  title,
  children,
  index,
}: {
  title: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      className="rounded-2xl border border-jp-line bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 font-display text-sm uppercase tracking-wide text-jp-blue-deep">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-jp-line bg-jp-blue-tint/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
        <BarChart3 className="h-5 w-5 text-jp-ink-soft" strokeWidth={1.75} />
      </div>
      <p className="max-w-[220px] text-center text-sm text-jp-ink-soft">{message}</p>
    </div>
  );
}

function EmptyList({ message, positive }: { message: string; positive?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-jp-line bg-jp-blue-tint/40 px-4 py-8">
      <Inbox className={positive ? "h-5 w-5 text-jp-blue" : "h-5 w-5 text-jp-ink-soft"} strokeWidth={1.75} />
      <p className="text-center text-sm text-jp-ink-soft">{message}</p>
    </div>
  );
}
