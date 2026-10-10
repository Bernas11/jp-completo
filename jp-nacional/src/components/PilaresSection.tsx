import { HeartHandshake, ShieldCheck, Scale } from "lucide-react";
import Reveal from "@/components/Reveal";

const ICONS = [HeartHandshake, ShieldCheck, Scale];

export default function PilaresSection({
  eyebrow, title, lede, items,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  items: { title: string; body: string }[];
}) {
  return (
    <section id="pilares" className="py-28 bg-jp-blue-tint">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-xl mb-14">
          <p className="font-display text-xs text-jp-blue mb-3">{eyebrow}</p>
          <h2 className="font-headline text-3xl md:text-4xl text-jp-blue-deep mb-4">{title}</h2>
          <p className="text-jp-ink-soft text-lg">{lede}</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => {
            const Icon = ICONS[i] ?? HeartHandshake;
            return (
              <Reveal
                key={item.title}
                delay={i * 0.12}
                className="group relative bg-jp-blue-tint2 border border-jp-line rounded-2xl p-7 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-jp-blue/10 hover:border-jp-blue/30 transition-all duration-300"
              >
                <span aria-hidden="true" className="absolute top-6 right-6 font-display text-3xl text-jp-blue/15 group-hover:text-jp-yellow/50 transition-colors">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-12 h-12 rounded-xl bg-jp-blue flex items-center justify-center mb-6 group-hover:bg-jp-yellow transition-colors">
                  <Icon size={22} className="text-jp-yellow group-hover:text-jp-blue-deep transition-colors" />
                </div>
                <h3 className="font-headline text-xl text-jp-blue-deep mb-3">{item.title}</h3>
                <p className="text-jp-ink-soft leading-relaxed">{item.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
