"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  assignConcelhiaModerator,
  createConcelhia,
  deleteConcelhia,
  toggleConcelhiaActive,
  updateConcelhia,
} from "@/actions/concelhias";
import concelhosOficiais from "@/lib/concelhos-oficiais.json";

type Concelhia = {
  id: string;
  name: string;
  active: boolean;
  district_id: string;
  district_name: string;
  moderator_profile_id: string | null;
  moderator_name: string | null;
  active_members: number;
};

type District = { id: string; name: string };
type ModeratorCandidate = { id: string; full_name: string };

const createSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto"),
  districtId: z.string().uuid("Escolhe um distrito"),
});

export function ConcelhiasTable({
  concelhias,
  districts,
  moderatorCandidates,
}: {
  concelhias: Concelhia[];
  districts: District[];
  moderatorCandidates: ModeratorCandidate[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Concelhia | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();
  const createAction = useAction(createConcelhia, {
    onSuccess: () => {
      setCreateOpen(false);
      form.reset();
      router.refresh();
    },
  });
  const toggleAction = useAction(toggleConcelhiaActive, { onSuccess: () => router.refresh() });
  const moderatorAction = useAction(assignConcelhiaModerator, { onSuccess: () => router.refresh() });
  const updateAction = useAction(updateConcelhia, { onSuccess: () => router.refresh() });
  const deleteAction = useAction(deleteConcelhia, { onSuccess: () => router.refresh() });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", districtId: "" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-headline text-2xl text-jp-ink">Concelhias</p>
          <p className="mt-1 text-sm text-jp-ink-soft">
            Estrutura local da Juventude Popular, organizada por distrito.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-jp-blue text-white hover:bg-jp-blue-deep">
              <Plus className="h-4 w-4 mr-2" /> Nova Concelhia
            </Button>
          </DialogTrigger>
          <DialogContent className="border-jp-line">
            <DialogHeader>
              <DialogTitle className="font-display uppercase text-jp-blue-deep">
                Nova Concelhia
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((values) => createAction.execute(values))}
              className="space-y-4"
            >
              <select
                className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
                defaultValue=""
                {...form.register("name")}
              >
                <option value="" disabled>
                  Escolhe o município
                </option>
                {concelhosOficiais.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
              <select
                className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
                {...form.register("districtId")}
              >
                <option value="">Escolhe o distrito</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.districtId && (
                <p className="text-sm text-red-600">{form.formState.errors.districtId.message}</p>
              )}
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
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-jp-blue/5">
            <tr>
              <th className="px-4 py-3 text-left">Concelhia</th>
              <th className="px-4 py-3 text-left">Distrito</th>
              <th className="px-4 py-3 text-left">Militantes</th>
              <th className="px-4 py-3 text-left">Moderador</th>
              <th className="px-4 py-3 text-left">No Mapa</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {concelhias.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-jp-ink-soft">
                  Ainda não há concelhias registadas.
                </td>
              </tr>
            )}
            {concelhias.map((concelhia) => (
              <tr key={concelhia.id} className="border-t border-jp-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-jp-blue" />
                    <span className="font-medium text-jp-blue-deep">{concelhia.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{concelhia.district_name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="border-jp-line font-normal">
                    {concelhia.active_members}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-jp-line px-2 py-1 text-sm"
                    value={concelhia.moderator_profile_id ?? ""}
                    disabled={moderatorAction.isExecuting}
                    onChange={(e) =>
                      moderatorAction.execute({
                        concelhiaId: concelhia.id,
                        moderatorProfileId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Sem moderador</option>
                    {moderatorCandidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={concelhia.active}
                    disabled={toggleAction.isExecuting}
                    onCheckedChange={(checked) =>
                      toggleAction.execute({ concelhiaId: concelhia.id, active: checked })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Renomear concelhia"
                      onClick={() => {
                        setRenaming(concelhia);
                        setRenameValue(concelhia.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar concelhia"
                      disabled={concelhia.active_members > 0 || deleteAction.isExecuting}
                      title={
                        concelhia.active_members > 0
                          ? "Só é possível eliminar concelhias sem militantes associados"
                          : "Eliminar concelhia"
                      }
                      onClick={() => {
                        if (confirm(`Eliminar a concelhia "${concelhia.name}"? Esta ação não pode ser desfeita.`)) {
                          deleteAction.execute({ concelhiaId: concelhia.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="border-jp-line">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-jp-blue-deep">
              Renomear concelhia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            {updateAction.result.serverError && (
              <p className="text-sm text-red-600">{updateAction.result.serverError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              className="bg-jp-blue text-white hover:bg-jp-blue-deep"
              disabled={updateAction.isExecuting || renameValue.trim().length < 2}
              onClick={() => {
                if (!renaming) return;
                updateAction.execute({ concelhiaId: renaming.id, name: renameValue.trim() });
                setRenaming(null);
              }}
            >
              {updateAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(toggleAction.result.serverError ||
        moderatorAction.result.serverError ||
        deleteAction.result.serverError) && (
        <p className="text-sm text-red-600">
          {toggleAction.result.serverError ??
            moderatorAction.result.serverError ??
            deleteAction.result.serverError}
        </p>
      )}
    </div>
  );
}
