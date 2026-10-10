"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { requestMagicLink } from "@/actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const { execute, status, result } = useAction(requestMagicLink, {
    onSuccess: () => setSent(true),
  });

  const loading = status === "executing";
  const error = result?.serverError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({
      email,
      redirectTo: `${window.location.origin}/auth/callback`,
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-jp-blue-deep p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(0,51,198,0.85), transparent 42%), radial-gradient(circle at 82% 88%, rgba(36,57,158,0.85), transparent 48%)",
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
        className="relative w-full max-w-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 flex justify-center"
        >
          <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jp-yellow opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-jp-yellow" />
            </span>
            <span className="font-display text-xs uppercase tracking-widest text-white">
              Portal de Militantes
            </span>
          </span>
        </motion.div>

        <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-jp-blue">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <p className="mt-4 font-headline text-2xl text-jp-ink">Juventude Popular</p>
          <p className="mt-1 text-sm text-jp-ink-soft">
            Acesso reservado a Militantes e Simpatizantes
          </p>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <p className="mt-4 text-sm text-jp-ink-soft">
                  Enviámos um link de acesso para{" "}
                  <strong className="text-jp-blue-deep">{email}</strong>. Abre o email e clica no
                  link para entrares.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 text-left"
              >
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-jp-ink">
                    O teu email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jp-ink-soft" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="nome@exemplo.pt"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-jp-ink-soft">
                  Se já és Militante, usa o mesmo email da tua adesão para entrares
                  automaticamente como Militante.
                </p>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border-l-4 border-jp-yellow bg-jp-blue-tint p-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-jp-blue-deep" />
                    <p className="text-sm text-jp-ink">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "group flex w-full items-center justify-center gap-2 rounded-full bg-jp-yellow px-6 py-3.5",
                    "font-display text-sm uppercase tracking-wide text-jp-blue-deep shadow-lg shadow-jp-yellow/20",
                    "transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-jp-yellow/30",
                    "disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                  Enviar link de acesso
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Juventude Popular — plataforma oficial de militantes
        </p>
        <p className="mt-2 text-center text-xs text-white/40">
          <Link href="/politica-privacidade" className="underline hover:text-white/70">
            Política de Privacidade
          </Link>
          {" · "}
          <Link href="/politica-cookies" className="underline hover:text-white/70">
            Política de Cookies
          </Link>
          {" · "}
          <Link href="/termos-condicoes" className="underline hover:text-white/70">
            Termos e Condições
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
