
export type ScopeNames = {
  districts: Record<string, string>;
  concelhias: Record<string, string>;
};

/** Nomes de todos os distritos e concelhias (tabelas pequenas, legíveis por qualquer utilizador autenticado). */
export async function loadScopeNames(supabase: any): Promise<ScopeNames> {
  const [{ data: districts }, { data: concelhias }] = await Promise.all([
    supabase.from("districts").select("id, name"),
    supabase.from("concelhias").select("id, name"),
  ]);
  return {
    districts: Object.fromEntries((districts ?? []).map((d: any) => [d.id, d.name])),
    concelhias: Object.fromEntries((concelhias ?? []).map((c: any) => [c.id, c.name])),
  };
}

/** "Nacional" · "Distrito de Guarda" · "Concelhia de Aguiar da Beira" */
export function scopeLabel(
  scope: "nacional" | "distrital" | "concelhia" | string,
  districtId: string | null | undefined,
  concelhiaId: string | null | undefined,
  names: ScopeNames,
) {
  if (scope === "concelhia") {
    const n = concelhiaId ? names.concelhias[concelhiaId] : null;
    return n ? `Concelhia de ${n}` : "Concelhia";
  }
  if (scope === "distrital") {
    const n = districtId ? names.districts[districtId] : null;
    return n ? `Distrito de ${n}` : "Distrital";
  }
  return "Nacional";
}
