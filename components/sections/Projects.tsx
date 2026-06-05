"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BLUR_DATA_URL } from "@/lib/utils";
import { MapPin, Zap, TrendingDown, Calendar, ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { trackProjectClick } from "@/lib/analytics";
import { Section, SectionHeader } from "@/components/ui/Section";

const CATEGORIES = ["Todos", "Residencial", "Comercial", "Rural"] as const;

export function Projects() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const list =
    cat === "Todos" ? PROJECTS : PROJECTS.filter((p) => p.category === cat);

  return (
    <Section id="projetos">
      <div className="container">
        <SectionHeader
          eyebrow="Projetos Reais"
          title="Instalações que Falam por Si"
          subtitle="Resultados reais em residências, empresas e propriedades rurais por todo Mato Grosso."
        />

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-all ${
                cat === c
                  ? "border-transparent bg-grad-blue text-ink-950 shadow-glow"
                  : "border-hair text-white/70 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <motion.a
                key={p.title}
                href={WA.projeto(p.category, p.city)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackProjectClick(p.title, p.city)}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35 }}
                className="group relative block overflow-hidden rounded-2xl border border-hair"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={p.image}
                    alt={`Energia solar instalada — projeto ${p.category} em ${p.city}`}
                    fill
                    sizes="(max-width:768px) 100vw, 33vw"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full border border-hair bg-ink-950/70 px-3 py-1 text-xs font-medium text-brand-cyan backdrop-blur">
                    {p.category}
                  </span>
                  <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {p.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-cyan" /> {p.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-brand-gold" /> {p.power}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-brand-cyan" />{" "}
                      {p.economy} de economia
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-brand-gold" />{" "}
                      {p.year}
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </Section>
  );
}
