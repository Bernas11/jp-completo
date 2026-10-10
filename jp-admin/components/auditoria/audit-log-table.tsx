"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profile: { full_name: string; email: string } | null;
};

const actionLabels: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Eliminou",
  approve: "Aprovou",
  reject: "Recusou",
  revoke: "Revogou",
  login: "Iniciou sessão",
  export: "Exportou",
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  approve: "bg-green-100 text-green-800",
  reject: "bg-orange-100 text-orange-800",
  revoke: "bg-red-100 text-red-800",
  login: "bg-gray-100 text-gray-700",
  export: "bg-purple-100 text-purple-800",
};

export function AuditLogTable({
  entries,
  totalCount,
  pageSize,
  currentPage,
  filters,
  admins,
}: {
  entries: AuditEntry[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  filters: Record<string, string | undefined>;
  admins: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const updateFilters = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams();
      const merged = { ...filters, ...patch, page: patch.page ?? "1" };
      Object.entries(merged).forEach(([key, value]) => {
        if (value) next.set(key, value);
      });
      router.push(`${pathname}?${next.toString()}`);
    },
    [filters, pathname, router],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="font-headline text-2xl text-jp-ink">Registo de Auditoria</p>
        <p className="mt-1 text-sm text-jp-ink-soft">Histórico de ações realizadas por administradores na plataforma.</p>
      </div>

      <div className="surface-card flex flex-wrap gap-3 rounded-2xl border border-jp-line p-4">
        <select
          className="rounded-lg border border-jp-line px-3 py-2 text-sm"
          value={filters.action ?? ""}
          onChange={(e) => updateFilters({ action: e.target.value || undefined })}
          aria-label="Filtrar por ação"
        >
          <option value="">Todas as ações</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border border-jp-line px-3 py-2 text-sm"
          value={filters.profileId ?? ""}
          onChange={(e) => updateFilters({ profileId: e.target.value || undefined })}
          aria-label="Filtrar por administrador"
        >
          <option value="">Todos os utilizadores</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.full_name}
            </option>
          ))}
        </select>

        <Input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => updateFilters({ from: e.target.value || undefined })}
          className="w-40"
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => updateFilters({ to: e.target.value || undefined })}
          className="w-40"
          aria-label="Data final"
        />

        <Button
          variant="ghost"
          onClick={() => router.push(pathname)}
          className="text-muted-foreground"
        >
          Limpar filtros
        </Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-jp-blue/5">
            <tr>
              <th className="px-4 py-3 text-left">Ação</th>
              <th className="px-4 py-3 text-left">Utilizador</th>
              <th className="px-4 py-3 text-left">Entidade</th>
              <th className="px-4 py-3 text-left">Detalhes</th>
              <th className="px-4 py-3 text-left">Origem</th>
              <th className="px-4 py-3 text-left">Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Sem registos para os filtros selecionados.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-jp-line">
                <td className="px-4 py-3">
                  <Badge className={actionColors[entry.action] ?? "bg-gray-100 text-gray-700"}>
                    {actionLabels[entry.action] ?? entry.action}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{entry.profile?.full_name ?? "Sistema"}</p>
                  <p className="text-xs text-muted-foreground">{entry.profile?.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{entry.entity_type}</p>
                  {entry.entity_id && (
                    <p className="text-xs text-muted-foreground">{entry.entity_id.slice(0, 8)}…</p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </pre>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {entry.ip_address ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("pt-PT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {currentPage} de {totalPages} — {totalCount} registos
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => updateFilters({ page: String(currentPage - 1) })}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => updateFilters({ page: String(currentPage + 1) })}
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  );
}
