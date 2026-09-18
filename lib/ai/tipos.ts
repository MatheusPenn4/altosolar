/**
 * Tipos compartilhados pela camada central de IA (lib/ai/**). Nomes em
 * português para seguir a convenção já usada em lib/gemini, lib/domain etc.
 */

export type CategoriaErroIA =
  | "credencial"
  | "quota"
  | "transitorio"
  | "entrada_invalida"
  | "parsing"
  | "desconhecido";

export type StatusProvedor =
  | "disponivel"
  | "limite_atingido"
  | "credencial_invalida"
  | "indisponivel"
  | "desconhecido";

export type OperacaoIA = "analisar_orcamento" | "analisar_fatura" | "testar_conexao";

/** Providers suportados hoje pela arquitetura. Mais podem ser adicionados sem
 * alterar o AI Manager — basta um novo adaptador em lib/ai/provedores/ e uma
 * migration liberando o valor no CHECK de ai_provider_configs.provider. */
export type ProviderIA = "google_gemini";

/** Configuração de provedor já com a credencial decifrada em memória — nunca
 * persistida assim, nunca serializada para o cliente. */
export interface ConfiguracaoProvedorResolvida {
  /** null para a config sintética montada a partir de env vars legadas. */
  id: string | null;
  nome: string;
  provider: ProviderIA;
  modelo: string;
  apiKey: string;
  prioridade: number;
}

export interface ErroClassificado {
  categoria: CategoriaErroIA;
  codigoHttp: number | null;
  /** Mensagem já sanitizada — segura para logar e para eventualmente exibir a um admin. */
  mensagem: string;
}

export interface ResultadoAnaliseIA<T> {
  sucesso: boolean;
  dados: T | null;
  /** Mensagem amigável, segura para o usuário final. */
  erroUsuario: string | null;
  modelo: string | null;
  providerConfigId: string | null;
  duracaoMs: number;
  deCache?: boolean;
}

export interface ResultadoTesteConexao {
  ok: boolean;
  /** Uma das mensagens amigáveis fixas — nunca o erro cru do provider. */
  mensagem: string;
  categoria: CategoriaErroIA | null;
}
