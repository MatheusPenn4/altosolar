"use client";

import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import { STATS } from "@/lib/constants";
import { StaggerGroup, StaggerItem } from "@/components/ui/Reveal";

export function Stats() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section className="relative border-y border-hair bg-ink-900/40 py-20">
      <div ref={ref} className="container">
        <StaggerGroup className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <StaggerItem key={s.label} className="text-center">
              <div className="tabular font-display text-4xl font-bold tracking-tight text-grad-blue sm:text-5xl">
                {s.prefix}
                {inView ? (
                  <CountUp end={s.value} duration={2.2} separator="." />
                ) : (
                  0
                )}
                {s.suffix}
              </div>
              <div className="mt-3 text-sm text-muted">{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
