import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoriaErroIA, OperacaoIA } from "./tipos";

export interface NovoEventoIA {
  providerConfigId: string | null;
  provider: string;
  modelo: string | null;
  operacao: OperacaoIA;
  resultado: "sucesso" | "erro";
  categoriaErro?: CategoriaErroIA | null;
  codigoHttp?: number | null;
  /** Já deve vir sanitizada (ver lib/ai/erros.ts) — esta função não sanitiza de novo. */
  mensagem?: string | null;
  duracaoMs: number;
  tentativa?: number;
  fallbackDeConfigId?: string | null;
  userId: string | null;
}

/**
 * Registra um evento de execução de IA — nunca recebe nem grava a credencial
 * ou o conteúdo do documento analisado, só metadados de diagnóstico.
 */
export async function registrarEvento(supabase: SupabaseClient, evento: NovoEventoIA): Promise<void> {
  const { error } = await supabase.from("ai_events").insert({
    provider_config_id: evento.providerConfigId,
    provider: evento.provider,
    modelo: evento.modelo,
    operacao: evento.operacao,
    resultado: evento.resultado,
    categoria_erro: evento.categoriaErro ?? null,
    codigo_http: evento.codigoHttp ?? null,
    mensagem: evento.mensagem ?? null,
    duracao_ms: evento.duracaoMs,
    tentativa: evento.tentativa ?? null,
    fallback_de_config_id: evento.fallbackDeConfigId ?? null,
    user_id: evento.userId,
  });

  // Falha ao gravar o evento não deve derrubar a análise em si — mas não
  // silenciamos por completo: fica um rastro no log da função serverless
  // (nunca a credencial nem o documento, só o motivo da falha do insert).
  if (error) {
    console.error("[ai] falha ao registrar evento de IA:", error.message);
  }
}
