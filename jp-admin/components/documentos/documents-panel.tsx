"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestDocumentUpload, registerPublicDocument, deletePublicDocument } from "@/actions/documents";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BUCKET = "documentos-publicos";

type Category = "convocatoria" | "estatuto" | "minuta" | "resolucao" | "outro";
type Doc = {
  id: string;
  title: string;
  category: Category;
  version: number;
  storage_path: string;
  created_at: string;
};

const CATEGORY_LABEL: Record<Category, string> = {
  convocatoria: "Convocatória",
  estatuto: "Estatuto",
  minuta: "Minuta",
  resolucao: "Resolução",
  outro: "Outro",
};

const MAX_MB = 15;

export function DocumentsPanel({ documents }: { documents: Doc[] }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("convocatoria");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const requestUpload = useAction(requestDocumentUpload);
  const register = useAction(registerPublicDocument);
  const remove = useAction(deletePublicDocument, { onSuccess: () => router.refresh() });

  const handleSubmit = async () => {
    if (!file || title.trim().length < 3) return;
    setError("");
    setUploading(true);
    try {
      // 1) pede um URL de upload assinado (valida permissões, tipo e tamanho)
      const prepared = await requestUpload.executeAsync({
        category,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      if (!prepared?.data) {
        setError(prepared?.serverError ?? "Não foi possível preparar o envio (confirma o formato PDF/Word e o limite de 15MB).");
        return;
      }

      // 2) envia o ficheiro direto para o Storage (sem passar pela função)
      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(prepared.data.storagePath, prepared.data.token, file, { contentType: file.type });
      if (uploadError) {
        setError("Falha no envio do ficheiro: " + uploadError.message);
        return;
      }

      // 3) regista o documento
      const registered = await register.executeAsync({
        title: title.trim(),
        category,
        storagePath: prepared.data.storagePath,
      });
      if (!registered?.data) {
        setError(registered?.serverError ?? "Não foi possível publicar o documento.");
        return;
      }

      setTitle("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="surface-card space-y-3 p-5">
        <Input placeholder="Título do documento" value={title} onChange={(e) => setTitle(e.target.value)} />

        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > MAX_MB * 1024 * 1024) {
              setError(`O ficheiro excede ${MAX_MB}MB.`);
              return;
            }
            setError("");
            setFile(f);
          }}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button disabled={!file || title.trim().length < 3 || busy} onClick={handleSubmit}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Publicar documento
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Ainda não há documentos publicados"
          description="Os documentos que publicares aqui ficam disponíveis publicamente."
        />
      ) : (
      <ul className="surface-card divide-y divide-jp-line overflow-hidden">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between p-4 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">{d.title}</p>
                <p className="text-muted-foreground">
                  {CATEGORY_LABEL[d.category]} · v{d.version} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={remove.isExecuting}
              onClick={() => remove.execute({ documentId: d.id })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
