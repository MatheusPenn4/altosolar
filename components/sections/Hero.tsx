"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { ShieldCheck, Check, Phone, ArrowRight } from "lucide-react";
import { GoogleRating } from "@/components/ui/GoogleRating";
import { HERO_CARDS, COMPANY } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";

const ease = [0.21, 0.47, 0.32, 0.98] as const;
const PERKS = ["Orçamento Gratuito", "Resposta Rápida", "Sem Compromisso"];
const HEADLINE = ["Transforme Sua", "Conta de Energia", "em Investimento"];

/* Partículas quase imperceptíveis (determinísticas → sem mismatch de hidratação) */
const PARTICLES = [
  { l: 62, t: 30, s: 2, d: 20, delay: 0, max: 0.22, dx: 8, dy: -70 },
  { l: 74, t: 52, s: 3, d: 24, delay: 5, max: 0.18, dx: -6, dy: -80 },
  { l: 84, t: 36, s: 2, d: 22, delay: 9, max: 0.2, dx: 6, dy: -75 },
  { l: 68, t: 64, s: 2, d: 26, delay: 3, max: 0.16, dx: -8, dy: -65 },
  { l: 90, t: 58, s: 2, d: 21, delay: 7, max: 0.18, dx: 6, dy: -72 },
  { l: 56, t: 46, s: 2, d: 25, delay: 11, max: 0.15, dx: -6, dy: -68 },
];

export function Hero() {
  // Parallax MUITO sutil (Apple-like), só desktop
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 50, damping: 20, mass: 0.6 });

  function onMove(e: React.MouseEvent<HTMLElement>) {
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(pointer: fine)").matches
    )
      return;
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  const bgX = useTransform(sx, (v) => v * -10);
  const bgY = useTransform(sy, (v) => v * -8);
  const glowX = useTransform(sx, (v) => v * 36);
  const glowY = useTransform(sy, (v) => v * 36);
  const cardsX = useTransform(sx, (v) => v * 16);
  const cardsY = useTransform(sy, (v) => v * 12);

  return (
    <section
      id="inicio"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-24"
    >
      {/* ===== BACKGROUND — painéis cinematográficos (full-width) ===== */}
      <motion.div className="absolute inset-0 -z-30" style={{ x: bgX, y: bgY }}>
        <motion.div
          className="absolute -inset-[4%]"
          initial={{ scale: 1.04 }}
          animate={{ scale: 1.1 }}
          transition={{
            duration: 22,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <Image
            src="/hero.png"
            alt="Campo de painéis solares Alto Solar ao entardecer em Mato Grosso"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
        </motion.div>
      </motion.div>

      {/* Escurecimento à esquerda + gradiente para leitura + glow dourado à direita */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/40" />
      <motion.div
        aria-hidden
        className="hero-glow-breath pointer-events-none absolute right-[8%] top-[24%] -z-10 h-[34vw] w-[34vw] max-h-[480px] max-w-[480px] rounded-full blur-[130px]"
        style={{
          x: glowX,
          y: glowY,
          background:
            "radial-gradient(circle, rgba(255,184,0,0.16), rgba(0,191,255,0.1) 55%, transparent 72%)",
        }}
      />

      {/* Partículas quase imperceptíveis */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="hero-particle"
            style={{
              left: `${p.l}%`,
              top: `${p.t}%`,
              width: p.s,
              height: p.s,
              background:
                "radial-gradient(circle, rgba(0,191,255,0.8), transparent 70%)",
              ["--dur" as string]: `${p.d}s`,
              ["--delay" as string]: `${p.delay}s`,
              ["--max" as string]: p.max,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
            }}
          />
        ))}
      </div>

      {/* ===== CONTEÚDO ===== */}
      <div className="relative mx-auto w-full max-w-[1240px] pl-2 pr-5 sm:pr-6 lg:px-8">
        <div className="max-w-[780px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="eyebrow"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-brand-cyan" />
            +500 Sistemas Instalados em Mato Grosso
          </motion.div>

          <h1
            className="mt-6 font-display font-extrabold tracking-[-0.03em] text-white"
            style={{ fontSize: "clamp(3.2rem, 5vw, 5.8rem)", lineHeight: 0.95 }}
          >
            {HEADLINE.map((line, i) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease }}
                className="block"
              >
                {line === "em Investimento" ? (
                  <>
                    em <span className="text-grad-mix">Investimento</span>
                  </>
                ) : (
                  line
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42, ease }}
            className="lead mt-6 max-w-xl"
          >
            Mais de 500 sistemas instalados em Cuiabá, Várzea Grande, Chapada dos
            Guimarães, Campo Verde, Tangará da Serra e toda a região. Equipe
            própria de instalação, financiamento facilitado e atendimento
            especializado.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.52, ease }}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
          >
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-grad-blue text-ink-950">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease }}
            className="mt-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <a
              href={WA.orcamento()}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp"
              data-track-source="hero"
              className="cta-gold group inline-flex w-full items-center justify-center gap-2 rounded-full bg-grad-amber px-8 py-4 font-semibold text-ink-950 shadow-glow-amber transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
            >
              Solicitar Orçamento Gratuito
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#calculadora"
              className="glass-hero group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-white/[0.08] active:scale-[0.98] sm:w-auto"
            >
              Simular Minha Economia
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href={`tel:${COMPANY.phoneTel}`}
              data-track="call"
              data-track-source="hero"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-semibold text-white/80 transition-colors hover:text-white sm:w-auto"
            >
              <Phone className="h-4 w-4" /> Ligar Agora
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.78 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <GoogleRating />
            <span className="text-sm text-muted">
              Avaliação de clientes em todo o estado
            </span>
          </motion.div>
        </div>

        {/* ===== CARDS (2x2, discretos, canto inferior direito — só desktop) ===== */}
        <motion.div
          style={{ x: cardsX, y: cardsY }}
          className="pointer-events-none absolute bottom-8 right-0 hidden w-[300px] grid-cols-2 gap-3 lg:grid"
        >
          {HERO_CARDS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: [0, i % 2 === 0 ? -5 : -3, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.7 + i * 0.1 },
                y: {
                  duration: 6 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.4,
                },
              }}
              className="glass-hero rounded-xl px-4 py-3"
            >
              <div className="font-display text-lg font-bold text-grad-blue">
                {c.value}
              </div>
              <div className="mt-0.5 text-xs text-muted">{c.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
