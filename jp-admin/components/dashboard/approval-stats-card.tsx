import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ApprovalStatsCard({
  approved,
  pending,
  rejected,
}: {
  approved: number;
  pending: number;
  rejected: number;
}) {
  const total = approved + pending + rejected || 1;
  const rows = [
    { label: "Aprovados", value: approved, pct: (approved / total) * 100 },
    { label: "Pendentes", value: pending, pct: (pending / total) * 100 },
    { label: "Recusados", value: rejected, pct: (rejected / total) * 100 },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-jp-yellow bg-jp-yellow p-6">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/30" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-jp-blue-deep" />
          <p className="font-headline text-base text-jp-blue-deep">Pedidos de filiação</p>
        </div>

        <div className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs font-medium text-jp-blue-deep">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-white/50">
                <div
                  className="h-2 rounded-full bg-jp-blue-deep transition-all"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/estatisticas"
          className="mt-5 flex items-center gap-1.5 text-sm font-medium text-jp-blue-deep hover:underline"
        >
          Ver mais estatísticas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
