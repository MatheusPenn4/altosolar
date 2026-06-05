import { Star } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Selo de avaliação do Google — preparado para link real do perfil.
 * Atualize COMPANY.social.googleReviews e COMPANY.rating com dados reais.
 */
export function GoogleRating({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={COMPANY.social.googleReviews}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full border border-hair bg-white/[0.03] px-4 py-2 transition-colors hover:bg-white/[0.06]",
        className,
      )}
      aria-label={`Avaliação ${COMPANY.rating.value} estrelas no Google`}
    >
      <span className="font-display text-sm font-bold text-white">
        {COMPANY.rating.value}
      </span>
      <span className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-brand-gold text-brand-gold" />
        ))}
      </span>
      {!compact && (
        <span className="text-xs text-muted">
          no Google · +{COMPANY.rating.count} avaliações
        </span>
      )}
    </a>
  );
}
