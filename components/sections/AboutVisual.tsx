"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

const SRC = "/imagem-sobre-transparente.png";
const W = 1536;
const H = 1024;

/**
 * Composição visual premium da seção "Sobre" — agora com o CUTOUT
 * transparente da casa. A silhueta com alfa permite profundidade real:
 * a casa flutua como um objeto 3D sobre o layout, sem retângulo/card.
 *
 * Camadas (z): glow de marca · spotlight · sombra de contato ·
 * casa (cutout) · bloom do cabo (mix-blend screen) · glow do inversor.
 * Parallax por camada (a casa move mais que o glow → sensação 3D).
 */
export function AboutVisual() {
  const [tf, setTf] = useState({ x: 0, y: 0, hover: false });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(pointer: fine)").matches
    )
      return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTf((s) => ({ ...s, x: px * 18, y: py * 14 })); // máx ±9 / ±7px
  }, []);

  const onEnter = useCallback(() => setTf((s) => ({ ...s, hover: true })), []);
  const onLeave = useCallback(() => setTf({ x: 0, y: 0, hover: false }), []);

  const { x, y, hover } = tf;
  const lift = hover ? -10 : 0;

  return (
    <div
      className="group relative z-0 mb-6 lg:-mr-[4vw] xl:-mr-[7vw]"
      style={{ perspective: 1800 }}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Glow dinâmico da marca — parallax inverso (fica "atrás") */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -bottom-10 -top-24 -z-10 blur-3xl transition-opacity duration-500 ease-out"
        style={{
          opacity: hover ? 1 : 0.6,
          transform: `translate3d(${x * -0.25}px, ${y * -0.25}px, 0)`,
          background:
            "radial-gradient(34% 40% at 44% 30%, rgba(0,212,255,0.5), transparent 70%), radial-gradient(38% 42% at 56% 52%, rgba(16,185,129,0.42), transparent 72%), radial-gradient(40% 44% at 70% 76%, rgba(255,193,7,0.3), transparent 70%)",
        }}
      />

      {/* Spotlight suave para separar a casa do fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 52% 46%, rgba(255,255,255,0.06), transparent 70%)",
        }}
      />

      {/* Sombra de contato (chão) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 bottom-2 -z-10 h-14 rounded-[50%] bg-black/80 blur-2xl transition-all duration-500 ease-out"
        style={{
          opacity: hover ? 0.9 : 0.72,
          transform: `translateX(${x * 0.5}px) scaleX(${hover ? 1.04 : 1})`,
        }}
      />

      {/* Palco da casa — parallax + lift (origem na base para flutuar) */}
      <div
        className="pointer-events-none relative"
        style={{
          transformOrigin: "50% 100%",
          transform: `translate3d(${x}px, ${y + lift}px, 0) scale(1.18)`,
          transition: "transform .3s ease",
          willChange: "transform",
        }}
      >
        {/* Casa (cutout) — sombra volumétrica cinematográfica */}
        <Image
          src={SRC}
          alt="Casa moderna com painéis solares, inversor e cabo de energia luminoso — tecnologia Alto Solar"
          width={W}
          height={H}
          sizes="(max-width:1024px) 120vw, 60vw"
          priority={false}
          className="relative z-20 h-auto w-full max-w-none select-none"
          style={{
            filter:
              "drop-shadow(0 44px 60px rgba(0,0,0,0.6)) drop-shadow(0 14px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 60px rgba(0,255,170,0.16))",
          }}
        />

        {/* Bloom do cabo neon — screen + blur faz a luz "emitir" de verdade */}
        <Image
          src={SRC}
          alt=""
          aria-hidden
          width={W}
          height={H}
          sizes="(max-width:1024px) 120vw, 60vw"
          className="absolute inset-0 z-30 h-auto w-full max-w-none select-none"
          style={{
            filter: "blur(16px) saturate(1.7) brightness(1.1)",
            mixBlendMode: "screen",
            opacity: hover ? 0.92 : 0.6,
            transition: "opacity .4s ease",
          }}
        />

        {/* Glow localizado atrás do inversor */}
        <div
          aria-hidden
          className="absolute z-10"
          style={{
            left: "52%",
            top: "44%",
            width: "34%",
            height: "40%",
            background:
              "radial-gradient(circle, rgba(0,255,180,0.32), transparent 68%)",
            filter: "blur(14px)",
            mixBlendMode: "screen",
            opacity: hover ? 1 : 0.75,
            transition: "opacity .4s ease",
          }}
        />
      </div>
    </div>
  );
}
