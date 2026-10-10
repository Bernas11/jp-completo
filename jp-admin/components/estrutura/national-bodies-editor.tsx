"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/states";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCog, Loader2, Plus, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  assignNationalBodyHolder,
  createNationalBodyPosition,
  deleteNationalBodyPosition,
  vacateNationalBodyPosition,
} from "@/actions/national-bodies";

// Os mesmos 6 órgãos e pela mesma ordem do site público (jp-nacional,
// app/[locale]/orgaos-nacionais/page.tsx BODY_KEYS) — têm de bater certo,
// porque o site público lê esta mesma tabela filtrando por body_key.
const BODIES = [
  { key: "cpn", label: "Comissão Política Nacional" },
  { key: "mcn", label: "Mesa do Congresso Nacional" },
  { key: "disciplina", label: "Comissão de Disciplina" },
  { key: "jurisdicao", label: "Conselho de Jurisdição e Fiscalização" },
  { key: "mesa_conselho", label: "Mesa do Conselho Nacional" },
  { key: "gabinete", label: "Gabinete de Estudos Gonçalo Begonha" },
] as const;

type BodyKey = (typeof BODIES)[number]["key"];

const createPositionSchema = z.object({
  title: z.string().min(2, "Nome demasiado curto"),
  bodyKey: z.enum(["cpn", "mcn", "disciplina", "jurisdicao", "mesa_conselho", "gabinete"]),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

type Position = {
  id: string;
  title: string;
  body_key: string;
  display_order: number;
  currentHolder: { full_name: string; photo_url: string | null; start_date: string } | null;
};

const assignSchema = z.object({
  fullName: z.string().min(2, "Nome demasiado curto"),
  photoUrl: z.string().url("URL inválido").optional().or(z.literal("")),
  startDate: z.string().min(1, "Indica a data"),
});

export function NationalBodiesEditor({ positions }: { positions: Position[] }) {
  return (
    <div className="space-y-10">
      {BODIES.map((body) => {
        const bodyPositions = positions
          .filter((p) => p.body_key === body.key)
          .sort((a, b) => a.display_order - b.display_order);

        return (
          <section key={body.key}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display uppercase text-lg text-jp-blue-deep">{body.label}</h2>
              <CreatePositionDialog bodyKey={body.key} nextDisplayOrder={bodyPositions.length} />
            </div>
            {bodyPositions.length === 0 ? (
              <EmptyState
                title="Ainda não há cargos definidos neste órgão"
                description={`Cria o primeiro cargo de "${body.label}" para começares a atribuir titulares.`}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bodyPositions.map((position) => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-sm text-muted-foreground">
        O histórico de antigos dirigentes é gerido separadamente em{" "}
        <a href="/estrutura/lideres" className="font-medium text-jp-blue underline">
          Estrutura → Líderes Anteriores
        </a>
        , para não misturar composição atual com histórico.
      </p>
    </div>
  );
}

function CreatePositionDialog({
  bodyKey,
  nextDisplayOrder,
}: {
  bodyKey: BodyKey;
  nextDisplayOrder: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const createAction = useAction(createNationalBodyPosition, {
    onSuccess: () => {
      setOpen(false);
      form.reset();
      router.refresh();
    },
  });

  const form = useForm<z.infer<typeof createPositionSchema>>({
    resolver: zodResolver(createPositionSchema),
    defaultValues: { title: "", bodyKey, displayOrder: nextDisplayOrder },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Novo cargo
        </Button>
      </DialogTrigger>
      <DialogContent className="border-jp-line">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-jp-blue-deep">
            Novo cargo — {BODIES.find((b) => b.key === bodyKey)?.label}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            createAction.execute({
              title: values.title,
              bodyKey: values.bodyKey,
              displayOrder: values.displayOrder,
            }),
          )}
          className="space-y-4"
        >
          <Input placeholder="Nome do cargo (ex: Secretário-Geral)" {...form.register("title")} />
          <input type="hidden" {...form.register("bodyKey")} />
          <Input
            type="number"
            placeholder="Ordem de exibição"
            {...form.register("displayOrder")}
          />
          {createAction.result.serverError && (
            <p className="text-sm text-red-600">{createAction.result.serverError}</p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={createAction.isExecuting}
            >
              {createAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar cargo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PositionCard({ position }: { position: Position }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const assignAction = useAction(assignNationalBodyHolder, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  const vacateAction = useAction(vacateNationalBodyPosition, {
    onSuccess: () => router.refresh(),
  });
  const deleteAction = useAction(deleteNationalBodyPosition, {
    onSuccess: ({ data }) => {
      if (data?.needsConfirmation) {
        const lista = data.historicalHolders
          .map(
            (h) =>
              `- ${h.fullName} (${new Date(h.startDate).toLocaleDateString("pt-PT")} a ${new Date(h.endDate!).toLocaleDateString("pt-PT")})`,
          )
          .join("\n");
        const confirmado = confirm(
          `Este cargo já não tem titular ativo, mas tem histórico de titulares anteriores:\n\n${lista}\n\nEliminar o cargo apaga também este histórico, sem forma de recuperar. Queres mesmo eliminar?`,
        );
        if (confirmado) {
          deleteAction.execute({ positionId: position.id, confirmDeleteHistory: true });
        }
        return;
      }
      router.refresh();
    },
  });

  const form = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      fullName: position.currentHolder?.full_name ?? "",
      photoUrl: position.currentHolder?.photo_url ?? "",
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  return (
    <div className="surface-card rounded-2xl border border-jp-line p-5">
      <p className="text-xs font-display uppercase text-muted-foreground">{position.title}</p>
      <p className="mt-1 text-lg font-medium text-jp-blue-deep">
        {position.currentHolder?.full_name ?? "Por atribuir"}
      </p>
      {position.currentHolder && (
        <Badge variant="outline" className="mt-2 border-jp-line font-normal">
          desde {new Date(position.currentHolder.start_date).toLocaleDateString("pt-PT")}
        </Badge>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4 w-full">
            <UserCog className="h-4 w-4 mr-2" /> Alterar titular
          </Button>
        </DialogTrigger>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">
              {position.title}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) =>
              assignAction.execute({
                positionId: position.id,
                fullName: values.fullName,
                photoUrl: values.photoUrl || undefined,
                startDate: values.startDate,
              }),
            )}
            className="space-y-4"
          >
            <Input placeholder="Nome completo" {...form.register("fullName")} />
            <Input placeholder="URL da fotografia (opcional)" {...form.register("photoUrl")} />
            <Input type="date" {...form.register("startDate")} />
            {assignAction.result.serverError && (
              <p className="text-sm text-red-600">{assignAction.result.serverError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              O mandato anterior (se existir) é encerrado automaticamente nesta data.
            </p>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                disabled={assignAction.isExecuting}
              >
                {assignAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-2 flex gap-2">
        {position.currentHolder && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-red-600"
            disabled={vacateAction.isExecuting}
            onClick={() => {
              if (!confirm(`Remover ${position.currentHolder?.full_name} de "${position.title}"?`)) return;
              vacateAction.execute({
                positionId: position.id,
                endDate: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            {vacateAction.isExecuting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            Remover titular
          </Button>
        )}
        {!position.currentHolder && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-red-600"
            disabled={deleteAction.isExecuting}
            onClick={() => {
              if (!confirm(`Eliminar o cargo "${position.title}"? Esta ação não pode ser desfeita.`)) return;
              deleteAction.execute({ positionId: position.id });
            }}
          >
            {deleteAction.isExecuting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Eliminar cargo
          </Button>
        )}
      </div>
      {deleteAction.result.serverError && (
        <p className="mt-2 text-sm text-red-600">{deleteAction.result.serverError}</p>
      )}
      {vacateAction.result.serverError && (
        <p className="mt-2 text-sm text-red-600">{vacateAction.result.serverError}</p>
      )}
    </div>
  );
}
