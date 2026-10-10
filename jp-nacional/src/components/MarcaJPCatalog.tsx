"use client";

import { useState } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, Loader2 } from "lucide-react";
import { formatPreco, type Produto } from "@/lib/produtos";
import { CartProvider, useCart } from "@/components/CartContext";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

function ProdutoCard({ produto }: { produto: Produto }) {
  const { add } = useCart();
  const t = useTranslations("cart");
  return (
    <div className="group bg-jp-blue-tint2 border border-jp-line rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-jp-blue/10 transition-all duration-300">
      <div className="h-48 bg-white flex items-center justify-center p-4 relative">
        {produto.imagens[0] ? (
          <Image src={produto.imagens[0]} alt={produto.nome} fill className="object-contain p-6" unoptimized />
        ) : (
          <ShoppingBag size={32} className="text-jp-blue/30" />
        )}
      </div>
      <div className="p-5">
        <h2 className="font-headline text-base text-jp-blue-deep mb-1">{produto.nome}</h2>
        <p className="text-xs text-jp-ink-soft mb-3 line-clamp-2">{produto.descricao}</p>
        <div className="flex items-center justify-between">
          <span className="font-display text-sm text-jp-blue">{formatPreco(produto.preco)}</span>
          <button
            onClick={() => add(produto.id)}
            className="font-display text-xs bg-jp-blue text-white px-4 py-2 rounded-full hover:bg-jp-blue-deep transition-colors"
          >
            {t("adicionar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer() {
  const t = useTranslations("cart");
  const { items, produtos, remove, setQty, totalFormatado, count } = useCart();
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", morada: "", codigoPostal: "", localidade: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("erro_pagamento"));
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("erro_processar"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-jp-yellow text-jp-blue-deep font-display text-xs px-5 py-3.5 rounded-full shadow-lg shadow-jp-blue-deep/30 hover:brightness-95 transition-all"
      >
        <ShoppingBag size={16} /> {t("carrinho")} {count > 0 && `(${count})`}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)} />
            <m.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-jp-blue-deep flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="font-headline text-lg text-white">{t("carrinho")}</h2>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 && <p className="text-white/50 text-sm text-center py-10">{t("vazio")}</p>}
                {items.map((item) => {
                  const p = produtos.find((pr) => pr.id === item.produtoId)!;
                  return (
                    <div key={item.produtoId} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{p.nome}</p>
                        <p className="text-xs text-white/50">{formatPreco(p.preco)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQty(item.produtoId, item.quantidade - 1)} className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-white text-sm w-4 text-center">{item.quantidade}</span>
                        <button onClick={() => setQty(item.produtoId, item.quantidade + 1)} className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => remove(item.produtoId)} aria-label={t("remover")}><X size={14} className="text-white/40 hover:text-red-300" /></button>
                    </div>
                  );
                })}
              </div>

              {items.length > 0 && (
                <div className="p-6 border-t border-white/10 space-y-4">
                  {!checkoutOpen ? (
                    <>
                      <div className="flex justify-between text-white">
                        <span>{t("total")}</span>
                        <span className="font-display">{totalFormatado}</span>
                      </div>
                      <button onClick={() => setCheckoutOpen(true)} className="w-full bg-jp-yellow text-jp-blue-deep font-display text-sm py-3 rounded-full">
                        {t("finalizar")}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {(["nome", "email", "morada", "codigoPostal", "localidade"] as const).map((f) => (
                        <input
                          key={f}
                          placeholder={{ nome: t("ph_nome"), email: t("ph_email"), morada: t("ph_morada"), codigoPostal: t("ph_cp"), localidade: t("ph_localidade") }[f]}
                          value={form[f]}
                          onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-jp-yellow"
                        />
                      ))}
                      {error && <p className="text-red-300 text-xs">⚠ {error}</p>}
                      <button
                        onClick={submit}
                        disabled={loading}
                        className={cn("w-full bg-jp-yellow text-jp-blue-deep font-display text-sm py-3 rounded-full flex items-center justify-center gap-2", loading && "opacity-60")}
                      >
                        {loading ? <><Loader2 size={14} className="animate-spin" /> {t("processando")}</> : `${t("pagar")} ${totalFormatado}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MarcaJPCatalog({ produtos }: { produtos: Produto[] }) {
  return (
    <CartProvider produtos={produtos}>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {produtos.map((p) => <ProdutoCard key={p.id} produto={p} />)}
      </div>
      <CartDrawer />
    </CartProvider>
  );
}
