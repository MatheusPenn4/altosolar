"use client";

import {
  Building2,
  MapPin,
  FileBadge,
  FileCheck,
  Plug,
  Users,
  BadgeCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { TRUST_ITEMS } from "@/lib/constants";
import { Section, SectionHeader, GlowOrb } from "@/components/ui/Section";
import { StaggerGroup, StaggerItem } from "@/components/ui/Reveal";

const icons: Record<string, LucideIcon> = {
  Building2,
  MapPin,
  FileBadge,
  FileCheck,
  Plug,
  Users,
  BadgeCheck,
  ShieldCheck,
};

export function Trust() {
  return (
    <Section id="confianca" className="overflow-hidden bg-ink-900/40">
      <GlowOrb className="right-0 top-0 h-[400px] w-[500px]" />
      <div className="container">
        <SectionHeader
          eyebrow="Empresa de Verdade"
          title="Por Que a Alto Solar é Confiável?"
          subtitle="Transparência total: empresa registrada, equipe própria e projetos homologados. Você sabe exatamente com quem está investindo."
        />

        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => {
            const Icon = icons[item.icon] ?? ShieldCheck;
            return (
              <StaggerItem key={item.label}>
                <div className="flex h-full flex-col rounded-2xl border border-hair bg-white/[0.02] p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-hair bg-grad-blue/[0.08] text-brand-cyan">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted">
                    {item.label}
                  </div>
                  <div className="mt-1.5 text-sm font-medium leading-relaxed text-white">
                    {item.value}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </Section>
  );
}
