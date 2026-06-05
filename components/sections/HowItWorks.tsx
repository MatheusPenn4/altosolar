"use client";

import { STEPS } from "@/lib/constants";
import { Section, SectionHeader } from "@/components/ui/Section";
import { StaggerGroup, StaggerItem } from "@/components/ui/Reveal";

export function HowItWorks() {
  return (
    <Section id="como-funciona" className="bg-ink-900/40">
      <div className="container">
        <SectionHeader
          eyebrow="Processo Simples"
          title="Como Funciona"
          subtitle="Do primeiro contato à sua independência energética. Cuidamos de tudo para você."
        />

        <StaggerGroup className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* connecting line (desktop) */}
          <div className="pointer-events-none absolute left-0 top-12 hidden h-px w-full bg-gradient-to-r from-transparent via-hair to-transparent lg:block" />
          {STEPS.map((s) => (
            <StaggerItem key={s.n}>
              <div className="group relative h-full rounded-2xl border border-hair bg-ink-950/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-[0_24px_60px_-32px_rgba(0,175,255,0.45)]">
                <div className="tabular mb-4 font-display text-5xl font-bold text-grad-blue">
                  {s.n}
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </Section>
  );
}
