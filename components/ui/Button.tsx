import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type Variant = "primary" | "amber" | "ghost" | "outline";
type Size = "md" | "lg" | "xl";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-300 ease-out will-change-transform active:scale-[0.98] disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-grad-blue text-ink-950 shadow-glow hover:shadow-[0_0_55px_-8px_rgba(0,175,255,0.7)] hover:-translate-y-0.5",
  amber:
    "bg-grad-amber text-ink-950 shadow-glow-amber hover:shadow-[0_0_55px_-8px_rgba(255,165,0,0.75)] hover:-translate-y-0.5",
  outline:
    "border border-hair bg-white/[0.02] text-white hover:bg-white/[0.06] hover:border-white/20",
  ghost: "text-white/80 hover:text-white hover:bg-white/[0.05]",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
  xl: "px-9 py-5 text-lg",
};

type TrackType = "whatsapp" | "call";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  withArrow?: boolean;
  external?: boolean;
  /** A1 — tracking automático via delegação (data-track) */
  track?: TrackType;
  trackSource?: string;
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
  withArrow = true,
  external,
  track,
  trackSource,
}: Props) {
  const cls = cn(base, variants[variant], sizes[size], className);
  const trackAttrs = track
    ? { "data-track": track, "data-track-source": trackSource }
    : {};
  const content = (
    <>
      {children}
      {withArrow && (
        <ArrowRight className="h-[1.1em] w-[1.1em] transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </>
  );

  if (external || href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        {...trackAttrs}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...trackAttrs}>
      {content}
    </Link>
  );
}
