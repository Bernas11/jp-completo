"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, UserPlus, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteAdmin, revokeAdminAccess, updateAdminRole } from "@/actions/admins";

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "cpn" | "administrador" | "moderador_nacional";
  last_login_at: string | null;
  totp_enabled: boolean;
  created_at: string;
};

const roleLabels: Record<AdminProfile["role"], string> = {
  cpn: "CPN",
  administrador: "TI / Suporte Técnico-Digital",
  moderador_nacional: "Moderador Nacional",
};

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  fullName: z.string().min(2, "Nome demasiado curto"),
  role: z.enum(["cpn", "administrador", "moderador_nacional"]),
});

export function AdminsTable({
  admins,
  currentUserId,
}: {
  admins: AdminProfile[];
  currentUserId: string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();

  const inviteAction = useAction(inviteAdmin, {
    onSuccess: () => {
      setInviteOpen(false);
      form.reset();
      router.refresh();
    },
  });
  const roleAction = useAction(updateAdminRole, { onSuccess: () => router.refresh() });
  const revokeAction = useAction(revokeAdminAccess, { onSuccess: () => router.refresh() });

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", fullName: "", role: "moderador_nacional" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-headline text-2xl text-jp-ink">Administradores</p>
          <p className="mt-1 text-sm text-jp-ink-soft">Contas com acesso à área administrativa.</p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-jp-blue text-white hover:bg-jp-blue-deep">
              <UserPlus className="h-4 w-4 mr-2" /> Convidar Administrador
            </Button>
          </DialogTrigger>
          <DialogContent className="border-jp-line">
            <DialogHeader>
              <DialogTitle className="font-display uppercase text-jp-blue-deep">
                Convidar Administrador
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((values) => inviteAction.execute(values))}
              className="space-y-4"
            >
              <div>
                <Input placeholder="Nome completo" {...form.register("fullName")} />
                {form.formState.errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <Input placeholder="Email institucional" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>
              <select
                className="w-full rounded-lg border border-jp-line px-3 py-2 text-sm"
                {...form.register("role")}
              >
                <option value="moderador_nacional">Moderador Nacional</option>
                <option value="administrador">TI / Suporte Técnico-Digital</option>
                <option value="cpn">CPN</option>
              </select>

              {inviteAction.result.serverError && (
                <p className="text-sm text-red-600">{inviteAction.result.serverError}</p>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-jp-blue text-white hover:bg-jp-blue-deep"
                  disabled={inviteAction.isExecuting}
                >
                  {inviteAction.isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar convite
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
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Nível de Acesso</th>
              <th className="px-4 py-3 text-left">2FA</th>
              <th className="px-4 py-3 text-left">Último Acesso</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-jp-ink-soft">
                  Ainda não há administradores registados.
                </td>
              </tr>
            )}
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-jp-line">
                <td className="px-4 py-3">
                  <p className="font-medium text-jp-ink">{admin.full_name}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-jp-line px-2 py-1 text-sm disabled:opacity-50"
                    value={admin.role}
                    disabled={admin.id === currentUserId || roleAction.isExecuting}
                    onChange={(e) =>
                      roleAction.execute({
                        targetProfileId: admin.id,
                        role: e.target.value as AdminProfile["role"],
                      })
                    }
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {admin.totp_enabled ? (
                    <Badge className="bg-green-100 text-green-800">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Ativo
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800">
                      <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Por configurar
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {admin.last_login_at
                    ? new Date(admin.last_login_at).toLocaleString("pt-PT")
                    : "Nunca"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/auditoria?profileId=${admin.id}`}>
                        <History className="h-4 w-4 mr-1" /> Log
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={admin.id === currentUserId || revokeAction.isExecuting}
                      onClick={() => {
                        if (
                          confirm(
                            `Revogar o acesso de administrador de ${admin.full_name}? Fica com nível Militante.`,
                          )
                        ) {
                          revokeAction.execute({ targetProfileId: admin.id });
                        }
                      }}
                    >
                      Revogar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(roleAction.result.serverError || revokeAction.result.serverError) && (
        <p className="text-sm text-red-600">
          {roleAction.result.serverError ?? revokeAction.result.serverError}
        </p>
      )}
    </div>
  );
}
