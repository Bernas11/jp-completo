"use client";

export type ScopeValue =
  | { scope: "nacional" }
  | { scope: "distrital"; scopeDistrictId: string }
  | { scope: "concelhia"; scopeConcelhiaId: string };

export type ModeratorContext = {
  role: string;
  ownDistrictId: string | null;
  ownDistrictName: string | null;
  ownConcelhiaId: string | null;
  ownConcelhiaName: string | null;
};

const NATIONAL_ROLES = ["cpn", "moderador_nacional"];

/**
 * Um moderador distrital só pode publicar no seu próprio distrito, e um
 * concelhio só na sua própria concelhia — a RLS (`portal_can_moderate_scope`)
 * já impõe isto na base de dados, mas o formulário não deve sequer oferecer
 * uma escolha que vai ser sempre rejeitada.
 */
export function ScopePicker({
  moderator,
  districts,
  concelhias,
  value,
  onChange,
}: {
  moderator: ModeratorContext;
  districts: { id: string; name: string }[];
  concelhias: { id: string; name: string }[];
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
}) {
  if (NATIONAL_ROLES.includes(moderator.role)) {
    return (
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Âmbito</label>
          <select
            value={value.scope}
            onChange={(e) => {
              const scope = e.target.value as ScopeValue["scope"];
              if (scope === "nacional") onChange({ scope: "nacional" });
              else if (scope === "distrital")
                onChange({ scope: "distrital", scopeDistrictId: districts[0]?.id ?? "" });
              else onChange({ scope: "concelhia", scopeConcelhiaId: concelhias[0]?.id ?? "" });
            }}
            className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-blue"
          >
            <option value="nacional">Nacional</option>
            <option value="distrital">Distrital</option>
            <option value="concelhia">Concelhia</option>
          </select>
        </div>

        {value.scope === "distrital" && (
          <select
            value={value.scopeDistrictId}
            onChange={(e) => onChange({ scope: "distrital", scopeDistrictId: e.target.value })}
            className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-blue"
          >
            <option value="">Escolhe um distrito…</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        {value.scope === "concelhia" && (
          <select
            value={value.scopeConcelhiaId}
            onChange={(e) => onChange({ scope: "concelhia", scopeConcelhiaId: e.target.value })}
            className="h-9 w-full rounded-lg border border-jp-line bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jp-blue"
          >
            <option value="">Escolhe uma concelhia…</option>
            {concelhias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  if (moderator.role === "moderador_distrital") {
    return (
      <p className="rounded-lg border border-jp-line bg-jp-blue-tint/40 px-3 py-2 text-sm text-jp-blue-deep">
        Âmbito: Distrital — {moderator.ownDistrictName ?? "o teu distrito"}
      </p>
    );
  }

  // moderador_concelhio
  return (
    <p className="rounded-lg border border-jp-line bg-jp-blue-tint/40 px-3 py-2 text-sm text-jp-blue-deep">
      Âmbito: Concelhia — {moderator.ownConcelhiaName ?? "a tua concelhia"}
    </p>
  );
}

/** Deriva o valor de âmbito inicial/fixo a partir do contexto do moderador. */
export function defaultScopeFor(moderator: ModeratorContext): ScopeValue {
  if (NATIONAL_ROLES.includes(moderator.role)) return { scope: "nacional" };
  if (moderator.role === "moderador_distrital") {
    return { scope: "distrital", scopeDistrictId: moderator.ownDistrictId ?? "" };
  }
  return { scope: "concelhia", scopeConcelhiaId: moderator.ownConcelhiaId ?? "" };
}
