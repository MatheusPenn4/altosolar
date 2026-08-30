import { GEMINI_RESPONSE_SCHEMA_FATURA, faturaExtraidaSchema, VERSAO_SCHEMA_FATURA, type FaturaExtraida } from "./schema";
import { PROMPT_EXTRACAO_FATURA, VERSAO_PROMPT_FATURA } from "./prompt";
import { executarExtracaoGemini } from "../executarExtracao";

export interface ResultadoExtracaoFatura {
  sucesso: boolean;
  fatura: FaturaExtraida | null;
  erro: string | null;
  modelo: string;
  duracaoMs: number;
  versaoPrompt: string;
  versaoSchema: string;
}

/**
 * Chama o Gemini para extrair os dados estruturados de uma fatura de energia em PDF.
 * A chave da API só existe no servidor — esta função nunca deve ser importada em
 * código de cliente.
 */
export async function extrairFaturaDoPdf(pdfBuffer: Buffer): Promise<ResultadoExtracaoFatura> {
  const resultado = await executarExtracaoGemini({
    pdfBuffer,
    prompt: PROMPT_EXTRACAO_FATURA,
    responseSchema: GEMINI_RESPONSE_SCHEMA_FATURA,
    zodSchema: faturaExtraidaSchema,
  });

  return {
    sucesso: resultado.sucesso,
    fatura: resultado.dados,
    erro: resultado.erro,
    modelo: resultado.modelo,
    duracaoMs: resultado.duracaoMs,
    versaoPrompt: VERSAO_PROMPT_FATURA,
    versaoSchema: VERSAO_SCHEMA_FATURA,
  };
}
