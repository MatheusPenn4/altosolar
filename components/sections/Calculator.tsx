"use client";

import { useMemo, useState } from "react";
import CountUp from "react-countup";
import { Sun, TrendingDown } from "lucide-react";
import { CALC } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/utils";
import { trackCalculator, trackWhatsApp } from "@/lib/analytics";
import { Section, SectionHeader, GlowOrb } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { LossAversion } from "./LossAversion";

export function Calculator() {
  const [bill, setBill] = useState(CALC.defaultBill);

  const { monthly, yearly, lifetime } = useMemo(() => {
    const monthly = Math.round(bill * CALC.savingsRate);
    return {
      monthly,
      yearly: monthly * 12,
      lifetime: monthly * 12 * CALC.years,
    };
  }, [bill]);

  const pct = ((bill - CALC.minBill) / (CALC.maxBill - CALC.minBill)) * 100;

  return (
    <Section id="calculadora" className="overflow-hidden">
      <GlowOrb color="amber" className="right-0 top-10 h-[420px] w-[420px]" />
      <GlowOrb className="-left-20 bottom-0 h-[420px] w-[420px]" />

      <div className="container">
        <LossAversion />
        <SectionHeader
          eyebrow="Calculadora de Economia"
          title={
            <>
              Descubra Quanto Você Pode{" "}
              <span className="text-grad-amber">Economizar</span>
            </>
          }
          subtitle="Mova o controle de acordo com o valor da sua conta de luz e veja sua economia em tempo real."
        />

        <Reveal className="mx-auto max-w-4xl">
          <div className="glass-strong overflow-hidden rounded-3xl border border-hair">
            <div className="grid lg:grid-cols-2">
              {/* Input side */}
              <div className="border-b border-hair p-8 sm:p-10 lg:border-b-0 lg:border-r">
                <label className="flex items-center gap-2 text-sm font-medium text-muted">
                  <Sun className="h-4 w-4 text-brand-gold" />
                  Quanto você paga de energia por mês?
                </label>

                <div className="tabular mt-6 font-display text-5xl font-bold tracking-tight text-white">
                  {formatBRL(bill)}
                </div>

                <input
                  type="range"
                  min={CALC.minBill}
                  max={CALC.maxBill}
                  step={CALC.step}
                  value={bill}
                  onChange={(e) => setBill(Number(e.target.value))}
                  onPointerUp={() => trackCalculator(bill, monthly)}
                  onKeyUp={() => trackCalculator(bill, monthly)}
                  aria-label="Valor da conta de energia mensal"
                  className="mt-8 h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(0,175,255,0.35)]"
                  style={{
                    background: `linear-gradient(to right,#00AFFF ${pct}%,rgba(255,255,255,0.1) ${pct}%)`,
                  }}
                />
                <div className="mt-3 flex justify-between text-xs text-muted">
                  <span>{formatBRL(CALC.minBill)}</span>
                  <span>{formatBRL(CALC.maxBill)}+</span>
                </div>

                <div className="mt-8 flex items-center gap-3 rounded-2xl border border-hair bg-white/[0.02] p-4">
                  <TrendingDown className="h-8 w-8 shrink-0 text-brand-cyan" />
                  <p className="text-sm text-muted">
                    Com energia solar, você economiza até{" "}
                    <strong className="text-white">95%</strong> na sua conta.
                  </p>
                </div>
              </div>

              {/* Result side */}
              <div className="bg-grad-blue/[0.04] p-8 sm:p-10">
                <ResultRow label="Economia Mensal" value={monthly} highlight />
                <ResultRow label="Economia Anual" value={yearly} />
                <ResultRow
                  label={`Economia em ${CALC.years} anos`}
                  value={lifetime}
                  big
                />

                <a
                  href={WA.simulacao(monthly, lifetime)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsApp("calculadora", { monthly, lifetime })}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-grad-amber px-6 py-4 text-center font-semibold text-ink-950 shadow-glow-amber transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Receber Simulação no WhatsApp
                </a>
                <p className="mt-3 text-center text-xs text-muted">
                  Simulação gratuita e sem compromisso.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function ResultRow({
  label,
  value,
  highlight,
  big,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  big?: boolean;
}) {
  return (
    <div className="border-b border-hair py-4 last:border-b-0">
      <div className="text-sm text-muted">{label}</div>
      <div
        className={`tabular font-display font-bold tracking-tight ${
          big
            ? "text-4xl text-grad-amber sm:text-5xl"
            : highlight
              ? "text-3xl text-white"
              : "text-2xl text-white/90"
        }`}
      >
        <CountUp
          end={value}
          duration={0.6}
          separator="."
          prefix="R$ "
          preserveValue
        />
      </div>
    </div>
  );
}
