"use client";

import { TrendingDown, Scale, ArrowDownRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/**
 * A6 — Bloco de aversão à perda + esclarecimento ético sobre a Lei 14.300.
 * Renderizado acima da calculadora.
 */
export function LossAversion() {
  return (
    <Reveal className="mx-auto mb-14 max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl border border-hair glass p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-amber/10 blur-3xl" />

        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grad-amber text-ink-950">
            <ArrowDownRight className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Quanto Dinheiro Você Está Deixando na Mesa?
            </h3>
            <p className="mt-3 text-muted leading-relaxed">
              Enquanto você continua pagando energia para a concessionária, esse
              dinheiro <strong className="text-white">nunca retorna</strong> para
              você. Com energia solar, cada conta paga ajuda a recuperar seu
              investimento — até que ele se pague e vire economia pura por
              décadas.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-hair bg-white/[0.02] p-5">
            <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-brand-cyan" />
            <p className="text-sm leading-relaxed text-muted">
              A tarifa de energia <strong className="text-white">sobe todos
              os anos</strong>. Quem gera a própria energia se protege desses
              reajustes e trava a economia.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-hair bg-white/[0.02] p-5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" />
            <p className="text-sm leading-relaxed text-muted">
              <strong className="text-white">Lei 14.300:</strong> o marco legal
              da geração distribuída prevê a cobrança gradual sobre a energia
              injetada na rede. Quem instala mais cedo aproveita melhores
              condições e maior retorno ao longo do tempo.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
