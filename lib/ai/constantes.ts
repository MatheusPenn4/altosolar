/**
 * Colunas de ai_provider_configs seguras para devolver à UI — nunca inclui
 * `credencial_criptografada`. Compartilhado entre a página de diagnóstico e
 * o teste que trava essa garantia (lib/ai/__tests__/constantes.test.ts).
 *
 * Precisa ser uma string literal (não montada via array.join em runtime) —
 * é assim que o supabase-js consegue tipar o retorno de `.select(...)`.
 */
export const COLUNAS_CONFIG_SEM_CREDENCIAL =
  "id, nome, provider, modelo, credencial_preview, ativo, prioridade, status, cooldown_ate, quota_reset_em, quota_reset_confiavel, ultima_utilizacao_em, ultimo_sucesso_em, ultimo_erro_em, ultimo_erro_categoria, ultimo_erro_codigo, ultimo_erro_mensagem" as const;
