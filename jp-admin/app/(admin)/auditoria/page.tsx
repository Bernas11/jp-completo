import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditLogTable } from "@/components/auditoria/audit-log-table";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/shared/states";

const PAGE_SIZE = 30;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityType?: string;
    profileId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select(
      "id, action, entity_type, entity_id, metadata, ip_address, created_at, profile:profiles(full_name, email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.action) query = query.eq("action", params.action);
  if (params.entityType) query = query.eq("entity_type", params.entityType);
  if (params.profileId) query = query.eq("profile_id", params.profileId);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);

  const { data, count, error } = await query;

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar a auditoria"
        description="Confirma que tens permissões para esta área."
      />
    );
  }

  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["cpn", "administrador", "moderador_nacional", "moderador_distrital", "moderador_concelhio"])
    .order("full_name");

  const entries = (data ?? []).map((entry) => ({
    ...entry,
    profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile,
  }));

  return (
    <AuditLogTable
      entries={entries}
      totalCount={count ?? 0}
      pageSize={PAGE_SIZE}
      currentPage={page}
      filters={params}
      admins={adminProfiles ?? []}
    />
  );
}
