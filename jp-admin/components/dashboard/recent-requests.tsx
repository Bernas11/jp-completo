import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";

type Request = {
  id: string;
  full_name: string;
  created_at: string;
  status: "pendente" | "aprovado" | "recusado";
  concelhia_name: string | null;
};

const statusStyles: Record<Request["status"], string> = {
  pendente: "bg-amber-50 text-amber-700",
  aprovado: "bg-emerald-50 text-emerald-700",
  recusado: "bg-red-50 text-red-700",
};

const statusLabels: Record<Request["status"], string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const iconTones = ["bg-jp-blue", "bg-jp-blue-mid", "bg-jp-blue-deep"];

export function RecentRequestsTable({ requests }: { requests: Request[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-jp-line p-8 text-center text-sm text-jp-ink-soft">
        Ainda não há pedidos de filiação.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-jp-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-jp-line text-left text-xs uppercase text-jp-ink-soft">
            <th className="px-4 py-3 font-medium">Militante</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Concelhia</th>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr key={r.id} className="border-b border-jp-line last:border-0 hover:bg-jp-blue-tint">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${iconTones[i % iconTones.length]}`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-medium text-jp-ink">{r.full_name}</span>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-jp-ink-soft sm:table-cell">
                {r.concelhia_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-jp-ink-soft">
                {new Date(r.created_at).toLocaleDateString("pt-PT")}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[r.status]}`}>
                  {statusLabels[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        href="/militancia/pedidos"
        className="flex items-center justify-center gap-1.5 border-t border-jp-line py-3 text-sm font-medium text-jp-blue hover:bg-jp-blue-tint"
      >
        Ver todos os pedidos <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
