import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCronAuthResult } from "@/lib/cron-auth";

/* O plano grátis do Supabase PAUSA o projeto após ~7 dias sem atividade (foi o que causou os
 * 504/ENOTFOUND do portal). Este cron diário faz uma leitura trivial para o manter ativo.
 * CRON_SECRET é obrigatório; sem ele o endpoint falha fechado e devolve 503. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authResult = getCronAuthResult(secret, request.headers.get("authorization"));
  if (authResult === "not_configured") {
    return NextResponse.json({ error: "Cron não configurado" }, { status: 503 });
  }
  if (authResult === "unauthorized") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { error } = await createSupabaseAdminClient()
    .from("districts")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[keepalive] falha na leitura:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
