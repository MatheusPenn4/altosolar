import type { SupabaseClient } from "@supabase/supabase-js";
import type { ErroClassificado, StatusProvedor } from "./tipos";

const COOLDOWN_QUOTA_PADRAO_MIN = 60;

function statusPorCategoria(categoria: ErroClassificado["categoria"]): StatusProvedor {
  switch (categoria) {
    case "credencial":
      return "credencial_invalida";
    case "quota":
      return "limite_atingido";
    case "transitorio":
      return "indisponivel";
    default:
      // entrada_invalida/parsing são problemas do documento/da resposta, não
      // do provider em si — não faz sentido marcar a config como indisponível.
      return "disponivel";
  }
}

/**
 * Atualiza o status/cooldown de uma configuração após uma tentativa. As
 * contagens de "sucessos/erros recentes" exibidas na UI não são mantidas
 * aqui como contador incremental (evitaria condição de corrida sob
 * concorrência) — são calculadas sob demanda a partir de `ai_events`.
 */
export async function marcarSucesso(supabase: SupabaseClient, configId: string | null): Promise<void> {
  if (!configId) return; // config sintética (env legado) não é persistida

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("ai_provider_configs")
    .update({
      status: "disponivel",
      cooldown_ate: null,
      quota_reset_em: null,
      quota_reset_confiavel: false,
      ultima_utilizacao_em: agora,
      ultimo_sucesso_em: agora,
    })
    .eq("id", configId);

  if (error) console.error("[ai] falha ao atualizar saúde (sucesso):", error.message);
}

export async function marcarErro(
  supabase: SupabaseClient,
  configId: string | null,
  erro: ErroClassificado,
  opts?: { cooldownMinutos?: number; quotaResetEm?: string | null; quotaResetConfiavel?: boolean }
): Promise<void> {
  if (!configId) return;

  const agora = new Date();
  const status = statusPorCategoria(erro.categoria);
  const cooldownMinutos = opts?.cooldownMinutos ?? (erro.categoria === "quota" ? COOLDOWN_QUOTA_PADRAO_MIN : undefined);
  const cooldownAte =
    status !== "disponivel" && cooldownMinutos
      ? new Date(agora.getTime() + cooldownMinutos * 60_000).toISOString()
      : null;

  const { error } = await supabase
    .from("ai_provider_configs")
    .update({
      status,
      cooldown_ate: cooldownAte,
      quota_reset_em: opts?.quotaResetEm ?? null,
      quota_reset_confiavel: opts?.quotaResetConfiavel ?? false,
      ultima_utilizacao_em: agora.toISOString(),
      ultimo_erro_em: agora.toISOString(),
      ultimo_erro_categoria: erro.categoria,
      ultimo_erro_codigo: erro.codigoHttp != null ? String(erro.codigoHttp) : null,
      ultimo_erro_mensagem: erro.mensagem,
    })
    .eq("id", configId);

  if (error) console.error("[ai] falha ao atualizar saúde (erro):", error.message);
}
