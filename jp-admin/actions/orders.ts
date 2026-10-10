"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

const orderEmailTemplateByStatus: Record<string, string> = {
  enviado: "order_shipped",
  entregue: "order_delivered",
  cancelado: "order_cancelled",
};

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pendente", "enviado", "entregue", "cancelado"]),
});

export const updateOrderStatus = roleProtectedActionClient("administrador")
  .schema(updateOrderStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: order, error: fetchError } = await ctx.supabase
      .from("orders")
      .select("id, status, profile:profiles(email, full_name)")
      .eq("id", parsedInput.orderId)
      .single();

    if (fetchError || !order) {
      throw new ActionError("Encomenda não encontrada.");
    }

    if (order.status === "cancelado" || order.status === "entregue") {
      throw new ActionError("Esta encomenda já está num estado final e não pode ser alterada.");
    }

    const { error: updateError } = await ctx.supabase
      .from("orders")
      .update({ status: parsedInput.status, updated_at: new Date().toISOString() })
      .eq("id", parsedInput.orderId);

    if (updateError) {
      throw new ActionError("Não foi possível atualizar o estado da encomenda.");
    }

    const templateKey = orderEmailTemplateByStatus[parsedInput.status];
    const profile = order.profile as unknown as { email: string; full_name: string } | null;

    if (templateKey && profile) {
      await ctx.supabase.from("email_queue").insert({
        template_key: templateKey,
        to_email: profile.email,
        to_name: profile.full_name,
        params: { orderId: order.id, status: parsedInput.status },
      });
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "order",
      entity_id: parsedInput.orderId,
      metadata: { from: order.status, to: parsedInput.status },
    });

    revalidatePath("/marca-jp/encomendas");

    return { success: true as const };
  });

const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  restockItems: z.boolean().default(true),
});

export const cancelOrder = roleProtectedActionClient("administrador")
  .schema(cancelOrderSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.restockItems) {
      const { data: items } = await ctx.supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", parsedInput.orderId);

      for (const item of items ?? []) {
        await ctx.supabase.rpc("adjust_product_stock", {
          p_product_id: item.product_id,
          p_delta: item.quantity,
        });
      }
    }

    const { error } = await ctx.supabase
      .from("orders")
      .update({ status: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", parsedInput.orderId);

    if (error) {
      throw new ActionError("Não foi possível cancelar a encomenda.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "order",
      entity_id: parsedInput.orderId,
      metadata: { cancelled: true, restocked: parsedInput.restockItems },
    });

    revalidatePath("/marca-jp/encomendas");

    return { success: true as const };
  });
