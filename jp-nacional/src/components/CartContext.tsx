"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { formatPreco, type Produto } from "@/lib/produtos";

type CartItem = { produtoId: string; quantidade: number };
type CartContextType = {
  items: CartItem[];
  produtos: Produto[];
  add: (produtoId: string) => void;
  remove: (produtoId: string) => void;
  setQty: (produtoId: string, q: number) => void;
  total: number;
  totalFormatado: string;
  count: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children, produtos }: { children: React.ReactNode; produtos: Produto[] }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((produtoId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.produtoId === produtoId);
      if (existing) return prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...prev, { produtoId, quantidade: 1 }];
    });
  }, []);

  const remove = useCallback((produtoId: string) => {
    setItems((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }, []);

  const setQty = useCallback((produtoId: string, q: number) => {
    setItems((prev) => (q <= 0 ? prev.filter((i) => i.produtoId !== produtoId) : prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: q } : i))));
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (produtos.find((p) => p.id === i.produtoId)?.preco || 0) * i.quantidade, 0),
    [items, produtos]
  );

  const count = useMemo(() => items.reduce((s, i) => s + i.quantidade, 0), [items]);

  return (
    <CartContext.Provider value={{ items, produtos, add, remove, setQty, total, totalFormatado: formatPreco(total), count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
