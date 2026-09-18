"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { criptografar, mascarar, descriptografar, bufferParaBytea, byteaParaBuffer } from "@/lib/ai/criptografia";
import { adaptadorGemini, listarModelosGemini } from "@/lib/ai/provedores/gemini";
import { registrarEvento } from "@/lib/ai/eventos";
import { marcarSucesso, marcarErro } from "@/lib/ai/saude";

const ROTA = "/painel/configuracoes/inteligencia-artificial";

interface ResultadoAcao {
  sucesso: boolean;
  erro?: string;
}

async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, admin: false as const };

  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return { supabase, user, admin: perfil?.is_admin === true };
}

const configuracaoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, "Informe um nome identificador."),
  provider: z.literal("google_gemini"),
  modelo: z.string().min(1, "Informe o modelo."),
  apiKey: z.string().optional(),
  prioridade: z.number().int().min(1).max(99),
  ativo: z.boolean(),
});

export type ConfiguracaoIAFormValues = z.infer<typeof configuracaoSchema>;

export async function criarConfiguracaoIAAction(valores: ConfiguracaoIAFormValues): Promise<ResultadoAcao> {
  const validado = configuracaoSchema.safeParse(valores);
  if (!validado.success) return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  const apiKey = validado.data.apiKey;
  if (!apiKey) return { sucesso: false, erro: "Informe a API Key." };

  const { supabase, user, admin } = await exigirAdmin();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };
  if (!admin) return { sucesso: false, erro: "Apenas administradores podem gerenciar integrações de IA." };

  const v = validado.data;
  const { error } = await supabase.from("ai_provider_configs").insert({
    nome: v.nome,
    provider: v.provider,
    modelo: v.modelo,
    credencial_criptografada: bufferParaBytea(criptografar(apiKey)),
    credencial_preview: mascarar(apiKey),
    prioridade: v.prioridade,
    ativo: v.ativo,
    created_by: user.id,
  });

  if (error) return { sucesso: false, erro: "Não foi possível salvar a integração." };

  revalidatePath(ROTA);
  return { sucesso: true };
}

export async function atualizarConfiguracaoIAAction(valores: ConfiguracaoIAFormValues): Promise<ResultadoAcao> {
  const validado = configuracaoSchema.safeParse(valores);
  if (!validado.success || !validado.data.id) {
    return { sucesso: false, erro: validado.success ? "ID ausente." : validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, admin } = await exigirAdmin();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };
  if (!admin) return { sucesso: false, erro: "Apenas administradores podem gerenciar integrações de IA." };

  const v = validado.data;
  const patch: Record<string, unknown> = {
    nome: v.nome,
    modelo: v.modelo,
    prioridade: v.prioridade,
    ativo: v.ativo,
  };

  if (v.apiKey) {
    patch.credencial_criptografada = bufferParaBytea(criptografar(v.apiKey));
    patch.credencial_preview = mascarar(v.apiKey);
  }

  // Qualquer edição reseta o diagnóstico — sem isso, uma config marcada
  // "credencial_invalida" continuaria travada mesmo depois de corrigida, já
  // que o AI Manager exclui configs nesse status da seleção.
  patch.status = "desconhecido";
  patch.cooldown_ate = null;
  patch.quota_reset_em = null;
  patch.quota_reset_confiavel = false;
  patch.ultimo_erro_categoria = null;
  patch.ultimo_erro_codigo = null;
  patch.ultimo_erro_mensagem = null;

  const { error } = await supabase.from("ai_provider_configs").update(patch).eq("id", v.id);
  if (error) return { sucesso: false, erro: "Não foi possível atualizar a integração." };

  revalidatePath(ROTA);
  return { sucesso: true };
}

export async function ativarDesativarConfiguracaoIAAction(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const { supabase, user, admin } = await exigirAdmin();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };
  if (!admin) return { sucesso: false, erro: "Apenas administradores podem gerenciar integrações de IA." };

  const { error } = await supabase.from("ai_provider_configs").update({ ativo }).eq("id", id);
  if (error) return { sucesso: false, erro: "Não foi possível alterar a integração." };

  revalidatePath(ROTA);
  return { sucesso: true };
}

export interface ResultadoTeste extends ResultadoAcao {
  mensagem?: string;
}

export async function testarConexaoAction(id: string): Promise<ResultadoTeste> {
  const { supabase, user, admin } = await exigirAdmin();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };
  if (!admin) return { sucesso: false, erro: "Apenas administradores podem testar integrações de IA." };

  const { data: config, error: erroConfig } = await supabase
    .from("ai_provider_configs")
    .select("id, provider, modelo, credencial_criptografada")
    .eq("id", id)
    .maybeSingle();

  if (erroConfig || !config) return { sucesso: false, erro: "Integração não encontrada." };

  const apiKey = descriptografar(byteaParaBuffer(config.credencial_criptografada as string));

  const inicio = Date.now();
  const resultado = await adaptadorGemini.testarConexao({ apiKey, modelo: config.modelo, timeoutMs: 15_000 });
  const duracaoMs = Date.now() - inicio;

  await registrarEvento(supabase, {
    providerConfigId: config.id,
    provider: config.provider,
    modelo: config.modelo,
    operacao: "testar_conexao",
    resultado: resultado.ok ? "sucesso" : "erro",
    categoriaErro: resultado.categoria,
    mensagem: resultado.ok ? null : resultado.mensagem,
    duracaoMs,
    userId: user.id,
  });

  if (resultado.ok) {
    await marcarSucesso(supabase, config.id);
  } else if (resultado.categoria) {
    await marcarErro(supabase, config.id, { categoria: resultado.categoria, codigoHttp: null, mensagem: resultado.mensagem });
  }

  revalidatePath(ROTA);
  return { sucesso: resultado.ok, mensagem: resultado.mensagem };
}

const globaisSchema = z.object({
  fallbackAutomatico: z.boolean(),
  maxTentativasPorProvider: z.number().int().min(1).max(3),
  maxFallbacks: z.number().int().min(1).max(5),
  timeoutMs: z.number().int().min(5_000).max(45_000),
});

export type ConfiguracoesGlobaisIAFormValues = z.infer<typeof globaisSchema>;

export async function salvarConfiguracoesGlobaisIAAction(
  valores: ConfiguracoesGlobaisIAFormValues
): Promise<ResultadoAcao> {
  const validado = globaisSchema.safeParse(valores);
  if (!validado.success) return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };

  const { supabase, user, admin } = await exigirAdmin();
  if (!user) return { sucesso: false, erro: "Sessão expirada." };
  if (!admin) return { sucesso: false, erro: "Apenas administradores podem alterar essas configurações." };

  const v = validado.data;
  const { error } = await supabase
    .from("app_settings")
    .update({
      ai_fallback_automatico: v.fallbackAutomatico,
      ai_max_tentativas_por_provider: v.maxTentativasPorProvider,
      ai_max_fallbacks: v.maxFallbacks,
      ai_timeout_ms: v.timeoutMs,
    })
    .eq("id", true);

  if (error) return { sucesso: false, erro: "Não foi possível salvar as configurações." };

  revalidatePath(ROTA);
  return { sucesso: true };
}

export async function buscarModelosDisponiveisAction(apiKey: string): Promise<string[]> {
  const { user, admin } = await exigirAdmin();
  if (!user || !admin || !apiKey) return [];
  return listarModelosGemini(apiKey);
}
