import Reveal from "@/components/Reveal";

export default function Timeline({
  eyebrow, heading, marcos,
}: {
  eyebrow: string;
  heading: string;
  marcos: { ano: string; title: string; text: string }[];
}) {
  return (
    <section className="py-24 bg-jp-blue-deep text-white">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-jp-yellow/10 text-jp-yellow font-display text-xs mb-4">
            {eyebrow}
          </span>
          <h2 className="font-headline text-3xl sm:text-4xl mb-4">{heading}</h2>
        </Reveal>

        <div className="relative">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-white/15 hidden sm:block" aria-hidden="true" />
          <div className="space-y-10">
            {marcos.map((m, i) => (
              <Reveal
                key={m.ano}
                delay={i * 0.1}
                direction="left"
                className="relative grid sm:grid-cols-[56px_1fr] gap-5 items-start"
              >
                <div className="w-14 h-14 rounded-full bg-jp-yellow text-jp-blue-deep font-display text-xs flex items-center justify-center relative z-10 shrink-0">
                  {m.ano}
                </div>
                <div className="bg-white/[0.05] border border-white/10 rounded-xl p-5">
                  <h3 className="font-headline text-lg mb-1.5">{m.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{m.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
