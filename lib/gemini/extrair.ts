import {
  GEMINI_RESPONSE_SCHEMA,
  orcamentoExtraidoSchema,
  VERSAO_SCHEMA_EXTRACAO,
  type OrcamentoExtraido,
} from "./schema";
import { PROMPT_EXTRACAO_ORCAMENTO, VERSAO_PROMPT_EXTRACAO } from "./prompt";
import { executarExtracaoGemini } from "./executarExtracao";

export interface ResultadoExtracao {
  sucesso: boolean;
  orcamento: OrcamentoExtraido | null;
  erro: string | null;
  modelo: string;
  duracaoMs: number;
  versaoPrompt: string;
  versaoSchema: string;
}

/**
 * Chama o Gemini para extrair os dados estruturados de um PDF de orçamento.
 * A chave da API só existe no servidor — esta função nunca deve ser importada
 * em código de cliente.
 */
export async function extrairOrcamentoDoPdf(pdfBuffer: Buffer): Promise<ResultadoExtracao> {
  const resultado = await executarExtracaoGemini({
    pdfBuffer,
    prompt: PROMPT_EXTRACAO_ORCAMENTO,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    zodSchema: orcamentoExtraidoSchema,
  });

  return {
    sucesso: resultado.sucesso,
    orcamento: resultado.dados,
    erro: resultado.erro,
    modelo: resultado.modelo,
    duracaoMs: resultado.duracaoMs,
    versaoPrompt: VERSAO_PROMPT_EXTRACAO,
    versaoSchema: VERSAO_SCHEMA_EXTRACAO,
  };
}
