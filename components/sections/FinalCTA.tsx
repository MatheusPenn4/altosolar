"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WA } from "@/lib/whatsapp";

const PERKS = [
  "Simulação gratuita",
  "Sem compromisso",
  "Resposta rápida no WhatsApp",
];

export function FinalCTA() {
  return (
    <section
      id="cta-final"
      className="relative overflow-hidden py-28 sm:py-36"
    >
      {/* Glow background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_50%_0%,rgba(0,175,255,0.16),transparent_55%),radial-gradient(70%_120%_at_50%_100%,rgba(255,165,0,0.14),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="eyebrow mb-6">Comece Hoje</span>
          <h2 className="h-display mt-6 text-white">
            Pare de Enriquecer a Concessionária.
            <br />
            <span className="text-grad-mix">
              Comece a Gerar Sua Própria Energia.
            </span>
          </h2>
          <p className="lead mx-auto mt-6 max-w-xl">
            Receba uma simulação personalizada, sem compromisso, e descubra
            quanto você pode economizar a partir do próximo mês.
          </p>

          <div className="mt-10 flex justify-center">
            <Button
              href={WA.orcamento()}
              variant="amber"
              size="xl"
              external
              track="whatsapp"
              trackSource="cta_final"
              className="text-base sm:text-lg"
            >
              Quero Meu Orçamento Gratuito
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-cyan" strokeWidth={3} />
                {p}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
