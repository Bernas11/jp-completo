"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ShieldCheck, ArrowRight, Loader2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function OnboardingForm({
  action,
  defaultFullName,
  cargosSugeridos,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultFullName: string;
  cargosSugeridos: string[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [cargoOutro, setCargoOutro] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-jp-blue-deep p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(0,51,198,0.85), transparent 42%), radial-gradient(circle at 85% 90%, rgba(36,57,158,0.85), transparent 48%)",
        }}
      />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-jp-yellow/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-jp-blue/25 blur-[120px]" />
      <Image
        src="/brand/logo-badge.png"
        alt=""
        width={160}
        height={160}
        className="pointer-events-none absolute -bottom-8 -right-8 opacity-[0.08] [transform:rotate(12deg)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-5 flex justify-center">
          <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jp-yellow opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-jp-yellow" />
            </span>
            <span className="font-display text-xs uppercase tracking-widest text-white">
              Primeiro acesso
            </span>
          </span>
        </div>

        <form
          action={async (formData) => {
            setSubmitting(true);
            await action(formData);
          }}
          className="rounded-3xl bg-white p-8 shadow-2xl"
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-jp-blue">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <p className="mt-4 text-center font-headline text-2xl text-jp-ink">
            Bem-vindo à Área Administrativa
          </p>
          <p className="mt-1.5 text-center text-sm text-jp-ink-soft">
            Antes de continuar, confirma o teu nome e função institucional.
          </p>

          <div className="mt-6 space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-jp-ink">
                Nome completo
              </label>
              <Input
                id="fullName"
                name="fullName"
                autoFocus
                defaultValue={defaultFullName}
                placeholder="O teu nome"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cargo" className="text-sm font-medium text-jp-ink">
                Cargo / Função
              </label>
              {!cargoOutro ? (
                <div className="relative">
                  <select
                    id="cargo"
                    name="cargo"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value === "__outro__") setCargoOutro(true);
                    }}
                    required
                    className={cn(
                      "flex h-10 w-full appearance-none rounded-lg border border-jp-line bg-white px-3 pr-9 text-sm text-jp-ink shadow-sm",
                      "focus-visible:outline-none",
                    )}
                  >
                    <option value="" disabled>
                      Seleciona o teu cargo
                    </option>
                    {cargosSugeridos.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__outro__">Outro…</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jp-ink-soft" />
                </div>
              ) : (
                <Input
                  id="cargo"
                  name="cargo"
                  autoFocus
                  placeholder="Escreve o teu cargo"
                  required
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "group mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-jp-yellow px-6 py-3.5",
              "font-display text-sm uppercase tracking-wide text-jp-blue-deep shadow-lg shadow-jp-yellow/20",
              "transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-jp-yellow/30",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            )}
            Continuar
          </button>
        </form>
      </motion.div>
    </div>
  );
}
