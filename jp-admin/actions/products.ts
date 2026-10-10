"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { roleProtectedActionClient, ActionError } from "@/lib/safe-action";

const createProductSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
});

export const createProduct = roleProtectedActionClient("administrador")
  .schema(createProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: product, error } = await ctx.supabase
      .from("products")
      .insert({
        name: parsedInput.name,
        description: parsedInput.description ?? null,
        price_cents: parsedInput.priceCents,
        stock: parsedInput.stock,
        image_url: parsedInput.imageUrl ?? null,
      })
      .select("id")
      .single();

    if (error || !product) {
      throw new ActionError("Não foi possível criar o produto.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "create",
      entity_type: "product",
      entity_id: product.id,
      metadata: { name: parsedInput.name },
    });

    revalidatePath("/marca-jp/produtos");
    revalidatePath("/loja"); // catálogo público

    return { productId: product.id };
  });

const updateProductSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
});

export const updateProduct = roleProtectedActionClient("administrador")
  .schema(updateProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("products")
      .update({
        name: parsedInput.name,
        description: parsedInput.description ?? null,
        price_cents: parsedInput.priceCents,
        image_url: parsedInput.imageUrl ?? null,
      })
      .eq("id", parsedInput.productId);

    if (error) {
      throw new ActionError("Não foi possível atualizar o produto.");
    }

    revalidatePath("/marca-jp/produtos");
    revalidatePath("/loja");

    return { success: true as const };
  });

// ajuste de stock separado da edição geral: é uma operação sensível
// (afeta disponibilidade de compra em tempo real) e fica mais seguro
// como um incremento/decremento atómico em vez de um "set" arbitrário
const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3).max(300),
});

export const adjustProductStock = roleProtectedActionClient("administrador")
  .schema(adjustStockSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase.rpc("adjust_product_stock", {
      p_product_id: parsedInput.productId,
      p_delta: parsedInput.delta,
    });

    if (error) {
      throw new ActionError(error.message ?? "Não foi possível ajustar o stock.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "update",
      entity_type: "product",
      entity_id: parsedInput.productId,
      metadata: { delta: parsedInput.delta, reason: parsedInput.reason, newStock: data },
    });

    revalidatePath("/marca-jp/produtos");
    revalidatePath("/loja");

    return { newStock: data as number };
  });

const toggleProductActiveSchema = z.object({
  productId: z.string().uuid(),
  active: z.boolean(),
});

export const toggleProductActive = roleProtectedActionClient("administrador")
  .schema(toggleProductActiveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("products")
      .update({ active: parsedInput.active })
      .eq("id", parsedInput.productId);

    if (error) {
      throw new ActionError("Não foi possível alterar a disponibilidade do produto.");
    }

    revalidatePath("/marca-jp/produtos");
    revalidatePath("/loja");

    return { success: true as const };
  });

/* ELIMINAR — a FK order_items.product_id é ON DELETE RESTRICT (por design:
 * preserva o histórico de encomendas já feitas), por isso um produto com
 * encomendas associadas não pode ser apagado fisicamente sem perder esse
 * histórico. Nesse caso, seguimos o mesmo padrão que já existe no projeto
 * para este problema (toggleProductActive): desativamos em vez de apagar,
 * e explicamos porquê. Um produto sem nenhuma encomenda associada pode ser
 * apagado fisicamente em segurança. */
const deleteProductSchema = z.object({ productId: z.string().uuid() });

export const deleteProduct = roleProtectedActionClient("administrador")
  .schema(deleteProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { count, error: countError } = await ctx.supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", parsedInput.productId);

    if (countError) {
      throw new ActionError("Não foi possível verificar encomendas associadas a este produto.");
    }

    if ((count ?? 0) > 0) {
      const { error: deactivateError } = await ctx.supabase
        .from("products")
        .update({ active: false })
        .eq("id", parsedInput.productId);

      if (deactivateError) {
        throw new ActionError("Não foi possível desativar o produto.");
      }

      await ctx.supabase.from("audit_log").insert({
        profile_id: ctx.profile.id,
        action: "update",
        entity_type: "product",
        entity_id: parsedInput.productId,
        metadata: { deactivated_instead_of_deleted: true, reason: "tem encomendas associadas" },
      });

      revalidatePath("/marca-jp/produtos");
      revalidatePath("/loja");

      return {
        deleted: false as const,
        deactivated: true as const,
        reason:
          "Este produto tem encomendas associadas, por isso não pode ser eliminado sem perder esse histórico. Foi desativado em vez disso — deixa de aparecer na loja pública e no Admin, mas o histórico de encomendas mantém-se intacto.",
      };
    }

    const { error: deleteError } = await ctx.supabase
      .from("products")
      .delete()
      .eq("id", parsedInput.productId);

    if (deleteError) {
      throw new ActionError("Não foi possível eliminar o produto.");
    }

    await ctx.supabase.from("audit_log").insert({
      profile_id: ctx.profile.id,
      action: "delete",
      entity_type: "product",
      entity_id: parsedInput.productId,
    });

    revalidatePath("/marca-jp/produtos");
    revalidatePath("/loja");

    return { deleted: true as const, deactivated: false as const };
  });
