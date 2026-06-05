"use client";

import { Check, X } from "lucide-react";
import { COMPARISON } from "@/lib/constants";
import { Section, SectionHeader, GlowOrb } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Logo } from "@/components/ui/Logo";

export function Comparison() {
  return (
    <Section id="diferenciais" className="overflow-hidden bg-ink-900/40">
      <GlowOrb className="left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2" />
      <div className="container">
        <SectionHeader
          eyebrow="Diferenciais"
          title="Por Que Escolher a Alto Solar?"
          subtitle="Veja o que nos diferencia das empresas tradicionais de energia solar."
        />

        <Reveal className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {/* Alto Solar */}
          <div className="relative overflow-hidden rounded-3xl border border-brand-blue/30 bg-grad-blue/[0.05] p-8 shadow-glow">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <span className="rounded-full bg-grad-blue px-3 py-1 text-xs font-semibold text-ink-950">
                Recomendado
              </span>
            </div>
            <ul className="space-y-4">
              {COMPARISON.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grad-blue text-ink-950">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-medium text-white">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mercado tradicional */}
          <div className="rounded-3xl border border-hair bg-white/[0.02] p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-muted">
                Mercado Tradicional
              </span>
            </div>
            <ul className="space-y-4">
              {COMPARISON.map((item) => (
                <li key={item} className="flex items-center gap-3 opacity-60">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hair text-muted">
                    <X className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-muted line-through decoration-muted/40">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
