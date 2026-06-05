import { PARTNERS } from "@/lib/constants";

export function SocialProof() {
  const items = [...PARTNERS, ...PARTNERS];
  return (
    <section className="border-y border-hair bg-ink-900/40 py-12">
      <div className="container">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Trabalhamos com as melhores marcas do mercado
        </p>
      </div>
      <div className="mask-fade-x relative overflow-hidden">
        <div className="flex w-max animate-marquee items-center gap-12 px-7">
          {items.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-12 whitespace-nowrap font-display text-lg font-medium tracking-tight text-white/40 transition-colors duration-300 hover:text-white/75"
            >
              {p}
              <span className="h-1 w-1 rounded-full bg-white/15" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
