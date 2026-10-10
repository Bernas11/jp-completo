import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPortalClient } from "@/lib/supabase";
import { newsletterLimiter, getClientIp } from "@/lib/rate-limit";
import { DEMO_MODE } from "@/lib/features";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: "A newsletter está desativada nesta demonstração." },
      { status: 503 },
    );
  }

  try {
    const ip = getClientIp(req);
    const { success } = await newsletterLimiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Demasiados pedidos. Tenta novamente dentro de instantes." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Email inválido." }, { status: 400 });

    const supabase = getPortalClient();
    const { error } = await supabase
      .from("newsletter_subscritores")
      .upsert({ email: parsed.data.email }, { onConflict: "email" });

    if (error) {
      console.error("[api/newsletter] erro ao gravar subscrição:", error);
      return NextResponse.json({ error: "Não foi possível subscrever. Tenta novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/newsletter]", err);
    return NextResponse.json({ error: "Erro ao subscrever." }, { status: 500 });
  }
}
