import type { SupabaseClient } from "@supabase/supabase-js";
import { descriptografar, byteaParaBuffer } from "./criptografia";
import { obterChavesGemini } from "@/lib/gemini/chaves";
import type { ConfiguracaoProvedorResolvida } from "./tipos";

interface LinhaProviderConfig {
  id: string;
  nome: string;
  provider: string;
  modelo: string;
  credencial_criptografada: string; // bytea vem como string hex ("\\x...") via postgrest
  ativo: boolean;
  prioridade: number;
  status: string;
  cooldown_ate: string | null;
}

function configuracaoSinteticaDoEnv(): ConfiguracaoProvedorResolvida[] {
  const modelo = process.env.GEMINI_MODEL;
  if (!modelo) return [];

  return obterChavesGemini().map((apiKey, indice) => ({
    id: null,
    nome: indice === 0 ? "Gemini (variável de ambiente)" : `Gemini (variável de ambiente #${indice + 1})`,
    provider: "google_gemini" as const,
    modelo,
    apiKey,
    prioridade: indice,
  }));
}

/**
 * Lista as configurações de IA elegíveis para uma nova análise, já
 * decifradas em memória e ordenadas por prioridade. Uma config é excluída
 * quando está com credencial inválida (falha estrutural, não temporária) ou
 * em cooldown ainda não expirado. Se não houver NENHUMA linha ativa
 * cadastrada (deploy que ainda não configurou nada pela tela), cai para
 * GEMINI_API_KEY(S)/GEMINI_MODEL — compatibilidade com o que já existia.
 */
export async function listarConfiguracoesDisponiveis(
  supabase: SupabaseClient
): Promise<ConfiguracaoProvedorResolvida[]> {
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("id, nome, provider, modelo, credencial_criptografada, ativo, prioridade, status, cooldown_ate")
    .eq("ativo", true)
    .order("prioridade", { ascending: true });

  if (error) {
    console.error("[ai] falha ao listar configurações de IA:", error.message);
    return configuracaoSinteticaDoEnv();
  }

  const linhas = (data ?? []) as LinhaProviderConfig[];
  if (linhas.length === 0) {
    return configuracaoSinteticaDoEnv();
  }

  const agora = Date.now();
  const elegiveis = linhas.filter((linha) => {
    if (linha.status === "credencial_invalida") return false;
    if (linha.cooldown_ate && new Date(linha.cooldown_ate).getTime() > agora) return false;
    return true;
  });

  return elegiveis.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    provider: linha.provider as ConfiguracaoProvedorResolvida["provider"],
    modelo: linha.modelo,
    apiKey: descriptografar(byteaParaBuffer(linha.credencial_criptografada)),
    prioridade: linha.prioridade,
  }));
}

/** Usado só pra exibir "N integrações configuradas" (ex.: UsoGeminiCard) — não decifra nada. */
export async function contarConfiguracoesConfiguradas(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("ai_provider_configs")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true);

  if (error || !count) return obterChavesGemini().length;
  return count;
}
