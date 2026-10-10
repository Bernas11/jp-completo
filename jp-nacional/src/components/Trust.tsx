import { ShieldCheck, FileText, Lock } from "lucide-react";
import Reveal from "@/components/Reveal";

const ICONS = [ShieldCheck, Lock, FileText] as const;

export default function Trust({
  eyebrow, heading, lede, items,
}: {
  eyebrow: string;
  heading: string;
  lede: string;
  items: { title: string; text: string }[];
}) {
  return (
    <section className="py-24 bg-jp-blue-tint">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-jp-blue/10 text-jp-blue font-display text-xs mb-4">
            {eyebrow}
          </span>
          <h2 className="font-headline text-3xl sm:text-4xl text-jp-blue-deep mb-4">
            {heading}
          </h2>
          <p className="text-jp-ink-soft max-w-xl mx-auto">
            {lede}
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal
                key={item.title}
                delay={i * 0.1}
                className="bg-jp-blue-tint2 border border-jp-line rounded-2xl p-7 hover:shadow-lg hover:shadow-jp-blue/10 hover:-translate-y-1 transition-all duration-300"
              >
                <Icon size={24} className="text-jp-blue mb-4" />
                <h3 className="font-headline text-base text-jp-blue-deep mb-2">{item.title}</h3>
                <p className="text-jp-ink-soft text-sm leading-relaxed">{item.text}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
