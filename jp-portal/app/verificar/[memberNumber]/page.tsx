import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, XCircle } from "lucide-react";

// página pública, consultada por número de sócio — sempre dinâmica,
// nunca pré-renderizada no build (evita instanciar o client Supabase
// sem contexto de pedido)
export const dynamic = "force-dynamic";

export default async function VerificarCartaoPage({
  params,
}: {
  params: Promise<{ memberNumber: string }>;
}) {
  const { memberNumber } = await params;
  const supabase = createSupabaseAdminClient();

  // service_role necessário porque esta página é pública (sem sessão) e
  // portal_profiles não tem policy de select pública — devolvemos só os
  // três campos não sensíveis abaixo, nunca o objeto completo.
  const { data: profile } = await supabase
    .from("portal_profiles")
    .select("display_name, concelhia:concelhias!portal_profiles_concelhia_id_fkey(name), role")
    .eq("member_number", memberNumber)
    .maybeSingle();

  const isValid = !!profile && profile.role !== "simpatizante";

  return (
    <div className="mx-auto max-w-sm p-8 text-center">
      {isValid ? (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <p className="mt-3 font-display uppercase text-jp-blue-deep">Cartão Válido</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile!.display_name.split(" ")[0]} — {(profile!.concelhia as any)?.name}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{memberNumber}</p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <p className="mt-3 font-display uppercase text-red-600">Cartão Não Reconhecido</p>
        </>
      )}
    </div>
  );
}
