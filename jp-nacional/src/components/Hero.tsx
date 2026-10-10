import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight, ChevronDown, Calendar, MapPin, Users, Flag } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const STAT_ICONS = [Calendar, MapPin, Flag, Users] as const;
const STAT_VALUES = [
  { value: "1974", suffix: "" },
  { value: "100", suffix: "+" },
  { value: "XXVII", suffix: "" },
  { value: "3", suffix: "" },
] as const;

type HeroCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  ctaPrimary: string;
  ctaSecondary: string;
  statLabels: [string, string, string, string];
  marqueeItems: string[];
};

export default function Hero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden bg-jp-blue-deep" aria-labelledby="hero-heading">
      
      {/* 1. Foto de fundo real (opacidade alta para se ver bem) */}
      <Image
        src="/brand/hero-bg.jpg"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={60}
        className="object-cover object-center opacity-70"
        aria-hidden="true"
      />

      {/* 2. Overlay azul transparente */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-jp-blue-deep/60 via-jp-blue-deep/65 to-jp-blue-deep/85 pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Luzes decorativas desfocadas */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-jp-yellow/10 blur-[120px] pointer-events-none hidden md:block" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-jp-blue/20 blur-[120px] pointer-events-none hidden md:block" aria-hidden="true" />

      {/* 3. Símbolo JP na Esquerda */}
      <div className="absolute left-8 top-24 w-10 h-10 opacity-70 hidden lg:block z-10" aria-hidden="true">
        <Image src="/brand/logo-badge.png" alt="" width={40} height={40} className="rounded-lg -rotate-12" />
      </div>

      {/* 4. Símbolo JP na Direita (Inclinado para a direita) */}
      <div className="absolute right-8 top-24 w-10 h-10 opacity-70 hidden lg:block z-10" aria-hidden="true">
        <Image src="/brand/logo-badge.png" alt="" width={40} height={40} className="rounded-lg rotate-12" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-16">
        
        <div
          className="hero-in glass-panel inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-jp-yellow text-xs font-bold tracking-wide mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-jp-yellow animate-pulse" />
          {copy.eyebrow}
        </div>

        <h1
          id="hero-heading"
          className="hero-in hero-in-1 font-headline text-4xl sm:text-6xl lg:text-7xl text-white leading-[1.05] mb-6 max-w-4xl"
        >
          {copy.title}
        </h1>

        <p
          className="hero-in hero-in-2 text-white/80 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mb-10 drop-shadow-sm"
        >
          {copy.lede}
        </p>

        <div
          className="hero-in hero-in-3 flex flex-col sm:flex-row gap-4 items-center justify-center mb-16 w-full sm:w-auto"
        >
          <Link
            href="/aderir"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-jp-yellow text-jp-blue-deep font-display text-sm shadow-lg shadow-jp-yellow/20 hover:-translate-y-0.5 hover:shadow-jp-yellow/30 transition-all"
          >
            {copy.ctaPrimary} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#pilares"
            className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white font-display text-sm hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            {copy.ctaSecondary}
          </Link>
        </div>

        <div
          className="hero-in hero-in-4 relative grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl"
        >
          <div className="blob-morph absolute -inset-x-10 -inset-y-8 bg-jp-yellow/[0.07] blur-2xl pointer-events-none -z-10 hidden md:block" aria-hidden="true" />
          {STAT_VALUES.map((s, i) => {
            const Icon = STAT_ICONS[i];
            const label = copy.statLabels[i];
            return (
              <div
                key={label}
                className="glass-panel rounded-2xl p-5 text-center hover:border-jp-yellow/40 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex justify-center mb-2"><Icon size={20} className="text-jp-yellow" /></div>
                <div className="font-headline text-2xl text-white mb-0.5">
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-white/60 text-xs font-medium leading-snug">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Marquee */}
      <div className="relative z-10 border-t border-white/10 bg-black/10 py-4 overflow-hidden">
        <div className="flex w-max animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]">
          {[...copy.marqueeItems, ...copy.marqueeItems].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-white/60 font-medium whitespace-nowrap">{item}</span>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 pointer-events-none"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase font-bold tracking-widest">Descobrir</span>
        <ChevronDown size={14} className="animate-bounce" />
      </div>
    </section>
  );
}