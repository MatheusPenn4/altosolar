"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KeyRound, Loader2 } from "lucide-react";
import { Card, Badge } from "@/app/painel/_components/ui/Card";
import { Button } from "@/app/painel/_components/ui/Button";
import { useToast } from "@/app/painel/_components/ui/Toast";
import { ativarDesativarConfiguracaoIAAction, testarConexaoAction } from "../actions";
import { ProviderConfigForm } from "./ProviderConfigForm";
import { TempoRestante } from "./TempoRestante";

export interface ProviderConfigResumo {
  id: string;
  nome: string;
  provider: string;
  modelo: string;
  credencial_preview: string;
  ativo: boolean;
  prioridade: number;
  status: string;
  cooldown_ate: string | null;
  quota_reset_em: string | null;
  quota_reset_confiavel: boolean;
  ultima_utilizacao_em: string | null;
  ultimo_sucesso_em: string | null;
  ultimo_erro_em: string | null;
  ultimo_erro_categoria: string | null;
  ultimo_erro_codigo: string | null;
  ultimo_erro_mensagem: string | null;
}

const PROVIDER_LABEL: Record<string, string> = {
  google_gemini: "Google Gemini",
};

const STATUS_INFO: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  disponivel: { label: "Disponível", tone: "green" },
  limite_atingido: { label: "Limite atingido", tone: "amber" },
  credencial_invalida: { label: "Credencial inválida", tone: "red" },
  indisponivel: { label: "Indisponível", tone: "red" },
  desconhecido: { label: "Ainda não testada", tone: "slate" },
};

function relativo(iso: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}

export function ProviderConfigCard({ config }: { config: ProviderConfigResumo }) {
  const { notificar } = useToast();
  const [editando, setEditando] = useState(false);
  const [testando, iniciarTeste] = useTransition();
  const [alternando, iniciarAlternancia] = useTransition();

  const statusInfo = !config.ativo
    ? { label: "Desativada", tone: "slate" as const }
    : STATUS_INFO[config.status] ?? STATUS_INFO.desconhecido;

  function testar() {
    iniciarTeste(async () => {
      const resultado = await testarConexaoAction(config.id);
      notificar(resultado.sucesso ? "sucesso" : "erro", resultado.mensagem ?? (resultado.sucesso ? "Conexão funcionando." : "Falha ao testar."));
    });
  }

  function alternarAtivo() {
    iniciarAlternancia(async () => {
      const resultado = await ativarDesativarConfiguracaoIAAction(config.id, !config.ativo);
      if (!resultado.sucesso) {
        notificar("erro", resultado.erro || "Não foi possível alterar a integração.");
        return;
      }
      notificar("sucesso", config.ativo ? "Integração desativada." : "Integração ativada.");
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{config.nome}</h3>
            <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {PROVIDER_LABEL[config.provider] ?? config.provider} · Modelo: {config.modelo}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Prioridade: <span className="font-medium text-slate-700">{config.prioridade}</span></span>
            <span>Última utilização: <span className="font-medium text-slate-700">{relativo(config.ultima_utilizacao_em)}</span></span>
            <span>Último sucesso: <span className="font-medium text-slate-700">{relativo(config.ultimo_sucesso_em)}</span></span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <KeyRound className="h-3.5 w-3.5" />
            <span className="font-mono">{config.credencial_preview}</span>
          </div>

          {(config.status === "limite_atingido" || config.cooldown_ate) && (
            <div className="mt-2">
              <TempoRestante iso={config.cooldown_ate ?? config.quota_reset_em} confiavel={config.quota_reset_confiavel} />
            </div>
          )}

          {config.status === "credencial_invalida" && config.ultimo_erro_mensagem && (
            <p className="mt-2 text-xs font-medium text-red-600">{config.ultimo_erro_mensagem}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={testar} loading={testando}>
            Testar conexão
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Button variant={config.ativo ? "ghost" : "secondary"} size="sm" onClick={alternarAtivo} disabled={alternando}>
            {alternando ? <Loader2 className="h-4 w-4 animate-spin" /> : config.ativo ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>

      {editando && <ProviderConfigForm modo="editar" configuracaoExistente={config} onFechar={() => setEditando(false)} />}
    </Card>
  );
}
