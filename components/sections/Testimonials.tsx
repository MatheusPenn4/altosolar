"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  MessageCircle,
} from "lucide-react";
import { TESTIMONIALS, type Testimonial } from "@/lib/constants";
import { trackTestimonialClick } from "@/lib/analytics";
import { Section, SectionHeader } from "@/components/ui/Section";

function SourceBadge({ source }: { source: Testimonial["source"] }) {
  const map = {
    Google: { label: "Avaliação Google", cls: "text-brand-cyan" },
    WhatsApp: { label: "Cliente WhatsApp", cls: "text-[#25D366]" },
    Vídeo: { label: "Depoimento em vídeo", cls: "text-brand-gold" },
  } as const;
  const Icon = source === "Vídeo" ? Play : source === "WhatsApp" ? MessageCircle : Star;
  const { label, cls } = map[source];
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })],
  );
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <Section id="depoimentos">
      <div className="container">
        <SectionHeader
          eyebrow="Depoimentos"
          title="Quem Investe, Recomenda"
          subtitle="A confiança de centenas de clientes em todo o Mato Grosso."
        />

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 flex-[0_0_100%] px-2 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <figure
                    onClick={() => trackTestimonialClick(t.name)}
                    className="flex h-full flex-col rounded-2xl border border-hair bg-white/[0.02] p-7"
                  >
                    <div className="flex items-center justify-between">
                      <Quote className="h-8 w-8 text-brand-blue/40" />
                      <SourceBadge source={t.source} />
                    </div>
                    <div className="mt-4 flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-brand-gold text-brand-gold"
                        />
                      ))}
                    </div>

                    {/* Suporte a vídeo-depoimento */}
                    {t.videoUrl && (
                      <a
                        href={t.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group mt-4 flex items-center gap-2 text-sm font-medium text-brand-gold"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grad-amber text-ink-950">
                          <Play className="h-4 w-4" />
                        </span>
                        Assistir depoimento
                      </a>
                    )}

                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/85">
                      “{t.text}”
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 border-t border-hair pt-5">
                      {t.photo ? (
                        <Image
                          src={t.photo}
                          alt={t.name}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-grad-blue font-display font-bold text-ink-950">
                          {t.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {t.name}
                        </div>
                        <div className="text-xs text-muted">{t.city}</div>
                      </div>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-hair text-white transition-colors hover:bg-white/[0.06]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Ir para depoimento ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    selected === i
                      ? "w-6 bg-brand-cyan"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próximo"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-hair text-white transition-colors hover:bg-white/[0.06]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}
