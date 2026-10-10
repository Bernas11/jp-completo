import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AdesaoSchema, DOCUMENTO_TIPOS_VALIDOS, DOCUMENTO_TAMANHO_MAXIMO } from "@/lib/validation";
import { getMilitanciaClient } from "@/lib/supabase";
import { enviarEmailAdesaoMilitante, enviarEmailAdesaoCPN } from "@/lib/email";
import { adesaoLimiter, getClientIp } from "@/lib/rate-limit";
import CONCELHOS_POR_DISTRITO from "@/lib/concelhos-por-distrito.json";
import { DEMO_MODE } from "@/lib/features";

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json(
      { error: "Este protótipo não aceita pedidos reais de adesão." },
      { status: 503 },
    );
  }

  try {
    const ip = getClientIp(req);
    const { success } = await adesaoLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados pedidos. Tenta novamente dentro de alguns minutos." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const documento = formData.get("documento");

    // Honeypot anti-spam: campo invisível no formulário que só um bot preenche
    const honeypot = formData.get("website");
    if (typeof honeypot === "string" && honeypot.length > 0) {
      // Responde com sucesso falso para não dar sinal ao bot, mas não regista nada
      return NextResponse.json({ ok: true });
    }

    const raw = Object.fromEntries(
      Array.from(formData.entries()).filter(([k]) => k !== "documento" && k !== "website")
    );

    const parsed = AdesaoSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (!(documento instanceof File)) {
      return NextResponse.json({ error: "Documento de identificação em falta." }, { status: 400 });
    }
    if (!DOCUMENTO_TIPOS_VALIDOS.includes(documento.type as (typeof DOCUMENTO_TIPOS_VALIDOS)[number])) {
      return NextResponse.json({ error: "Formato de documento inválido." }, { status: 400 });
    }
    if (documento.size > DOCUMENTO_TAMANHO_MAXIMO) {
      return NextResponse.json({ error: "Documento excede o tamanho máximo de 8MB." }, { status: 400 });
    }

    const dados = parsed.data;
    const supabase = getMilitanciaClient();

    // 1. Atribuir distrito e concelhia ao militante, exatamente os que ele
    // indicou no formulário. Não existe "candidatura concelhia": a adesão
    // é sempre nacional, por isso o distrito e o concelho escolhidos aqui
    // são os que passam a ser os dele (a aprovação deriva o distrito do
    // perfil a partir da concelhia — approve_membership_transaction).
    //
    // ANTES: comparava com ilike (trata % e _ como wildcards e é sensível
    // a acentos) e, se não encontrasse a concelhia — só existem algumas
    // na tabela — caía na "Por atribuir", que pertence ao distrito de
    // LISBOA. Resultado: quase todos os militantes ficavam com distrito e
    // concelhia errados. AGORA: compara normalizado e, se a concelhia
    // ainda não existir, cria-a (inativa, sem moderador) no distrito certo.
    const normalizar = (v: string) =>
      v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

    const { data: distritos } = await supabase.from("districts").select("id, name");
    const district = (distritos ?? []).find((d: { id: string; name: string }) => normalizar(d.name) === normalizar(dados.distrito));
    if (!district) {
      return NextResponse.json({ error: "Distrito inválido." }, { status: 400 });
    }

    const { data: concelhiasDoDistrito } = await supabase
      .from("concelhias")
      .select("id, name")
      .eq("district_id", district.id);

    const concelhoNome = (CONCELHOS_POR_DISTRITO as Record<string, string[]>)[district.name]?.find(
      (c) => normalizar(c) === normalizar(dados.concelho),
    );

    let concelhiaId: string | null =
      (concelhiasDoDistrito ?? []).find((c: { id: string; name: string }) => normalizar(c.name) === normalizar(concelhoNome ?? dados.concelho))
        ?.id ?? null;

    if (!concelhiaId) {
      if (concelhoNome) {
        // concelho do continente que ainda não tem concelhia: cria-a inativa
        const slugBase = normalizar(concelhoNome).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const { data: criada, error: criarErro } = await supabase
          .from("concelhias")
          .insert({ name: concelhoNome, slug: slugBase, district_id: district.id, active: false })
          .select("id")
          .single();
        if (criarErro || !criada) {
          // corrida (dois pedidos em simultâneo) ou slug já usado: volta a procurar
          const { data: existente } = await supabase.from("concelhias").select("id").eq("slug", slugBase).maybeSingle();
          concelhiaId = existente?.id ?? null;
        } else {
          concelhiaId = criada.id;
        }
      } else {
        // Açores/Madeira: não há lista oficial de concelhos aqui. Usa a
        // estrutura regional já existente nesse distrito (ex: "R.A. Açores").
        concelhiaId = (concelhiasDoDistrito ?? [])[0]?.id ?? null;
      }
    }

    if (!concelhiaId) {
      console.error("[api/adesao] não foi possível atribuir concelhia", { distrito: dados.distrito, concelho: dados.concelho });
      return NextResponse.json({ error: "Não foi possível atribuir a concelhia indicada. Verifica o concelho." }, { status: 400 });
    }

    // 2. Inserir o pedido de filiação, estado "pendente"
    const { data: request, error: insertError } = await supabase
      .from("membership_requests")
      .insert({
        full_name: dados.nome,
        birth_date: dados.dataNascimento,
        email: dados.email,
        phone: dados.telemovel,
        education_or_workplace: dados.estabelecimentoEnsino || dados.localTrabalho || null,
        address: dados.morada,
        address_number: dados.numero || null,
        city: dados.localidade,
        postal_code: dados.codigoPostal || null,
        concelhia_id: concelhiaId,
        citizen_card_number: dados.numeroCC,
        guardian_name: dados.encNome || null,
        guardian_contact: dados.encContacto || null,
        status: "pendente",
      })
      .select("id")
      .single();

    if (insertError || !request) {
      console.error("[api/adesao] erro ao inserir pedido de filiação:", insertError);
      return NextResponse.json({ error: "Erro ao registar a adesão. Tenta novamente." }, { status: 500 });
    }

    // 3. Upload do documento para o bucket privado, associado ao pedido
    const extensao = documento.name.split(".").pop() || "bin";
    const caminho = `pendentes/${request.id}/${randomUUID()}.${extensao}`;
    const bytes = new Uint8Array(await documento.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("documentos-identificacao")
      .upload(caminho, bytes, { contentType: documento.type, upsert: false });

    if (uploadError) {
      console.error("[api/adesao] erro ao guardar documento:", uploadError);
      // Reverte o pedido para não ficar um pedido "pendente" sem documento associado
      await supabase.from("membership_requests").delete().eq("id", request.id);
      return NextResponse.json({ error: "Erro ao guardar o documento. Tenta novamente." }, { status: 500 });
    }

    await supabase
      .from("membership_requests")
      .update({ citizen_card_storage_path: caminho })
      .eq("id", request.id);

    // 4. Registo de auditoria da submissão
    await supabase.from("audit_log").insert({
      profile_id: null,
      action: "create",
      entity_type: "membership_request",
      entity_id: request.id,
      metadata: { ip },
      ip_address: ip,
    });

    // 5. Emails de confirmação — falhas aqui não fazem reverter a adesão,
    // apenas ficam registadas em log para reenvio manual se necessário.
    try {
      await Promise.all([
        enviarEmailAdesaoMilitante({ nome: dados.nome, email: dados.email, concelho: dados.concelho }),
        enviarEmailAdesaoCPN({
          nome: dados.nome,
          email: dados.email,
          telemovel: dados.telemovel,
          concelho: dados.concelho,
          distrito: dados.distrito,
          militanteId: request.id,
        }),
      ]);
    } catch (emailErr) {
      console.error("[api/adesao] erro ao enviar emails de confirmação:", emailErr);
    }

    return NextResponse.json({ ok: true, id: request.id });
  } catch (err) {
    console.error("[api/adesao] erro inesperado:", err);
    return NextResponse.json({ error: "Erro inesperado. Tenta novamente." }, { status: 500 });
  }
}
