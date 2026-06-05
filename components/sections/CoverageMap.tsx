"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Zap,
  TrendingDown,
  Users,
  Timer,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import {
  MT_PATH,
  MT_VIEWBOX,
  PROJECT_CITIES,
  SECONDARY_CITIES,
  INSTALL_CLUSTERS,
  type ProjectCity,
} from "@/lib/mtMap";
import { WA } from "@/lib/whatsapp";
import { BLUR_DATA_URL } from "@/lib/utils";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const INDICATORS = [
  { icon: CheckCircle2, label: "+500 Sistemas Instalados" },
  { icon: MapPin, label: "Atendemos todo Mato Grosso" },
  { icon: Users, label: "Equipe Própria" },
  { icon: Timer, label: "Instalação Rápida" },
  { icon: Landmark, label: "Financiamento Facilitado" },
];

export function CoverageMap() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <Section id="atuacao" className="overflow-hidden">
      {/* Glows de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[600px] w-[700px] -translate-x-1/2 rounded-full bg-brand-blue/10 blur-[140px]"
      />

      <div className="container">
        <SectionHeader
          eyebrow="Cobertura Regional"
          title="Presença em Toda a Região"
          subtitle="Já realizamos projetos em diversas cidades de Mato Grosso. Veja onde a Alto Solar já está gerando economia."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-5">
          {/* ===== MAPA (60%) ===== */}
          <Reveal className="lg:col-span-3">
            <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-4 shadow-glow backdrop-blur-xl sm:p-6">
              {/* borda iluminada superior */}
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/60 to-transparent" />

              {/* HUD canto */}
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
                  Cobertura ao vivo
                </span>
                <span>{PROJECT_CITIES.length} cidades atendidas</span>
              </div>

              <div className="relative mx-auto aspect-[1000/963] w-full max-w-2xl">
                <svg
                  viewBox={MT_VIEWBOX}
                  className="absolute inset-0 h-full w-full"
                  role="img"
                  aria-label="Mapa de Mato Grosso com as cidades atendidas pela Alto Solar"
                >
                  <defs>
                    <linearGradient id="mtFill" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#00AFFF" stopOpacity="0.22" />
                      <stop offset="0.55" stopColor="#00D4FF" stopOpacity="0.1" />
                      <stop offset="1" stopColor="#FFC107" stopOpacity="0.12" />
                    </linearGradient>
                    <linearGradient id="mtStroke" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#00D4FF" />
                      <stop offset="1" stopColor="#00AFFF" />
                    </linearGradient>
                    <filter id="mtGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <pattern
                      id="mtGrid"
                      width="34"
                      height="34"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M34 0H0V34"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>

                  {/* preenchimento + grid técnico recortado ao estado */}
                  <clipPath id="mtClip">
                    <path d={MT_PATH} />
                  </clipPath>
                  <motion.path
                    d={MT_PATH}
                    fill="url(#mtFill)"
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{ transformOrigin: "center" }}
                  />
                  <rect
                    width="1000"
                    height="963"
                    fill="url(#mtGrid)"
                    clipPath="url(#mtClip)"
                  />

                  {/* contorno iluminado, desenhado */}
                  <motion.path
                    d={MT_PATH}
                    fill="none"
                    stroke="url(#mtStroke)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    filter="url(#mtGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>

                {/* Rótulo central */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0, letterSpacing: "0.5em" }}
                    whileInView={{ opacity: 1, letterSpacing: "0.32em" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="select-none font-display text-base font-bold uppercase tracking-[0.32em] text-white/15 sm:text-2xl"
                  >
                    Mato Grosso
                  </motion.span>
                </div>

                {/* Micro-pontos: aparecem apenas no hover da cidade selecionada */}
                <AnimatePresence>
                  {hovered !== null && (
                    <motion.div
                      key={hovered}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pointer-events-none absolute inset-0 z-[15]"
                    >
                      {INSTALL_CLUSTERS[hovered].points.map((p, j) => (
                        <span
                          key={j}
                          className="install-dot"
                          style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: p.size,
                            height: p.size,
                            ["--dur" as string]: `${p.duration}s`,
                            ["--delay" as string]: `${p.delay}s`,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cidades secundárias — nome SEMPRE visível */}
                {SECONDARY_CITIES.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 + i * 0.07 }}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  >
                    <span className="block h-1.5 w-1.5 rounded-full bg-white/50 shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                    <span className={labelClasses(c.labelSide, false)}>
                      {c.name}
                    </span>
                  </motion.div>
                ))}

                {/* Cidades com projeto — núcleo + nome SEMPRE visível + tooltip */}
                {PROJECT_CITIES.map((c, i) => (
                  <motion.button
                    key={c.name}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 1.1 + i * 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                    }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
                    style={{
                      left: `${c.x}%`,
                      top: `${c.y}%`,
                      zIndex: hovered === i ? 40 : 20,
                    }}
                    aria-label={`${c.name}: ${c.type}, ${c.power}, ${c.systems} sistemas`}
                  >
                    <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-brand-amber/50" />
                    <span className="relative block h-3.5 w-3.5 rounded-full bg-grad-amber shadow-[0_0_14px_4px_rgba(255,165,0,0.75)] ring-2 ring-ink-950/50 transition-transform duration-300 hover:scale-125" />
                    <span className={labelClasses(c.labelSide, true)}>
                      {c.name}
                    </span>
                    <AnimatePresence>
                      {hovered === i && <Tooltip city={c} />}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>

              {/* Indicadores abaixo do mapa */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 border-t border-hair pt-5">
                {INDICATORS.map((ind) => (
                  <span
                    key={ind.label}
                    className="flex items-center gap-2 text-xs font-medium text-white/80"
                  >
                    <ind.icon className="h-4 w-4 text-brand-cyan" />
                    {ind.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ===== PAINEL LATERAL (40%) ===== */}
          <Reveal delay={0.15} className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-3xl border border-hair bg-ink-900/40 p-6">
              <h3 className="font-display text-lg font-bold text-white">
                Cidades com Projetos Realizados
              </h3>
              <p className="mt-1 text-sm text-muted">
                Passe o mouse em uma cidade para destacar os sistemas
                instalados.
              </p>

              <div className="mt-5 grid gap-3 lg:max-h-[460px] lg:overflow-y-auto lg:pr-1">
                {PROJECT_CITIES.map((c, i) => (
                  <motion.div
                    key={c.name}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className={`group flex gap-4 rounded-2xl border p-3 transition-all duration-300 ${
                      hovered === i
                        ? "border-brand-amber/40 bg-white/[0.05]"
                        : "border-hair bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={c.image}
                        alt={`Instalação solar em ${c.name}`}
                        fill
                        sizes="64px"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand-amber" />
                        <span className="truncate font-display text-sm font-semibold text-white">
                          {c.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        {c.type}
                        <span className="rounded-full bg-brand-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-amber">
                          {c.systems} sistemas
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-white/80">
                          <Zap className="h-3 w-3 text-brand-gold" /> {c.power}
                        </span>
                        <span className="flex items-center gap-1 text-brand-cyan">
                          <TrendingDown className="h-3 w-3" /> {c.economy}/mês
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <a
                href={WA.orcamento()}
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp"
                data-track-source="mapa_cobertura"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-grad-blue px-6 py-3.5 text-sm font-semibold text-ink-950 shadow-glow transition-transform duration-300 hover:-translate-y-0.5"
              >
                Quero energia solar na minha cidade
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/** Posiciona o rótulo (sempre visível) ao redor do nó da cidade. */
function labelClasses(side: "right" | "left" | "top" | "bottom", primary: boolean) {
  const base =
    "pointer-events-none absolute whitespace-nowrap font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]";
  const tone = primary
    ? "text-[10px] font-semibold text-white sm:text-xs"
    : "text-[9px] text-white/55 sm:text-[10px]";
  const pos = {
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2 text-right",
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  }[side];
  return `${base} ${tone} ${pos}`;
}

function Tooltip({ city }: { city: ProjectCity }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-full left-1/2 z-40 mb-3 w-52 -translate-x-1/2"
    >
      <div className="glass-strong overflow-hidden rounded-2xl border border-white/15 p-3 text-left shadow-card">
        <div className="font-display text-sm font-bold text-white">
          {city.name}
        </div>
        <div className="text-[11px] text-brand-amber">{city.type}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
            <div className="text-muted">Potência</div>
            <div className="font-semibold text-white">{city.power}</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
            <div className="text-muted">Economia</div>
            <div className="font-semibold text-brand-cyan">
              {city.economy}/mês
            </div>
          </div>
        </div>
      </div>
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-white/15 bg-ink-900" />
    </motion.div>
  );
}
