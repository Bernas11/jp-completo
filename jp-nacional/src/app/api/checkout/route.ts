import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getMilitanciaClient } from "@/lib/supabase";
import { z } from "zod";
import { SHOP_ENABLED } from "@/lib/features";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Configuração em falta: STRIPE_SECRET_KEY. Ver .env.example.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
}

const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      produtoId: z.string(),
      quantidade: z.number().int().min(1).max(10),
    })
  ).min(1).max(20),
  nome: z.string().trim().min(2),
  email: z.string().email(),
  morada: z.string().trim().min(5),
  codigoPostal: z.string().trim().min(4),
  localidade: z.string().trim().min(2),
});

export async function POST(req: NextRequest) {
  // loja desligada: nenhum pagamento pode ser iniciado (ver src/lib/features.ts)
  if (!SHOP_ENABLED) {
    return NextResponse.json({ error: "A loja não está disponível." }, { status: 404 });
  }

  const stripe = getStripe();
  try {
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items, nome, email, morada, codigoPostal, localidade } = parsed.data;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // O preço e a disponibilidade vêm sempre da base de dados, nunca do
    // que o cliente envia — a única coisa que se confia do pedido é o id
    // do produto e a quantidade.
    const militancia = getMilitanciaClient();
    const { data: produtos, error: produtosError } = await militancia
      .from("products")
      .select("id, name, description, price_cents, images, stock, active")
      .in("id", items.map((i) => i.produtoId));

    if (produtosError) {
      console.error("[api/checkout] erro a ler produtos:", produtosError);
      return NextResponse.json({ error: "Não foi possível validar os produtos." }, { status: 500 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const produto = produtos?.find((p) => p.id === item.produtoId);
      if (!produto || !produto.active) {
        return NextResponse.json({ error: `Produto não disponível.` }, { status: 400 });
      }
      if (produto.stock < item.quantidade) {
        return NextResponse.json(
          { error: `"${produto.name}" já não tem stock suficiente.` },
          { status: 400 }
        );
      }

      const primeiraImagem = produto.images?.[0]
        ? new URL(produto.images[0], siteUrl).toString()
        : undefined;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: produto.name,
            description: (produto.description ?? "").slice(0, 200),
            images: primeiraImagem ? [primeiraImagem] : undefined,
            metadata: { produtoId: produto.id },
          },
          unit_amount: produto.price_cents,
        },
        quantity: item.quantidade,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "multibanco", "mb_way"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email,
      shipping_address_collection: { allowed_countries: ["PT"] },
      success_url: `${siteUrl}/marca-jp/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/marca-jp`,
      metadata: { nome, email, morada, codigoPostal, localidade },
      locale: "pt",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[api/checkout]", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento." }, { status: 500 });
  }
}
