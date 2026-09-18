import { GoogleGenAI } from "@google/genai";
import { classificarErro } from "../erros";
import { MENSAGENS_TESTE_CONEXAO } from "../erros";
import type { AdaptadorProvedor, OpcoesGerarJSON, OpcoesTestarConexao } from "./tipos";
import type { ResultadoTesteConexao } from "../tipos";

/**
 * Adaptador do Google Gemini. A chamada real ao SDK (`@google/genai`) que
 * antes morava em lib/gemini/executarExtracao.ts vive aqui agora — o resto
 * da camada de IA (lib/ai/gerenciador.ts) não sabe nada sobre o SDK do
 * Google, só fala com esta interface.
 */
export const adaptadorGemini: AdaptadorProvedor = {
  provider: "google_gemini",

  async gerarJSON(opcoes: OpcoesGerarJSON): Promise<{ texto: string }> {
    const client = new GoogleGenAI({ apiKey: opcoes.apiKey });

    const response = await client.models.generateContent({
      model: opcoes.modelo,
      contents: [
        {
          role: "user",
          parts: [
            { text: opcoes.prompt },
            { inlineData: { mimeType: opcoes.mimeType, data: opcoes.pdfBuffer.toString("base64") } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: opcoes.responseSchema,
        temperature: 0,
        // Timeout real por chamada — antes só existia o maxDuration da rota
        // Vercel como teto, então uma chamada lenta podia estourar a função
        // inteira sem o código nunca ter chance de devolver a mensagem amigável.
        abortSignal: AbortSignal.timeout(opcoes.timeoutMs),
      },
    });

    return { texto: response.text ?? "" };
  },

  async testarConexao(opcoes: OpcoesTestarConexao): Promise<ResultadoTesteConexao> {
    const client = new GoogleGenAI({ apiKey: opcoes.apiKey });

    try {
      // `models.get` só busca metadados do modelo — confirma chave válida e
      // modelo existente sem gastar cota de geração, ao contrário de uma
      // chamada de generateContent completa.
      await client.models.get({
        model: opcoes.modelo,
        config: { abortSignal: AbortSignal.timeout(opcoes.timeoutMs) },
      });
      return { ok: true, mensagem: "Conexão funcionando.", categoria: null };
    } catch (erro) {
      const classificado = classificarErro(erro);
      return {
        ok: false,
        mensagem: MENSAGENS_TESTE_CONEXAO[classificado.categoria],
        categoria: classificado.categoria,
      };
    }
  },
};

/**
 * Lista os modelos disponíveis para a chave informada — usado só para
 * sugerir modelos na UI (nunca uma lista fixa adivinhada). Best-effort: se o
 * SDK/permissão não permitir listar, devolve lista vazia em vez de falhar a
 * tela inteira.
 */
export async function listarModelosGemini(apiKey: string): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey });
  const nomes: string[] = [];

  try {
    const pagina = await client.models.list({ config: { abortSignal: AbortSignal.timeout(8000) } });
    for await (const modelo of pagina) {
      if (modelo.name) nomes.push(modelo.name.replace(/^models\//, ""));
    }
  } catch {
    return [];
  }

  return nomes;
}
