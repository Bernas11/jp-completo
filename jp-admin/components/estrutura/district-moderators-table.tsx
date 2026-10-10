"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { assignDistrictModerator } from "@/actions/districts";

type Row = {
  id: string;
  name: string;
  moderatorId: string | null;
  candidates: { id: string; full_name: string; concelhia: string }[];
};

export function DistrictModeratorsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const action = useAction(assignDistrictModerator, { onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <div>
        <p className="font-headline text-2xl text-jp-ink">Moderadores Distritais</p>
        <p className="mt-1 text-sm text-jp-ink-soft">
          Cada distrito tem um moderador, escolhido entre os militantes das suas concelhias. Modera e publica no
          Portal ao nível do distrito. Ao substituí-lo, o anterior volta a militante.
        </p>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-jp-blue/5">
            <tr>
              <th className="px-4 py-3 text-left">Distrito</th>
              <th className="px-4 py-3 text-left">Militantes elegíveis</th>
              <th className="px-4 py-3 text-left">Moderador</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-jp-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-jp-blue" />
                    <span className="font-medium text-jp-blue-deep">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="border-jp-line font-normal">
                    {row.candidates.length}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-jp-line px-2 py-1 text-sm"
                    value={row.moderatorId ?? ""}
                    disabled={action.isExecuting}
                    onChange={(e) =>
                      action.execute({ districtId: row.id, moderatorProfileId: e.target.value || null })
                    }
                  >
                    <option value="">Sem moderador</option>
                    {row.candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} — {c.concelhia}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}
    </div>
  );
}
