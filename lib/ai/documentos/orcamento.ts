import type { SupabaseClient } from "@supabase/supabase-js";
import { GEMINI_RESPONSE_SCHEMA, orcamentoExtraidoSchema, VERSAO_SCHEMA_EXTRACAO, type OrcamentoExtraido } from "@/lib/gemini/schema";
import { PROMPT_EXTRACAO_ORCAMENTO, VERSAO_PROMPT_EXTRACAO } from "@/lib/gemini/prompt";
import { listarConfiguracoesDisponiveis } from "../credenciais";
import { obterConfiguracoesGlobaisIA } from "../configuracoesGlobais";
import { analisarDocumento } from "../gerenciador";
import { adaptadorGemini } from "../provedores/gemini";
import { registrarEvento } from "../eventos";
import { marcarSucesso, marcarErro } from "../saude";
import type { AdaptadorProvedor } from "../provedores/tipos";
import type { ProviderIA } from "../tipos";

const ADAPTADORES: Record<ProviderIA, AdaptadorProvedor> = {
  google_gemini: adaptadorGemini,
};

// Margem de segurança sob o `maxDuration = 60` declarado em
// app/api/orcamentos/analisar/route.ts — sem isso, a soma de tentativas e
// fallbacks podia estourar o teto da função Vercel antes do código ter
// chance de devolver a mensagem amigável (era um dos problemas identificados
// na auditoria: timeout duro em vez de erro tratado).
const MARGEM_SEGURANCA_ROTA_MS = 50_000;

export interface ResultadoExtracao {
  sucesso: boolean;
  orcamento: OrcamentoExtraido | null;
  erro: string | null;
  modelo: string | null;
  duracaoMs: number;
  versaoPrompt: string;
  versaoSchema: string;
}

/**
 * Extrai os dados estruturados de um PDF de orçamento de fábrica, passando
 * pelo AI Manager (seleção de configuração, retry e fallback entre
 * providers). Substitui a antiga lib/gemini/extrair.ts — mesma assinatura de
 * retorno, para não exigir mudanças no resto da rota que consome isto.
 */
export async function analisarOrcamentoPdf(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  userId: string | null
): Promise<ResultadoExtracao> {
  const [configuracoesDisponiveis, globais] = await Promise.all([
    listarConfiguracoesDisponiveis(supabase),
    obterConfiguracoesGlobaisIA(supabase),
  ]);

  const configuracoes = globais.fallbackAutomatico
    ? configuracoesDisponiveis
    : configuracoesDisponiveis.slice(0, 1);

  const resultado = await analisarDocumento({
    configuracoes,
    obterAdaptador: (provider) => ADAPTADORES[provider],
    prompt: PROMPT_EXTRACAO_ORCAMENTO,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    zodSchema: orcamentoExtraidoSchema,
    pdfBuffer,
    maxTentativasPorProvider: globais.maxTentativasPorProvider,
    maxFallbacks: globais.maxFallbacks,
    timeoutMs: globais.timeoutMs,
    prazoFinalMs: Date.now() + MARGEM_SEGURANCA_ROTA_MS,
    aoTentar: async (registro) => {
      await registrarEvento(supabase, {
        providerConfigId: registro.config.id,
        provider: registro.config.provider,
        modelo: registro.config.modelo,
        operacao: "analisar_orcamento",
        resultado: registro.resultado,
        categoriaErro: registro.erro?.categoria ?? null,
        codigoHttp: registro.erro?.codigoHttp ?? null,
        mensagem: registro.erro?.mensagem ?? null,
        duracaoMs: registro.duracaoMs,
        tentativa: registro.tentativa,
        fallbackDeConfigId: registro.ehFallback ? registro.config.id : null,
        userId,
      });

      if (registro.resultado === "sucesso") {
        await marcarSucesso(supabase, registro.config.id);
      } else if (registro.erro) {
        await marcarErro(supabase, registro.config.id, registro.erro);
      }
    },
  });

  return {
    sucesso: resultado.sucesso,
    orcamento: resultado.dados,
    erro: resultado.erroUsuario,
    modelo: resultado.modelo,
    duracaoMs: resultado.duracaoMs,
    versaoPrompt: VERSAO_PROMPT_EXTRACAO,
    versaoSchema: VERSAO_SCHEMA_EXTRACAO,
  };
}
