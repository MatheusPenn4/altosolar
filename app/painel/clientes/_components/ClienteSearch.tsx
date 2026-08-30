"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/app/painel/_components/ui/Field";

export function ClienteSearch({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const [termo, setTermo] = useState(valorInicial);

  function buscar(valor: string) {
    setTermo(valor);
    const params = new URLSearchParams();
    if (valor.trim()) params.set("q", valor.trim());
    router.push(`/painel/clientes${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={termo}
        onChange={(e) => buscar(e.target.value)}
        placeholder="Buscar por nome ou CPF/CNPJ..."
        className="pl-9"
      />
    </div>
  );
}
