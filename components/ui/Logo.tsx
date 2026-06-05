import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo oficial Alto Solar (public/logo.png, fundo transparente).
 * O asset já contém o emblema + wordmark.
 */
export function Logo({
  className,
  height = 44,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  // proporção original 351x341
  const width = Math.round((height * 351) / 341);
  return (
    <Image
      src="/logo.png"
      alt="Alto Solar — Energia Solar em Cuiabá e Mato Grosso"
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto select-none", className)}
      style={{ height, width: "auto" }}
    />
  );
}
