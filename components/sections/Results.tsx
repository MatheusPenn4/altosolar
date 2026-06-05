"use client";

import Image from "next/image";
import { ArrowRight, ImageIcon, MapPin, Zap } from "lucide-react";
import { RESULTS } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { formatBRL, BLUR_DATA_URL } from "@/lib/utils";
import { Section, SectionHeader, GlowOrb } from "@/components/ui/Section";
import { StaggerGroup, StaggerItem, Reveal } from "@/components/ui/Reveal";

export function Results() {
  return (
    <Section id="resultados" className="overflow-hidden">
      <GlowOrb color="amber" className="-left-20 top-20 h-[420px] w-[420px]" />
      <div className="container">
        <SectionHeader
          eyebrow="Resultados Reais"
          title={
            <>
              Contas Antes e Depois da{" "}
              <span className="text-grad-mix">Energia Solar</span>
            </>
          }
          subtitle="Resultados reais de clientes em Mato Grosso. Estrutura pronta para exibir prints de contas e fotos das instalações."
        />

        <StaggerGroup className="grid gap-6 lg:grid-cols-3">
          {RESULTS.map((r) => {
            const economy = r.before - r.after;
            const pct = Math.round((economy / r.before) * 100);
            return (
              <StaggerItem key={r.city}>
                <div className="group h-full overflow-hidden rounded-3xl border border-hair bg-white/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/30">
                  {/* Foto da instalação / espaço para print */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-ink-800">
                    {r.installImage ? (
                      <Image
                        src={r.installImage}
                        alt={`Instalação de energia solar em ${r.city}`}
                        fill
                        sizes="(max-width:1024px) 100vw, 33vw"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                    <span className="absolute right-4 top-4 rounded-full bg-grad-amber px-3 py-1 text-xs font-bold text-ink-950">
                      -{pct}% na conta
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-brand-cyan" />{" "}
                        {r.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-brand-gold" /> {r.power}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-hair bg-white/[0.02] p-4">
                        <div className="text-[11px] uppercase tracking-wider text-muted">
                          Conta Antes
                        </div>
                        <div className="mt-1 font-display text-xl font-bold text-white/60 line-through decoration-red-400/60">
                          {formatBRL(r.before)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-brand-blue/30 bg-grad-blue/[0.06] p-4">
                        <div className="text-[11px] uppercase tracking-wider text-muted">
                          Conta Depois
                        </div>
                        <div className="mt-1 font-display text-xl font-bold text-grad-blue">
                          {formatBRL(r.after)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
                      <span className="text-sm text-muted">Economia mensal</span>
                      <span className="font-display text-lg font-bold text-grad-amber">
                        {formatBRL(economy)}
                      </span>
                    </div>

                    {/* Espaço reservado para print da conta real */}
                    {r.billImage && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-hair">
                        <Image
                          src={r.billImage}
                          alt={`Print da conta de energia — ${r.city}`}
                          width={600}
                          height={400}
                          className="w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        <Reveal className="mt-12 text-center">
          <a
            href={WA.simulacao()}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp"
            data-track-source="resultados"
            className="group inline-flex items-center gap-2 rounded-full bg-grad-blue px-7 py-4 font-semibold text-ink-950 shadow-glow transition-transform duration-300 hover:-translate-y-0.5"
          >
            Quero esse resultado na minha conta
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>
      </div>
    </Section>
  );
}
