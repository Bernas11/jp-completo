import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const requestSchema = z.object({
  membershipRequestId: z.string().uuid(),
});

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const BREVO_APPROVED_TEMPLATE_ID = Number(Deno.env.get("BREVO_APPROVED_TEMPLATE_ID")!);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  const { data: reviewerProfile, error: reviewerError } = await supabaseUser
    .from("profiles")
    .select("id, role")
    .eq("id", userData.user.id)
    .single();

  if (
    reviewerError ||
    !reviewerProfile ||
    !["cpn", "administrador"].includes(reviewerProfile.role)
  ) {
    return new Response(JSON.stringify({ error: "Sem permissão para aprovar filiações" }), {
      status: 403,
    });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Corpo do pedido inválido" }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: membershipRequest, error: fetchError } = await supabaseAdmin
    .from("membership_requests")
    .select("*, concelhia:concelhias(id, district_id)")
    .eq("id", body.membershipRequestId)
    .single();

  if (fetchError || !membershipRequest) {
    return new Response(JSON.stringify({ error: "Pedido de filiação não encontrado" }), {
      status: 404,
    });
  }

  if (membershipRequest.status !== "pendente") {
    return new Response(JSON.stringify({ error: "Este pedido já foi processado" }), {
      status: 409,
    });
  }

  const { data: memberId, error: rpcError } = await supabaseAdmin.rpc(
    "approve_membership_transaction",
    {
      p_membership_request_id: membershipRequest.id,
      p_reviewer_profile_id: reviewerProfile.id,
    },
  );

  if (rpcError) {
    console.error("approve_membership_transaction falhou:", rpcError);
    return new Response(JSON.stringify({ error: "Falha ao aprovar filiação" }), { status: 500 });
  }

  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        to: [{ email: membershipRequest.email, name: membershipRequest.full_name }],
        templateId: BREVO_APPROVED_TEMPLATE_ID,
        params: { fullName: membershipRequest.full_name },
      }),
    });
  } catch (emailError) {
    console.error("Falha ao enviar email de aprovação:", emailError);
  }

  return new Response(JSON.stringify({ memberId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
