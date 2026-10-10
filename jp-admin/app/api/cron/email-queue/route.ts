import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/email-queue";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await processEmailQueue());
  } catch {
    return NextResponse.json({ error: "Falha ao processar a fila de emails" }, { status: 500 });
  }
}
