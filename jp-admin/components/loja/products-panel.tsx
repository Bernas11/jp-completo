"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus, Minus, Package, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProduct, updateProduct, adjustProductStock, toggleProductActive, deleteProduct } from "@/actions/products";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  stock: number;
  image_url: string | null;
  active: boolean;
};

function formatEuros(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function ProductFormDialog({
  product,
  onDone,
}: {
  product?: Product;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");

  const router = useRouter();
  const create = useAction(createProduct, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });
  const update = useAction(updateProduct, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });

  const busy = create.isExecuting || update.isExecuting;
  const error = create.result?.serverError || update.result?.serverError;
  const priceCents = Math.round(parseFloat(price || "0") * 100);
  const canSubmit = name.trim().length >= 2 && priceCents > 0;

  const submit = () => {
    if (product) {
      update.execute({
        productId: product.id,
        name,
        description: description || undefined,
        priceCents,
        imageUrl: imageUrl || undefined,
      });
    } else {
      create.execute({
        name,
        description: description || undefined,
        priceCents,
        stock: parseInt(stock || "0", 10),
        imageUrl: imageUrl || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-1.5 h-4 w-4" /> Novo produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Descrição"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-3">
            <Input
              placeholder="Preço (€)"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {!product && (
              <Input
                placeholder="Stock inicial"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            )}
          </div>
          <Input
            placeholder="URL da imagem"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || busy} onClick={submit}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockAdjuster({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");

  const router = useRouter();
  const adjust = useAction(adjustProductStock, {
    onSuccess: () => {
      setOpen(false);
      setReason("");
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ajustar stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDelta(String(parseInt(delta || "0") - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              className="w-20 text-center"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
            <Button variant="outline" size="icon" onClick={() => setDelta(String(parseInt(delta || "0") + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              stock atual: {product.stock} → {product.stock + parseInt(delta || "0")}
            </span>
          </div>
          <Textarea placeholder="Motivo (ex: reposição, quebra)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {adjust.result?.serverError && (
            <p className="text-sm text-destructive">{adjust.result.serverError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={reason.trim().length < 3 || adjust.isExecuting}
            onClick={() =>
              adjust.execute({ productId: product.id, delta: parseInt(delta || "0", 10), reason })
            }
          >
            {adjust.isExecuting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsPanel({ products }: { products: Product[] }) {
  const router = useRouter();
  const toggleActive = useAction(toggleProductActive, { onSuccess: () => router.refresh() });
  const removeProduct = useAction(deleteProduct, {
    onSuccess: ({ data }) => {
      if (data?.deactivated) {
        alert(data.reason);
      }
      router.refresh();
    },
  });
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4" key={refreshKey}>
      <ProductFormDialog onDone={() => setRefreshKey((k) => k + 1)} />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Ainda não há produtos criados"
          description="Cria o primeiro artigo da Loja da Juventude Popular."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="surface-card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-jp-ink">{p.name}</p>
                  <p className="text-sm text-jp-ink-soft">
                    {formatEuros(p.price_cents)} · {p.stock} em stock
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={p.active}
                    onCheckedChange={(active) => toggleActive.execute({ productId: p.id, active })}
                  />
                  <ProductFormDialog product={p} onDone={() => setRefreshKey((k) => k + 1)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={removeProduct.isExecuting}
                    title="Eliminar produto"
                    onClick={() => {
                      if (confirm(`Eliminar "${p.name}" da loja? Se tiver encomendas associadas, será desativado em vez de eliminado.`)) {
                        removeProduct.execute({ productId: p.id });
                      }
                    }}
                  >
                    {removeProduct.isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
                  </Button>
                </div>
              </div>
              <StockAdjuster product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
