import Link from "next/link";
import { cn } from "@/lib/utils";

const ITENS = [
  { chave: "geral" as const, href: "/painel/configuracoes", label: "Geral" },
  { chave: "ia" as const, href: "/painel/configuracoes/inteligencia-artificial", label: "Inteligência Artificial" },
];

/** Mesmo padrão visual dos pills de filtro usados em app/painel/propostas/page.tsx. */
export function SubNavConfiguracoes({ ativo }: { ativo: "geral" | "ia" }) {
  return (
    <nav className="flex gap-2">
      {ITENS.map((item) => (
        <Link
          key={item.chave}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            item.chave === ativo ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
