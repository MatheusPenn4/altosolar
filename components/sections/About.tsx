"use client";

import { Target, Eye, Heart, Users } from "lucide-react";
import { Section, GlowOrb } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { AboutVisual } from "./AboutVisual";

const PILLARS = [
  {
    icon: Target,
    title: "Missão",
    desc: "Levar economia e independência energética a famílias e empresas de Mato Grosso com excelência técnica.",
  },
  {
    icon: Eye,
    title: "Visão",
    desc: "Ser referência em energia solar na região, reconhecida pela confiança e qualidade das instalações.",
  },
  {
    icon: Heart,
    title: "Valores",
    desc: "Transparência, compromisso com prazos, atendimento próximo e responsabilidade ambiental.",
  },
  {
    icon: Users,
    title: "Equipe",
    desc: "Equipe própria e especializada, do projeto à instalação, sem terceirização.",
  },
];

export function About() {
  return (
    <Section id="sobre" className="overflow-x-clip">
      <GlowOrb color="amber" className="-right-20 top-10 h-[400px] w-[400px]" />
      <div className="container">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow mb-5">Sobre a Alto Solar</span>
            <h2 className="h-section mt-5 text-white">
              Uma Empresa Construída sobre{" "}
              <span className="text-grad-mix">Confiança</span>
            </h2>
            <p className="lead mt-5">
              Nascemos em Mato Grosso com um propósito claro: tornar a energia
              solar acessível, segura e verdadeiramente vantajosa. Em poucos
              anos, ultrapassamos a marca de <strong className="text-white">500
              sistemas instalados</strong>, sempre com equipe própria e
              atendimento dedicado.
            </p>
            <p className="mt-4 text-muted leading-relaxed">
              Não terceirizamos qualidade. Do primeiro contato à homologação,
              cada etapa é conduzida por nossa equipe especializada — por isso
              entregamos instalações rápidas, seguras e com a economia que
              prometemos.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                ["500+", "Instalações"],
                ["25 anos", "de Garantia"],
                ["100%", "Equipe Própria"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="rounded-2xl border border-hair bg-white/[0.02] p-4 text-center"
                >
                  <div className="font-display text-2xl font-bold text-grad-blue">
                    {v}
                  </div>
                  <div className="mt-1 text-xs text-muted">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <AboutVisual />
            <div className="grid gap-4 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-hair bg-white/[0.02] p-5"
                >
                  <p.icon className="mb-3 h-6 w-6 text-brand-cyan" />
                  <h3 className="font-display text-base font-semibold text-white">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
