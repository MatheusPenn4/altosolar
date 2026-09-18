"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/app/painel/_components/ui/Card";

const OPERACAO_LABEL: Record<string, string> = {
  analisar_orcamento: "Análise de orçamento",
  analisar_fatura: "Análise de fatura",
  testar_conexao: "Teste de conexão",
};

export interface EventoIA {
  id: string;
  provider: string;
  modelo: string | null;
  operacao: string;
  resultado: "sucesso" | "erro";
  categoria_erro: string | null;
  mensagem: string | null;
  created_at: string;
  ai_provider_configs: { nome: string } | { nome: string }[] | null;
}

function nomeDaConfig(evento: EventoIA): string {
  const rel = evento.ai_provider_configs;
  if (!rel) return "Gemini (variável de ambiente)";
  return Array.isArray(rel) ? rel[0]?.nome ?? "—" : rel.nome;
}

function Horario({ iso }: { iso: string }) {
  const [texto, setTexto] = useState("--:--");
  useEffect(() => {
    setTexto(new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }, [iso]);
  return <span className="tabular-nums">{texto}</span>;
}

export function EventosRecentes({ eventos }: { eventos: EventoIA[] }) {
  if (eventos.length === 0) {
    return <EmptyState title="Nenhum evento ainda" description="As próximas análises e testes de conexão aparecem aqui." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {eventos.map((evento) => (
        <li key={evento.id} className="flex items-start gap-2 text-sm">
          <Horario iso={evento.created_at} />
          {evento.resultado === "sucesso" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          )}
          <span className="font-medium text-slate-700">{nomeDaConfig(evento)}</span>
          <span className="text-slate-500">{OPERACAO_LABEL[evento.operacao] ?? evento.operacao}</span>
          {evento.resultado === "erro" && evento.categoria_erro && (
            <span className="text-xs text-slate-400">({evento.categoria_erro})</span>
          )}
        </li>
      ))}
    </ul>
  );
}
