import { ApiError } from "@google/genai";
import type { CategoriaErroIA, ErroClassificado } from "./tipos";

/**
 * Classificação de erros de provider de IA. Prioriza o código HTTP
 * estruturado quando disponível (o SDK @google/genai lança `ApiError` com
 * `.status` numérico) e cai para regex sobre a mensagem como hoje em
 * lib/gemini/chaves.ts para erros de rede/infra que não chegam como ApiError
 * (ECONNRESET, timeout do AbortSignal, etc.).
 */

const REGEX_CREDENCIAL = /401|403|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i;
const REGEX_QUOTA = /429|RESOURCE_EXHAUSTED|quota\s*exceeded/i;
const REGEX_ENTRADA_INVALIDA = /400|INVALID_ARGUMENT/i;
const REGEX_TRANSITORIO =
  /UNAVAILABLE|"code"\s*:\s*50[0-9]|overloaded|internal error|ECONNRESET|ETIMEDOUT|fetch failed|network|abort|timeout/i;

function categoriaPorStatusHttp(status: number): CategoriaErroIA | null {
  if (status === 401 || status === 403) return "credencial";
  if (status === 429) return "quota";
  if (status === 400) return "entrada_invalida";
  if (status >= 500) return "transitorio";
  return null;
}

function categoriaPorMensagem(mensagem: string): CategoriaErroIA {
  if (REGEX_CREDENCIAL.test(mensagem)) return "credencial";
  if (REGEX_QUOTA.test(mensagem)) return "quota";
  if (REGEX_TRANSITORIO.test(mensagem)) return "transitorio";
  if (REGEX_ENTRADA_INVALIDA.test(mensagem)) return "entrada_invalida";
  return "desconhecido";
}

/** Remove qualquer coisa que pareça uma API key da mensagem antes de logar/exibir. */
function sanitizarMensagem(mensagem: string): string {
  return mensagem
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[chave removida]")
    .replace(/[A-Za-z0-9_-]{32,}/g, (trecho) => (trecho.startsWith("[") ? trecho : "[valor longo removido]"))
    .slice(0, 500);
}

export function classificarErro(erro: unknown): ErroClassificado {
  if (erro instanceof ApiError) {
    const categoria = categoriaPorStatusHttp(erro.status) ?? categoriaPorMensagem(erro.message);
    return { categoria, codigoHttp: erro.status, mensagem: sanitizarMensagem(erro.message) };
  }

  const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao chamar o provider de IA.";
  return { categoria: categoriaPorMensagem(mensagem), codigoHttp: null, mensagem: sanitizarMensagem(mensagem) };
}

/** JSON inválido / falha de validação Zod não passam pelo SDK como ApiError — classificação direta. */
export function erroDeParsing(mensagem: string): ErroClassificado {
  return { categoria: "parsing", codigoHttp: null, mensagem: sanitizarMensagem(mensagem) };
}

export const MENSAGENS_USUARIO: Record<CategoriaErroIA, string> = {
  credencial: "Não foi possível analisar o documento no momento. Outra integração será tentada automaticamente.",
  quota: "Não foi possível analisar o documento no momento. Outra integração será tentada automaticamente.",
  transitorio: "Não foi possível analisar o documento no momento. Outra integração será tentada automaticamente.",
  entrada_invalida:
    "Não foi possível identificar os dados deste documento. Verifique se o PDF está legível e tente novamente.",
  parsing: "Não foi possível identificar os dados deste documento. Verifique se o PDF está legível e tente novamente.",
  desconhecido: "Não foi possível analisar o documento no momento. Tente novamente em alguns minutos.",
};

export const MENSAGENS_TESTE_CONEXAO: Record<CategoriaErroIA, string> = {
  credencial: "API Key inválida.",
  quota: "Limite temporariamente atingido.",
  transitorio: "Provider indisponível no momento.",
  entrada_invalida: "Modelo indisponível ou requisição rejeitada pelo provider.",
  parsing: "Resposta inesperada do provider.",
  desconhecido: "Provider indisponível.",
};
