import { NextResponse } from "next/server";
import { processSyncOutbox } from "@/lib/sync-outbox";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await processSyncOutbox());
  } catch {
    return NextResponse.json({ error: "Falha ao ler a fila" }, { status: 500 });
  }
}
