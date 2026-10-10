export default function PageHero({
  eyebrow, title, lede,
}: { eyebrow: string; title: string; lede: string }) {
  return (
    <section className="relative overflow-hidden bg-jp-blue-deep text-white py-24 border-b border-white/10">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #FDE021, transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="font-display text-xs text-jp-yellow mb-3">{eyebrow}</p>
        <h1 className="font-headline text-4xl md:text-5xl mb-5 max-w-3xl">{title}</h1>
        <p className="text-white/70 text-lg max-w-[58ch]">{lede}</p>
      </div>
    </section>
  );
}
