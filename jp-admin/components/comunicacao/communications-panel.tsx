"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Send, Mail } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCommunicationDraft, sendCommunication } from "@/actions/communications";

type District = { id: string; name: string };
type Concelhia = { id: string; name: string; district_id: string };
type QueueStatus = { pending: number; failed: number; emailConfigured: boolean };
type HistoryItem = {
  id: string;
  title: string;
  sentAt: string | null;
  openRate: number | null;
  scopeLabel: string;
};

export function CommunicationsPanel({
  districts,
  concelhias,
  history,
  queue,
}: {
  districts: District[];
  concelhias: Concelhia[];
  history: HistoryItem[];
  queue: QueueStatus;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"nacional" | "distrital" | "concelhia">("nacional");
  const [districtId, setDistrictId] = useState<string>("");
  const [concelhiaId, setConcelhiaId] = useState<string>("");

  const router = useRouter();
  const draft = useAction(createCommunicationDraft, {
    onSuccess: ({ data }) => {
      if (data?.communicationId) send.execute({ communicationId: data.communicationId });
    },
  });
  const send = useAction(sendCommunication, {
    onSuccess: () => {
      setTitle("");
      setBody("");
      router.refresh();
    },
  });

  const busy = draft.isExecuting || send.isExecuting;
  const canSubmit = title.trim().length >= 3 && body.trim().length >= 10 && (scope !== "distrital" || districtId) && (scope !== "concelhia" || concelhiaId);

  const handleSend = () => {
    draft.execute({
      title,
      body,
      segment: {
        scope,
        districtId: scope === "distrital" ? districtId : undefined,
        concelhiaId: scope === "concelhia" ? concelhiaId : undefined,
      },
    });
  };

  const error = draft.result?.serverError || send.result?.serverError;

  return (
    <div className="space-y-8 max-w-2xl">
      {!queue.emailConfigured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          O envio de email ainda não está configurado (faltam <code>BREVO_API_KEY</code> e <code>BREVO_SENDER_EMAIL</code> na
          Vercel). Os comunicados ficam guardados e seguem automaticamente assim que o Brevo estiver ligado.
        </div>
      )}
      {(queue.pending > 0 || queue.failed > 0) && (
        <p className="text-sm text-jp-ink-soft">
          Fila de email: <strong>{queue.pending}</strong> por enviar · <strong>{queue.failed}</strong> falhados
        </p>
      )}

      <div className="surface-card space-y-4 p-5">
        <Input placeholder="Título do comunicado" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          placeholder="Corpo da mensagem (HTML simples é aceite)"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nacional">Todos os militantes</SelectItem>
              <SelectItem value="distrital">Um distrito</SelectItem>
              <SelectItem value="concelhia">Uma concelhia</SelectItem>
            </SelectContent>
          </Select>

          {scope === "distrital" && (
            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Escolhe o distrito" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {scope === "concelhia" && (
            <Select value={concelhiaId} onValueChange={setConcelhiaId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Escolhe a concelhia" />
              </SelectTrigger>
              <SelectContent>
                {concelhias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button disabled={!canSubmit || busy} onClick={handleSend}>
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          Enviar comunicado
        </Button>
      </div>

      <div>
        <p className="mb-3 font-display text-xs uppercase tracking-wide text-jp-ink-soft">Histórico</p>
        {history.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Ainda não foi enviado nenhum comunicado"
            description="Os comunicados que enviares ficam registados aqui."
          />
        ) : (
          <ul className="surface-card divide-y divide-jp-line overflow-hidden">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium text-jp-ink">{h.title}</p>
                  <p className="text-jp-ink-soft">{h.scopeLabel}</p>
                </div>
                <div className="text-right text-jp-ink-soft">
                  {h.sentAt ? (
                    <>
                      <p>{new Date(h.sentAt).toLocaleDateString("pt-PT")}</p>
                      {h.openRate != null && <Badge variant="secondary">{h.openRate}% abertura</Badge>}
                    </>
                  ) : (
                    <Badge variant="outline">rascunho</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
