"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { establishServerSession } from "@/actions/auth";
import { verifyCredentials } from "@/actions/login";
import { cn } from "@/lib/utils";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const OTP_LENGTH = 6;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function PillButton({
  children,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
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
      {children}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"credenciais" | "totp" | "enroll">("credenciais");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [enrollQrCode, setEnrollQrCode] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const inactivityNotice = searchParams.get("motivo") === "inatividade";

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await verifyCredentials({ email, password });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // hidrata a sessão no cliente — necessário para os passos seguintes
    // de MFA (listFactors/challenge/verify correm no browser). A sessão
    // definitiva só fica persistida a sério mais tarde, via
    // establishServerSession, depois do MFA confirmado.
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });

    if (setSessionError) {
      setError("Não foi possível continuar a sessão. Tenta novamente.");
      setLoading(false);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (!factors?.totp?.length) {
      // primeiro acesso desta conta — não há fator TOTP ainda, inicia a inscrição
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Autenticador",
      });

      if (enrollError || !enrollData) {
        setError(
          enrollError?.message
            ? `Não foi possível iniciar a configuração de segurança: ${enrollError.message}`
            : "Não foi possível iniciar a configuração de segurança. Contacta a CPN.",
        );
        setLoading(false);
        return;
      }

      setEnrollFactorId(enrollData.id);
      setEnrollQrCode(enrollData.totp.qr_code);
      setEnrollSecret(enrollData.totp.secret);
      setStep("enroll");
      setLoading(false);
      return;
    }

    setStep("totp");
    setLoading(false);
  };

  const handleEnrollVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollFactorId) return;
    setLoading(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollFactorId,
      code: enrollCode,
    });

    if (verifyError) {
      setError(
        `Código incorreto ou expirado: ${verifyError.message}. Confirma que a app de autenticação está sincronizada.`,
      );
      setLoading(false);
      return;
    }

    // O servidor estabelece a sessão a partir dos tokens (não confiamos no
    // timing da escrita de cookies do browser client — ver comentário na
    // própria action).
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Sessão perdida após a verificação. Tenta novamente.");
      setLoading(false);
      return;
    }
    await establishServerSession(
      sessionData.session.access_token,
      sessionData.session.refresh_token,
    );
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];

    if (!totpFactor) {
      setError("Nenhum fator TOTP configurado nesta conta. Contacta a CPN.");
      setLoading(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    });

    if (challengeError) {
      setError(`Não foi possível iniciar a verificação: ${challengeError.message}`);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code: totpCode,
    });

    if (verifyError) {
      setError(`Código incorreto ou expirado: ${verifyError.message}`);
      setLoading(false);
      return;
    }

    // O servidor estabelece a sessão a partir dos tokens (não confiamos no
    // timing da escrita de cookies do browser client — ver comentário na
    // própria action).
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("Sessão perdida após a verificação. Tenta novamente.");
      setLoading(false);
      return;
    }
    await establishServerSession(
      sessionData.session.access_token,
      sessionData.session.refresh_token,
    );
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-jp-blue-deep">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(0,51,198,0.85), transparent 42%), radial-gradient(circle at 88% 92%, rgba(36,57,158,0.85), transparent 48%)",
        }}
      />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-jp-yellow/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-jp-blue/20 blur-[120px]" />

      <Image
        src="/brand/logo-badge.png"
        alt=""
        width={140}
        height={140}
        className="pointer-events-none absolute -left-6 -top-6 opacity-[0.08] [transform:rotate(-12deg)]"
      />
      <Image
        src="/brand/logo-badge.png"
        alt=""
        width={180}
        height={180}
        className="pointer-events-none absolute -bottom-10 -right-10 opacity-[0.08] [transform:rotate(12deg)]"
      />

      {/* Painel de marca */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jp-yellow opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-jp-yellow" />
            </span>
            <span className="font-display text-xs uppercase tracking-widest text-white">
              Acesso reservado
            </span>
          </span>
        </motion.div>

        <div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="font-headline text-4xl text-white xl:text-5xl"
          >
            Painel de
            <br />
            Administração
          </motion.p>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-4 max-w-sm text-sm leading-relaxed text-white/60"
          >
            Gestão de militância, eventos e comunicações da Juventude Popular.
            Toda a atividade fica registada em auditoria.
          </motion.p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="flex items-center gap-3 text-xs text-white/40"
        >
          <ShieldCheck className="h-4 w-4" />
          Autenticação de dois fatores obrigatória
        </motion.div>
      </div>

      {/* Painel do formulário */}
      <div className="relative flex w-full flex-1 items-center justify-center p-6 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jp-blue">
                <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="font-headline text-lg text-jp-ink">Administração - Juventude Popular</p>
            </div>

            <p className="hidden font-headline text-2xl text-jp-ink lg:block">
              {step === "credenciais"
                ? "Iniciar sessão"
                : step === "enroll"
                  ? "Configurar autenticação"
                  : "Verificação em duas etapas"}
            </p>
            <p className="mt-1.5 hidden text-sm text-jp-ink-soft lg:block">
              {step === "credenciais"
                ? "Usa as tuas credenciais institucionais para continuar."
                : step === "enroll"
                  ? "Primeiro acesso — associa a tua app de autenticação."
                  : "Confirma a tua identidade com a app de autenticação."}
            </p>

            {inactivityNotice && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  A tua sessão expirou por inatividade. Inicia sessão novamente.
                </p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === "credenciais" ? (
                <motion.form
                  key="credenciais"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleCredentials}
                  className="mt-6 space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-jp-ink">
                      Email institucional
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="nome@juventudepopular.pt"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-jp-ink">
                      Palavra-passe
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-jp-ink-soft hover:text-jp-blue-deep"
                        tabIndex={-1}
                        aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border-l-4 border-red-500 bg-red-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <PillButton loading={loading} disabled={loading}>
                    Continuar
                  </PillButton>
                </motion.form>
              ) : step === "enroll" ? (
                <motion.form
                  key="enroll"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleEnrollVerify}
                  className="mt-6 space-y-5"
                >
                  <div className="flex items-center gap-3 rounded-xl bg-jp-blue-tint p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-jp-blue">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm text-jp-ink">
                      Primeiro acesso — a tua conta ainda não tem autenticação em duas etapas.
                    </p>
                  </div>

                  <div className="space-y-2 text-center">
                    <p className="text-sm text-jp-ink">
                      Digitaliza este código com o Google Authenticator, 1Password ou app
                      equivalente:
                    </p>
                    {enrollQrCode && (
                      <div className="mx-auto w-fit rounded-xl border border-jp-line bg-white p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={enrollQrCode} alt="Código QR para configurar TOTP" width={176} height={176} />
                      </div>
                    )}
                    {enrollSecret && (
                      <p className="text-xs text-jp-ink-soft">
                        Não consegues digitalizar? Introduz manualmente:{" "}
                        <code className="rounded bg-jp-blue-tint px-1.5 py-0.5 font-mono text-jp-ink">
                          {enrollSecret}
                        </code>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="enrollCode" className="text-sm font-medium text-jp-ink">
                      Código gerado pela app
                    </label>
                    <input
                      id="enrollCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="000000"
                      maxLength={OTP_LENGTH}
                      value={enrollCode}
                      onChange={(e) =>
                        setEnrollCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                      }
                      className={cn(
                        "flex h-14 w-full rounded-xl border border-jp-line bg-white px-3 text-center font-mono text-2xl tracking-[0.5em] shadow-sm transition-colors",
                        "placeholder:tracking-[0.5em] placeholder:text-jp-ink-soft/30",
                        "focus-visible:outline-none",
                      )}
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border-l-4 border-red-500 bg-red-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <PillButton loading={loading} disabled={loading || enrollCode.length < OTP_LENGTH}>
                    Ativar e entrar
                  </PillButton>
                </motion.form>
              ) : (
                <motion.form
                  key="totp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleTotp}
                  className="mt-6 space-y-5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credenciais");
                      setError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-jp-ink-soft hover:text-jp-blue-deep"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar
                  </button>

                  <div className="flex items-center gap-3 rounded-xl bg-jp-blue-tint p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-jp-blue">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm text-jp-ink">
                      Introduz o código de 6 dígitos da tua app de autenticação
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="totp" className="text-sm font-medium text-jp-ink">
                      Código de verificação
                    </label>
                    <input
                      ref={otpRef}
                      id="totp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="000000"
                      maxLength={OTP_LENGTH}
                      value={totpCode}
                      onChange={(e) =>
                        setTotpCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                      }
                      className={cn(
                        "flex h-14 w-full rounded-xl border border-jp-line bg-white px-3 text-center font-mono text-2xl tracking-[0.5em] shadow-sm transition-colors",
                        "placeholder:tracking-[0.5em] placeholder:text-jp-ink-soft/30",
                        "focus-visible:outline-none",
                      )}
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border-l-4 border-red-500 bg-red-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <PillButton loading={loading} disabled={loading || totpCode.length < OTP_LENGTH}>
                    Entrar
                  </PillButton>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="mt-8 text-center text-xs text-jp-ink-soft">
              Problemas de acesso? Contacta a{" "}
              <span className="font-medium text-jp-blue-deep">CPN</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-jp-blue-deep">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
