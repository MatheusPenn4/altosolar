import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_RESPONSE_SCHEMA,
  orcamentoExtraidoSchema,
  VERSAO_SCHEMA_EXTRACAO,
  type OrcamentoExtraido,
} from "./schema";
import { PROMPT_EXTRACAO_ORCAMENTO, VERSAO_PROMPT_EXTRACAO } from "./prompt";

export interface ResultadoExtracao {
  sucesso: boolean;
  orcamento: OrcamentoExtraido | null;
  erro: string | null;
  modelo: string;
  duracaoMs: number;
  versaoPrompt: string;
  versaoSchema: string;
  respostaBruta: string | null;
}

/**
 * Chama o Gemini para extrair os dados estruturados de um PDF de orçamento.
 * A chave da API só existe no servidor (GEMINI_API_KEY) — esta função nunca deve
 * ser importada em código de cliente.
 */
export async function extrairOrcamentoDoPdf(
  pdfBuffer: Buffer,
  opcoes?: { maxTentativas?: number }
): Promise<ResultadoExtracao> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_MODEL;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor.");
  }
  if (!modelo) {
    throw new Error("GEMINI_MODEL não configurada no servidor.");
  }

  const client = new GoogleGenAI({ apiKey });
  const maxTentativas = opcoes?.maxTentativas ?? 2;
  const inicio = Date.now();

  let ultimoErro: string | null = null;
  let ultimaRespostaBruta: string | null = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const response = await client.models.generateContent({
        model: modelo,
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT_EXTRACAO_ORCAMENTO },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0,
        },
      });

      const texto = response.text ?? "";
      ultimaRespostaBruta = texto;

      const json = JSON.parse(texto);
      const validado = orcamentoExtraidoSchema.safeParse(json);

      if (!validado.success) {
        ultimoErro = `Resposta do Gemini não passou na validação do schema: ${validado.error.message}`;
        continue;
      }

      return {
        sucesso: true,
        orcamento: validado.data,
        erro: null,
        modelo,
        duracaoMs: Date.now() - inicio,
        versaoPrompt: VERSAO_PROMPT_EXTRACAO,
        versaoSchema: VERSAO_SCHEMA_EXTRACAO,
        respostaBruta: texto,
      };
    } catch (erro) {
      ultimoErro = erro instanceof Error ? erro.message : "Erro desconhecido na chamada ao Gemini.";
    }
  }

  return {
    sucesso: false,
    orcamento: null,
    erro: ultimoErro ?? "Falha ao extrair dados do orçamento.",
    modelo,
    duracaoMs: Date.now() - inicio,
    versaoPrompt: VERSAO_PROMPT_EXTRACAO,
    versaoSchema: VERSAO_SCHEMA_EXTRACAO,
    respostaBruta: ultimaRespostaBruta,
  };
}
