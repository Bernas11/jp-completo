"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";
import {
  User, MapPinned, FileCheck, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, Upload, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { DISTRITOS } from "@/lib/constants";
import CONCELHOS_POR_DISTRITO from "@/lib/concelhos-por-distrito.json";
import { calcularIdade } from "@/lib/idade";
import { createFullFormSchema, type AderirFormValues } from "@/lib/adesao-form-schema";

const inputClass = (hasError?: boolean) => cn(
  "px-4 py-3 rounded-lg border text-sm text-white bg-white/5 w-full",
  "placeholder:text-white/35",
  "focus:outline-none focus:ring-2 focus:ring-jp-yellow focus:border-jp-yellow transition-all",
  hasError ? "border-red-400" : "border-white/15 hover:border-white/25"
);
const labelClass = "font-display text-xs text-jp-yellow block mb-1.5";

export default function AderirForm() {
  const t = useTranslations("aderir_form");
  const tErr = useTranslations("aderir_form_errors");

  const STEPS = [
    { id: 1, title: t("step1"), icon: User, fields: ["nome", "dataNascimento", "email", "telemovel", "encNome", "encContacto"] as const },
    { id: 2, title: t("step2"), icon: MapPinned, fields: ["morada", "localidade", "distrito", "concelho"] as const },
    { id: 3, title: t("step3"), icon: FileCheck, fields: ["numeroCC", "termos"] as const },
  ];

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState("");
  const [submittedNome, setSubmittedNome] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const schema = useMemo(() => createFullFormSchema((key) => tErr(key)), [tErr]);

  const {
    register, trigger, watch, getValues, setValue, formState: { errors },
  } = useForm<AderirFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      nome: "", dataNascimento: "", email: "", telemovel: "",
      estabelecimentoEnsino: "", encNome: "", encContacto: "",
      morada: "", numero: "", localidade: "", codigoPostal: "", distrito: "", concelho: "",
      numeroCC: "", termos: false,
    },
  });

  // Concelho: para o continente escolhe-se de uma lista fechada dos
  // municípios do distrito (garante que o militante fica atribuído à
  // concelhia certa, sem erros de escrita). Açores/Madeira não têm lista
  // aqui, ficam com texto livre.
  const distritoSel = watch("distrito");
  const concelhoSel = watch("concelho");
  const concelhosDoDistrito = (CONCELHOS_POR_DISTRITO as Record<string, string[]>)[distritoSel] ?? null;
  useEffect(() => {
    if (concelhosDoDistrito && concelhoSel && !concelhosDoDistrito.includes(concelhoSel)) {
      setValue("concelho", "");
    }
  }, [distritoSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const dataNascimento = watch("dataNascimento");
  const idade = useMemo(() => (dataNascimento ? calcularIdade(dataNascimento) : null), [dataNascimento]);
  const precisaAutorizacaoParental = idade !== null && idade >= 14 && idade < 16;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setFileError(t("erro_ficheiro_tamanho")); return; }
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(f.type)) { setFileError(t("erro_ficheiro_formato")); return; }
    setFileError("");
    setFile(f);
  };

  const next = async () => {
    const fields = STEPS[step - 1].fields;
    const valid = await trigger(fields as never);
    if (!valid) return;
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const valid = await trigger(STEPS[2].fields as never);
    if (!valid) return;
    if (!file) { setApiError(t("erro_ficheiro_obrigatorio")); return; }

    setLoading(true);
    setApiError("");
    try {
      const values = getValues();
      const body = new FormData();
      Object.entries(values).forEach(([k, v]) => body.append(k, String(v)));
      body.append("documento", file);
      body.append("website", ""); // honeypot

      const res = await fetch("/api/adesao", { method: "POST", body });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || t("erro_submeter"));
      }
      setSubmittedNome(values.nome);
      setSubmittedEmail(values.email);
      setDone(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t("erro_enviar"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-14 px-6">
        <m.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-jp-yellow flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle size={40} className="text-jp-blue-deep" />
        </m.div>
        <h3 className="font-headline text-2xl text-white mb-3">
          {t("bem_vindo", { nome: submittedNome.split(" ")[0] || t("camarada") })}
        </h3>
        <p className="text-white/65 text-sm leading-relaxed max-w-sm mx-auto">
          {t("confirmacao", { email: submittedEmail })}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-8">
      <nav aria-label={t("passos_aria")} className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone = step > s.id;
          const isCurrent = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isDone && "bg-jp-yellow text-jp-blue-deep",
                  isCurrent && "bg-white text-jp-blue-deep ring-4 ring-jp-yellow/30",
                  !isDone && !isCurrent && "bg-white/10 text-white/40"
                )} aria-current={isCurrent ? "step" : undefined}>
                  <Icon size={18} />
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", isCurrent ? "text-white" : "text-white/40")}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("w-16 sm:w-24 h-px mx-2 mb-5 transition-all duration-500", step > s.id ? "bg-jp-yellow" : "bg-white/15")} />
              )}
            </div>
          );
        })}
      </nav>

      <form onSubmit={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <m.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="nome">{t("label_nome")}</label>
                <input id="nome" {...register("nome")} placeholder={t("ph_nome")} className={inputClass(!!errors.nome)} />
                {errors.nome && <p className="text-red-300 text-xs mt-1">⚠ {errors.nome.message}</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="dataNascimento">{t("label_dataNascimento")}</label>
                  <input id="dataNascimento" type="date" {...register("dataNascimento")} className={inputClass(!!errors.dataNascimento)} />
                  {errors.dataNascimento && <p className="text-red-300 text-xs mt-1">⚠ {errors.dataNascimento.message}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="email">{t("label_email")}</label>
                  <input id="email" type="email" {...register("email")} placeholder={t("ph_email")} className={inputClass(!!errors.email)} />
                  {errors.email && <p className="text-red-300 text-xs mt-1">⚠ {errors.email.message}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="telemovel">{t("label_telemovel")}</label>
                  <input id="telemovel" type="tel" {...register("telemovel")} placeholder={t("ph_telemovel")} className={inputClass(!!errors.telemovel)} />
                  {errors.telemovel && <p className="text-red-300 text-xs mt-1">⚠ {errors.telemovel.message}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="estabelecimentoEnsino">{t("label_estabelecimento")}</label>
                  <input id="estabelecimentoEnsino" {...register("estabelecimentoEnsino")} placeholder={t("ph_estabelecimento")} className={inputClass()} />
                </div>
              </div>

              {precisaAutorizacaoParental && (
                <div className="bg-jp-yellow/10 border border-jp-yellow rounded-lg p-4 space-y-4">
                  <p className="text-sm text-jp-yellow font-medium">
                    {t("aviso_parental")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="encNome">{t("label_encNome")}</label>
                      <input id="encNome" {...register("encNome")} className={inputClass(!!errors.encNome)} />
                      {errors.encNome && <p className="text-red-300 text-xs mt-1">⚠ {errors.encNome.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="encContacto">{t("label_encContacto")}</label>
                      <input id="encContacto" {...register("encContacto")} className={inputClass(!!errors.encContacto)} />
                      {errors.encContacto && <p className="text-red-300 text-xs mt-1">⚠ {errors.encContacto.message}</p>}
                    </div>
                  </div>
                </div>
              )}
            </m.div>
          )}

          {step === 2 && (
            <m.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_auto] gap-4">
                <div>
                  <label className={labelClass} htmlFor="morada">{t("label_morada")}</label>
                  <input id="morada" {...register("morada")} placeholder={t("ph_morada")} className={inputClass(!!errors.morada)} />
                  {errors.morada && <p className="text-red-300 text-xs mt-1">⚠ {errors.morada.message}</p>}
                </div>
                <div className="sm:w-24">
                  <label className={labelClass} htmlFor="numero">{t("label_numero")}</label>
                  <input id="numero" {...register("numero")} className={inputClass()} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="localidade">{t("label_localidade")}</label>
                  <input id="localidade" {...register("localidade")} placeholder={t("ph_localidade")} className={inputClass(!!errors.localidade)} />
                  {errors.localidade && <p className="text-red-300 text-xs mt-1">⚠ {errors.localidade.message}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="codigoPostal">{t("label_cp")}</label>
                  <input id="codigoPostal" {...register("codigoPostal")} placeholder={t("ph_cp")} className={inputClass()} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="distrito">{t("label_distrito")}</label>
                  <select id="distrito" {...register("distrito")} className={inputClass(!!errors.distrito)}>
                    <option value="" className="text-jp-ink">{t("ph_seleciona")}</option>
                    {DISTRITOS.map((d) => <option key={d} value={d} className="text-jp-ink">{d}</option>)}
                  </select>
                  {errors.distrito && <p className="text-red-300 text-xs mt-1">⚠ {errors.distrito.message}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="concelho">{t("label_concelho")}</label>
                  {concelhosDoDistrito ? (
                    <select id="concelho" {...register("concelho")} className={inputClass(!!errors.concelho)}>
                      <option value="" className="text-jp-ink">{t("ph_seleciona")}</option>
                      {concelhosDoDistrito.map((c) => <option key={c} value={c} className="text-jp-ink">{c}</option>)}
                    </select>
                  ) : (
                    <input id="concelho" {...register("concelho")} placeholder={t("ph_concelho")} className={inputClass(!!errors.concelho)} />
                  )}
                  {errors.concelho && <p className="text-red-300 text-xs mt-1">⚠ {errors.concelho.message}</p>}
                </div>
              </div>
              <p className="text-xs text-white/40 italic">
                {t("nota_concelhia")}
              </p>
            </m.div>
          )}

          {step === 3 && (
            <m.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="numeroCC">{t("label_cc")}</label>
                <input id="numeroCC" {...register("numeroCC")} placeholder={t("ph_cc")} className={inputClass(!!errors.numeroCC)} />
                {errors.numeroCC && <p className="text-red-300 text-xs mt-1">⚠ {errors.numeroCC.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs text-jp-yellow">
                  {t("label_upload")}
                </label>
                {file ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-jp-yellow/40 bg-jp-yellow/10">
                    <span className="text-sm text-white truncate">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} aria-label={t("remover_ficheiro_aria")}>
                      <X size={16} className="text-white/60 hover:text-red-300" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-white/20 bg-white/5 hover:border-jp-yellow/50 cursor-pointer transition-all">
                    <Upload size={22} className="text-white/40" />
                    <span className="text-sm text-white/50">{t("upload_cta")}</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} className="sr-only" />
                  </label>
                )}
                {fileError && <p role="alert" className="text-red-300 text-xs">⚠ {fileError}</p>}
                <p className="text-xs text-white/40">
                  {t("nota_privacidade")}
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input type="checkbox" {...register("termos")} className="w-4 h-4 mt-0.5 accent-jp-yellow" />
                <span className="text-sm text-white/70">
                  {t("aceito_pre")}{" "}
                  <Link href="/politica-privacidade" target="_blank" className="text-jp-yellow underline">
                    {t("politica")}
                  </Link>.
                </span>
              </label>
              {errors.termos && <p className="text-red-300 text-xs">⚠ {errors.termos.message}</p>}

              {apiError && <p role="alert" className="text-red-300 text-sm text-center">{apiError}</p>}
            </m.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/60 hover:border-jp-yellow hover:text-white transition-all text-sm font-medium">
              <ArrowLeft size={16} /> {t("anterior")}
            </button>
          ) : <div />}

          {step < 3 ? (
            <button type="button" onClick={next}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-jp-yellow text-jp-blue-deep font-semibold text-sm hover:brightness-95 transition-all">
              {t("proximo")} <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={loading}
              className="flex items-center gap-2 px-7 py-3 rounded-full bg-jp-yellow text-jp-blue-deep font-bold text-sm hover:brightness-95 transition-all disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> {t("enviando")}</> : <>{t("confirmar")} <CheckCircle size={16} /></>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
