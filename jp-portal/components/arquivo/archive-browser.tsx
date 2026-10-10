"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { FileText, Image as ImageIcon, Scroll, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addArchiveItem, createCongress, deleteArchiveItem } from "@/actions/archive";
import { UploadButton } from "@/lib/uploadthing";

type ArchiveItem = { id: string; kind: "documento" | "foto" | "resolucao"; title: string; storage_path: string };
type Congress = { id: string; title: string; year: number; description: string | null; items: ArchiveItem[] };

const kindIcons = { documento: FileText, foto: ImageIcon, resolucao: Scroll };
const kindLabels = { documento: "Documentos", foto: "Fotografias", resolucao: "Resoluções" };

export function ArchiveBrowser({
  congresses,
  canManage,
  getDownloadUrl,
}: {
  congresses: Congress[];
  canManage: boolean;
  getDownloadUrl: (path: string) => string;
}) {
  const [selectedCongressId, setSelectedCongressId] = useState<string | null>(
    congresses[0]?.id ?? null,
  );
  const selected = congresses.find((c) => c.id === selectedCongressId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display uppercase text-2xl text-jp-blue-deep">Arquivo de Congressos</h1>
        {canManage && <NewCongressDialog />}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-jp-line pb-4">
        {congresses
          .sort((a, b) => b.year - a.year)
          .map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCongressId(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                c.id === selectedCongressId
                  ? "bg-jp-blue text-white"
                  : "border border-jp-line text-jp-blue-deep hover:bg-jp-blue/5"
              }`}
            >
              {c.year}
            </button>
          ))}
      </div>

      {selected && (
        <div>
          <p className="font-display uppercase text-lg text-jp-blue-deep">{selected.title}</p>
          {selected.description && (
            <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
          )}

          {canManage && <AddItemDialog congressId={selected.id} />}

          {(["documento", "foto", "resolucao"] as const).map((kind) => {
            const items = selected.items.filter((i) => i.kind === kind);
            if (items.length === 0) return null;
            const Icon = kindIcons[kind];

            return (
              <div key={kind} className="mt-6">
                <p className="mb-2 text-xs font-display uppercase text-muted-foreground">
                  {kindLabels[kind]}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <ArchiveItemRow
                      key={item.id}
                      item={item}
                      congressId={selected.id}
                      canManage={canManage}
                      href={getDownloadUrl(item.storage_path)}
                      Icon={Icon}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArchiveItemRow({
  item,
  congressId,
  canManage,
  href,
  Icon,
}: {
  item: ArchiveItem;
  congressId: string;
  canManage: boolean;
  href: string;
  Icon: typeof FileText;
}) {
  const router = useRouter();
  const deleteAction = useAction(deleteArchiveItem, { onSuccess: () => router.refresh() });

  return (
    <div className="flex items-center justify-between rounded-lg border border-jp-line px-3 py-2">
      <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-jp-blue" /> {item.title}
      </a>
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
          onClick={() => deleteAction.execute({ itemId: item.id, congressId })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function NewCongressDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const router = useRouter();
  const action = useAction(createCongress, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-jp-blue text-white hover:bg-jp-blue-deep">
          <Plus className="h-4 w-4 mr-2" /> Novo Congresso
        </Button>
      </DialogTrigger>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">Novo Congresso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            type="number"
            placeholder="Ano"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}
          <DialogFooter>
            <Button
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={action.isExecuting}
              onClick={() => action.execute({ title, year })}
            >
              {action.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ congressId }: { congressId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ArchiveItem["kind"]>("documento");
  const [storagePath, setStoragePath] = useState("");
  const router = useRouter();
  const action = useAction(addArchiveItem, {
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setStoragePath("");
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-4">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Item
        </Button>
      </DialogTrigger>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            Adicionar ao Arquivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as ArchiveItem["kind"])}
          >
            <option value="documento">Documento</option>
            <option value="foto">Fotografia</option>
            <option value="resolucao">Resolução</option>
          </select>
          <div className="rounded-lg border border-dashed border-jp-line p-4 text-center">
            {storagePath ? (
              <p className="text-sm font-medium text-green-700">Ficheiro carregado ✓</p>
            ) : (
              <UploadButton
                endpoint="archiveUploader"
                onClientUploadComplete={(res) => setStoragePath(res[0]?.ufsUrl ?? "")}
                onUploadError={(err) => alert(`Erro no carregamento: ${err.message}`)}
                appearance={{
                  button: "bg-jp-blue hover:bg-jp-blue-deep ut-uploading:bg-jp-blue/50",
                  allowedContent: "text-xs text-muted-foreground",
                }}
              />
            )}
          </div>
          {action.result.serverError && <p className="text-sm text-red-600">{action.result.serverError}</p>}
          <DialogFooter>
            <Button
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={action.isExecuting || !title.trim() || !storagePath}
              onClick={() => action.execute({ congressId, kind, title, storagePath })}
            >
              {action.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
