import type { SupabaseClient } from "@supabase/supabase-js";
import { GEMINI_RESPONSE_SCHEMA_FATURA, faturaExtraidaSchema, VERSAO_SCHEMA_FATURA, type FaturaExtraida } from "@/lib/gemini/fatura/schema";
import { PROMPT_EXTRACAO_FATURA, VERSAO_PROMPT_FATURA } from "@/lib/gemini/fatura/prompt";
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

// Mesma margem de segurança usada em documentos/orcamento.ts — ver comentário
// lá. Precisa ficar abaixo do `maxDuration = 60` de
// app/api/faturas/analisar/route.ts.
const MARGEM_SEGURANCA_ROTA_MS = 50_000;

export interface ResultadoExtracaoFatura {
  sucesso: boolean;
  fatura: FaturaExtraida | null;
  erro: string | null;
  modelo: string | null;
  duracaoMs: number;
  versaoPrompt: string;
  versaoSchema: string;
}

/**
 * Extrai os dados estruturados de uma fatura de energia em PDF, passando
 * pelo AI Manager. Substitui a antiga lib/gemini/fatura/extrair.ts — mesma
 * assinatura de retorno.
 */
export async function analisarFaturaPdf(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  userId: string | null
): Promise<ResultadoExtracaoFatura> {
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
    prompt: PROMPT_EXTRACAO_FATURA,
    responseSchema: GEMINI_RESPONSE_SCHEMA_FATURA,
    zodSchema: faturaExtraidaSchema,
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
        operacao: "analisar_fatura",
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
    fatura: resultado.dados,
    erro: resultado.erroUsuario,
    modelo: resultado.modelo,
    duracaoMs: resultado.duracaoMs,
    versaoPrompt: VERSAO_PROMPT_FATURA,
    versaoSchema: VERSAO_SCHEMA_FATURA,
  };
}
