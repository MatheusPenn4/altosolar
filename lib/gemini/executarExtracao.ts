import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { obterChavesGemini, pareceEsgotamentoDeCota, pareceErroTransitorio } from "./chaves";

const ATRASO_BASE_MS = 600;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MENSAGEM_SOBRECARGA =
  "O serviço de IA do Google (Gemini) está com alta demanda no momento e não respondeu mesmo após várias tentativas. " +
  "Tente novamente em alguns minutos, ou use o preenchimento manual.";

export interface ResultadoExtracaoGenerica<T> {
  sucesso: boolean;
  dados: T | null;
  erro: string | null;
  modelo: string;
  duracaoMs: number;
}

/**
 * Lógica compartilhada de chamada ao Gemini para extração estruturada de PDFs
 * (orçamentos de fábrica, faturas de energia). Tenta cada chave configurada em
 * `GEMINI_API_KEYS`/`GEMINI_API_KEY` em sequência: se uma chave esgotou a cota
 * diária, passa automaticamente para a próxima, sem falhar a requisição do
 * usuário. Erros que não são de cota (ex.: JSON malformado na resposta) tentam
 * novamente com a MESMA chave antes de desistir dela.
 */
export async function executarExtracaoGemini<T>(opcoes: {
  pdfBuffer: Buffer;
  prompt: string;
  responseSchema: object;
  zodSchema: ZodType<T>;
  maxTentativasPorChave?: number;
}): Promise<ResultadoExtracaoGenerica<T>> {
  const modelo = process.env.GEMINI_MODEL;
  if (!modelo) throw new Error("GEMINI_MODEL não configurada no servidor.");

  const chaves = obterChavesGemini();
  if (chaves.length === 0) {
    throw new Error("Nenhuma chave do Gemini configurada no servidor (GEMINI_API_KEY ou GEMINI_API_KEYS).");
  }

  const maxTentativas = opcoes.maxTentativasPorChave ?? 2;
  const inicio = Date.now();
  let ultimoErro: string | null = null;

  for (const apiKey of chaves) {
    const client = new GoogleGenAI({ apiKey });

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const response = await client.models.generateContent({
          model: modelo,
          contents: [
            {
              role: "user",
              parts: [
                { text: opcoes.prompt },
                { inlineData: { mimeType: "application/pdf", data: opcoes.pdfBuffer.toString("base64") } },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: opcoes.responseSchema,
            temperature: 0,
          },
        });

        const texto = response.text ?? "";
        const json = JSON.parse(texto);
        const validado = opcoes.zodSchema.safeParse(json);

        if (!validado.success) {
          ultimoErro = `Resposta do Gemini não passou na validação do schema: ${validado.error.message}`;
          continue; // JSON malformado costuma ser aleatório — tenta de novo com a mesma chave
        }

        return { sucesso: true, dados: validado.data, erro: null, modelo, duracaoMs: Date.now() - inicio };
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido na chamada ao Gemini.";
        ultimoErro = mensagem;

        if (pareceEsgotamentoDeCota(mensagem)) {
          break; // essa chave esgotou — não adianta tentar de novo, passa para a próxima
        }
        // Sobrecarga/indisponibilidade momentânea (ex.: 503 UNAVAILABLE) costuma
        // se resolver sozinha — vale esperar um pouco antes de tentar de novo,
        // em vez de bater na API imediatamente e falhar do mesmo jeito.
        if (pareceErroTransitorio(mensagem) && tentativa < maxTentativas) {
          await aguardar(ATRASO_BASE_MS * tentativa);
        }
        // outro tipo de erro: mais uma tentativa com a mesma chave antes de desistir dela
      }
    }
  }

  const erroFinal = ultimoErro && pareceErroTransitorio(ultimoErro) ? MENSAGEM_SOBRECARGA : ultimoErro;

  return {
    sucesso: false,
    dados: null,
    erro: erroFinal ?? "Falha ao extrair dados do documento.",
    modelo,
    duracaoMs: Date.now() - inicio,
  };
}
