import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/* O plano grátis do Supabase PAUSA o projeto após ~7 dias sem atividade (foi o que causou os
 * 504/ENOTFOUND do portal). Este cron diário faz uma leitura trivial para o manter ativo.
 * Se CRON_SECRET estiver definido na Vercel do portal, a Vercel envia-o e passa a ser exigido. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
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
