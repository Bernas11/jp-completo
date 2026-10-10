"use client";

import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Bell, MessageSquare, AtSign, Megaphone, Calendar, ShieldCheck, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";

type Notification = {
  id: string;
  type:
    | "resposta_topico"
    | "mencao"
    | "novo_aviso"
    | "evento_proximo"
    | "mensagem_direta"
    | "denuncia_resolvida"
    | "nova_denuncia"
    | "filiacao_aprovada";
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
};

const typeConfig: Record<Notification["type"], { icon: typeof Bell; label: (p: any) => string; href: (p: any) => string }> = {
  resposta_topico: {
    icon: MessageSquare,
    label: () => "Alguém respondeu ao teu tópico",
    href: (p) => `/comunidade/forum/topico/${p.topicId}`,
  },
  mencao: {
    icon: AtSign,
    label: () => "Foste mencionado num tópico",
    href: (p) => `/comunidade/forum/topico/${p.topicId}`,
  },
  novo_aviso: {
    icon: Megaphone,
    label: (p) => `Novo aviso: ${p.title}`,
    href: () => `/mural`,
  },
  evento_proximo: {
    icon: Calendar,
    label: (p) => `O evento "${p.eventTitle}" é já breve`,
    href: () => `/eventos`,
  },
  mensagem_direta: {
    icon: MessageSquare,
    label: () => "Nova mensagem direta",
    href: () => `/mensagens`,
  },
  nova_denuncia: {
    icon: ShieldCheck,
    label: () => "Nova denúncia para rever",
    href: () => `/moderacao`,
  },
  denuncia_resolvida: {
    icon: ShieldCheck,
    label: () => "A tua denúncia foi resolvida",
    href: () => `/`,
  },
  filiacao_aprovada: {
    icon: ShieldCheck,
    label: () => "A tua filiação foi aprovada — já és Militante!",
    href: () => `/perfil`,
  },
};

export function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  const markOne = useAction(markNotificationRead);
  const markAll = useAction(markAllNotificationsRead);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Notificações</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.execute({})}>
            <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Sem notificações.</p>
        )}
        {notifications.map((n) => {
          const config = typeConfig[n.type];
          const Icon = config.icon;
          return (
            <Link
              key={n.id}
              href={config.href(n.payload)}
              onClick={() => !n.read_at && markOne.execute({ notificationId: n.id })}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                n.read_at ? "border-jp-line" : "border-jp-blue/30 bg-jp-blue/5"
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-jp-blue" />
              <div>
                <p className="text-sm">{config.label(n.payload)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-PT")}
                </p>
              </div>
              {!n.read_at && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-jp-blue" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
