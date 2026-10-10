import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { enviarEmailEncomenda } from "@/lib/email";
import { formatPreco } from "@/lib/produtos";
import { getMilitanciaClient } from "@/lib/supabase";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Configuração em falta: STRIPE_SECRET_KEY. Ver .env.example.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook secret não configurado." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const militancia = getMilitanciaClient();

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      });

      const items = lineItems.data.map((li) => {
        const prod = li.price?.product as Stripe.Product | undefined;
        const produtoId = prod?.metadata?.produtoId || "";

        return {
          nome: prod?.name || li.description || "Produto",
          quantidade: li.quantity || 1,
          preco: formatPreco(li.amount_total || 0),
          produtoId,
          unitAmount: li.price?.unit_amount || 0,
        };
      });

      const nome = session.metadata?.nome || session.customer_email || "Cliente";
      const email = session.customer_email || session.metadata?.email || "";
      const total = formatPreco(session.amount_total || 0);

      // Regista a encomenda no Projeto Militância (para aparecer em
      // JP-Admin → Loja → Encomendas) e baixa o stock. Antes disto, uma
      // compra real nunca ficava registada em lado nenhum — só um email
      // de confirmação era enviado.
      const { data: order, error: orderError } = await militancia
        .from("orders")
        .insert({
          guest_name: nome,
          guest_email: email || null,
          total_cents: session.amount_total || 0,
          shipping_address: {
            morada: session.metadata?.morada ?? null,
            codigoPostal: session.metadata?.codigoPostal ?? null,
            localidade: session.metadata?.localidade ?? null,
          },
          stripe_session_id: session.id,
        })
        .select("id")
        .single();

      if (orderError) {
        // stripe_session_id é único — se já existir, esta sessão já foi
        // processada (reentrega do webhook); não é um erro real.
        if (orderError.code === "23505") {
          console.log(`[stripe-webhook] sessão ${session.id} já processada, a ignorar.`);
        } else {
          throw orderError;
        }
      } else if (order) {
        const validItems = items.filter((i) => i.produtoId);
        if (validItems.length > 0) {
          await militancia.from("order_items").insert(
            validItems.map((i) => ({
              order_id: order.id,
              product_id: i.produtoId,
              quantity: i.quantidade,
              unit_price_cents: i.unitAmount,
            })),
          );
        }

        for (const item of validItems) {
          const { error: stockError } = await militancia.rpc("adjust_product_stock", {
            p_product_id: item.produtoId,
            p_delta: -item.quantidade,
          });
          if (stockError) {
            console.error(`[stripe-webhook] falha ao baixar stock de ${item.produtoId}:`, stockError);
          }
        }
      }

      if (email) {
        await enviarEmailEncomenda({
          nome,
          email,
          items,
          total,
          encomendaId: session.id.slice(-8).toUpperCase(),
        });
      }

      console.log(`[stripe-webhook] encomenda ${session.id} processada — ${nome} (${email})`);
    } catch (err) {
      console.error("[stripe-webhook] erro a processar encomenda:", err);
      // devolve 500 para o Stripe reentregar o evento mais tarde
      return NextResponse.json({ error: "Erro ao processar encomenda." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

// O Stripe precisa do body raw para verificar a assinatura
export const runtime = "nodejs";
