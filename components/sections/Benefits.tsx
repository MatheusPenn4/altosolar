"use client";

import {
  Zap,
  ShieldCheck,
  TrendingUp,
  Leaf,
  PiggyBank,
  BadgeCheck,
  MonitorSmartphone,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { BENEFITS } from "@/lib/constants";
import { Section, SectionHeader } from "@/components/ui/Section";
import { StaggerGroup, StaggerItem } from "@/components/ui/Reveal";

const icons: Record<string, LucideIcon> = {
  Zap,
  ShieldCheck,
  TrendingUp,
  Leaf,
  PiggyBank,
  BadgeCheck,
  MonitorSmartphone,
  Landmark,
};

export function Benefits() {
  return (
    <Section id="beneficios">
      <div className="container">
        <SectionHeader
          eyebrow="Vantagens"
          title="Muito Mais que Economia na Conta"
          subtitle="Energia solar é o investimento mais inteligente para sua casa, empresa ou propriedade rural."
        />

        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => {
            const Icon = icons[b.icon];
            return (
              <StaggerItem key={b.title}>
                <div className="group h-full rounded-2xl border border-hair bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-blue/30 hover:bg-white/[0.04] hover:shadow-[0_24px_60px_-32px_rgba(0,175,255,0.45)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-hair bg-grad-blue/[0.08] text-brand-cyan transition-colors group-hover:bg-grad-blue group-hover:text-ink-950">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {b.desc}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </Section>
  );
}
