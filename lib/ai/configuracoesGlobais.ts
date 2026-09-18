import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConfiguracoesGlobaisIA {
  fallbackAutomatico: boolean;
  maxTentativasPorProvider: number;
  maxFallbacks: number;
  timeoutMs: number;
}

const PADRAO: ConfiguracoesGlobaisIA = {
  fallbackAutomatico: true,
  maxTentativasPorProvider: 2,
  maxFallbacks: 3,
  timeoutMs: 45_000,
};

export async function obterConfiguracoesGlobaisIA(supabase: SupabaseClient): Promise<ConfiguracoesGlobaisIA> {
  const { data } = await supabase
    .from("app_settings")
    .select("ai_fallback_automatico, ai_max_tentativas_por_provider, ai_max_fallbacks, ai_timeout_ms")
    .eq("id", true)
    .maybeSingle();

  if (!data) return PADRAO;

  return {
    fallbackAutomatico: data.ai_fallback_automatico ?? PADRAO.fallbackAutomatico,
    maxTentativasPorProvider: data.ai_max_tentativas_por_provider ?? PADRAO.maxTentativasPorProvider,
    maxFallbacks: data.ai_max_fallbacks ?? PADRAO.maxFallbacks,
    timeoutMs: data.ai_timeout_ms ?? PADRAO.timeoutMs,
  };
}
