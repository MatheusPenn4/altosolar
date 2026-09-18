import type { ProviderIA, ResultadoTesteConexao } from "../tipos";

export interface OpcoesGerarJSON {
  apiKey: string;
  modelo: string;
  prompt: string;
  pdfBuffer: Buffer;
  mimeType: string;
  /** JSON Schema para structured output — contrato de extração, não específico de provider. */
  responseSchema: object;
  timeoutMs: number;
}

export interface OpcoesTestarConexao {
  apiKey: string;
  modelo: string;
  timeoutMs: number;
}

/**
 * Contrato que qualquer provider de IA precisa implementar para entrar no
 * AI Manager. Hoje só existe o adaptador do Gemini (lib/ai/provedores/gemini.ts);
 * adicionar OpenAI/Anthropic no futuro é só um novo arquivo implementando isto.
 */
export interface AdaptadorProvedor {
  provider: ProviderIA;
  gerarJSON(opcoes: OpcoesGerarJSON): Promise<{ texto: string }>;
  testarConexao(opcoes: OpcoesTestarConexao): Promise<ResultadoTesteConexao>;
}
