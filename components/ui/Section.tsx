import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24 py-24 sm:py-28 lg:py-32", className)}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mx-auto mb-14 max-w-2xl sm:mb-16",
        center && "text-center",
        className,
      )}
    >
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="h-section mt-5 text-white">{title}</h2>
      {subtitle && <p className="lead mt-4">{subtitle}</p>}
    </Reveal>
  );
}

/** Decorative gradient glow blob for premium ambiance */
export function GlowOrb({
  className,
  color = "blue",
}: {
  className?: string;
  color?: "blue" | "amber";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 rounded-full blur-[120px]",
        color === "blue" ? "bg-brand-blue/20" : "bg-brand-amber/20",
        className,
      )}
    />
  );
}
