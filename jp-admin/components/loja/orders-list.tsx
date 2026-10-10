"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus, cancelOrder } from "@/actions/orders";

type OrderItem = { name: string; quantity: number; unitPriceCents: number };
type Order = {
  id: string;
  status: string;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "default"> = {
  pendente: "outline",
  enviado: "secondary",
  entregue: "default",
  cancelado: "outline",
};

function formatEuros(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const isFinal = order.status === "cancelado" || order.status === "entregue";

  const updateStatus = useAction(updateOrderStatus);
  const cancel = useAction(cancelOrder);

  return (
    <div className="surface-card">
      <button
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {order.customerEmail} · {new Date(order.createdAt).toLocaleDateString("pt-PT")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-medium">{formatEuros(order.totalCents)}</span>
          <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          <ul className="space-y-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between text-muted-foreground">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>{formatEuros(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>

          {!isFinal && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                defaultValue={order.status}
                disabled={updateStatus.isExecuting}
                onValueChange={(status) =>
                  updateStatus.execute({ orderId: order.id, status: status as any })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                disabled={cancel.isExecuting}
                onClick={() => cancel.execute({ orderId: order.id })}
              >
                {cancel.isExecuting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Cancelar encomenda
              </Button>
            </div>
          )}

          {(updateStatus.result?.serverError || cancel.result?.serverError) && (
            <p className="text-sm text-destructive">
              {updateStatus.result?.serverError || cancel.result?.serverError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdersList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Ainda não há encomendas registadas"
        description="As encomendas feitas na Loja da Juventude Popular aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <OrderRow key={o.id} order={o} />
      ))}
    </div>
  );
}
