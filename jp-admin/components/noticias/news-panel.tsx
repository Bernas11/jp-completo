"use client";

import { EmptyState } from "@/components/shared/states";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Plus, Pencil, Trash2, Newspaper, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createNews, updateNews, deleteNews } from "@/actions/news";
import { CATEGORIAS_ATIVIDADE } from "@/lib/activity-categories";

const CATEGORIA_LABEL: Record<(typeof CATEGORIAS_ATIVIDADE)[number], string> = {
  noticia: "Notícia",
  comunicado: "Comunicado",
  atividade: "Atividade",
  outro: "Outro",
};

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  category: (typeof CATEGORIAS_ATIVIDADE)[number];
  external_link: string | null;
  status: "rascunho" | "publicado";
  slug: string | null;
  published_at: string;
  created_at: string;
};

function NewsFormDialog({ item, onDone }: { item?: NewsItem; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIAS_ATIVIDADE)[number]>(item?.category ?? "noticia");
  const [externalLink, setExternalLink] = useState(item?.external_link ?? "");
  const [status, setStatus] = useState<"rascunho" | "publicado">(item?.status ?? "rascunho");
  const [publishedAt, setPublishedAt] = useState(
    item?.published_at ?? new Date().toISOString().slice(0, 10),
  );

  const router = useRouter();
  const create = useAction(createNews, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });
  const update = useAction(updateNews, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onDone();
    },
  });

  const busy = create.isExecuting || update.isExecuting;
  const error = create.result?.serverError || update.result?.serverError;
  const canSubmit = title.trim().length >= 3 && publishedAt && (body.trim() || externalLink.trim());

  const submit = () => {
    const payload = {
      title,
      summary: summary || undefined,
      body: body || undefined,
      imageUrl: imageUrl || undefined,
      category,
      externalLink: externalLink || undefined,
      status,
      publishedAt,
    };
    if (item) update.execute({ ...payload, newsId: item.id });
    else create.execute(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="mr-1.5 h-4 w-4" /> Nova atividade</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select
                className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                {CATEGORIAS_ATIVIDADE.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </div>
          </div>

          <Textarea
            placeholder="Resumo (opcional, aparece na listagem)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
          />

          <Textarea
            placeholder="Descrição completa (cria página própria em /noticias/slug — deixa em branco se só quiseres link externo)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />

          <Input
            placeholder="URL da imagem (opcional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <Input
            placeholder="Link externo (ex: https://instagram.com/... — usa isto se não houver descrição completa)"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
          />

          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <select
              className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="rascunho">Rascunho (só visível no Admin)</option>
              <option value="publicado">Publicado (visível no site público)</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!canSubmit || busy} onClick={submit}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewsPanel({ news }: { news: NewsItem[] }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const remove = useAction(deleteNews, {
    onSuccess: () => {
      router.refresh();
      setRefreshKey((k) => k + 1);
    },
  });

  return (
    <div className="space-y-4" key={refreshKey}>
      <NewsFormDialog onDone={() => setRefreshKey((k) => k + 1)} />

      {news.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Ainda não há atividades criadas"
          description="Notícias, comunicados e outras atividades que criares aqui aparecem na secção Atividades do site público, uma vez publicados."
        />
      ) : (
        <ul className="surface-card divide-y divide-jp-line overflow-hidden">
          {news.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-jp-ink">{n.title}</p>
                  <span className="rounded-full bg-jp-blue-deep/10 px-2 py-0.5 text-xs text-jp-blue-deep">
                    {CATEGORIA_LABEL[n.category]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      n.status === "publicado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {n.status === "publicado" ? "Publicado" : "Rascunho"}
                  </span>
                  {n.external_link && (
                    <a href={n.external_link} target="_blank" rel="noreferrer" className="text-jp-ink-soft">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="truncate text-sm text-jp-ink-soft">
                  {new Date(n.published_at).toLocaleDateString("pt-PT")}
                  {n.summary ? ` — ${n.summary}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <NewsFormDialog item={n} onDone={() => setRefreshKey((k) => k + 1)} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Eliminar "${n.title}"?`)) remove.execute({ newsId: n.id });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
