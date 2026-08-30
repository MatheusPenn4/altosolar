"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/cliente";
import { apenasDigitos } from "@/lib/format";
import type { PerfilEnergeticoCliente } from "@/lib/domain/perfilEnergetico";

export interface ResultadoAcaoCliente {
  sucesso: boolean;
  erro?: string;
  clienteId?: string;
}

function paraLinhaBanco(valores: ClienteFormValues, userId: string, perfilEnergetico?: PerfilEnergeticoCliente) {
  return {
    tipo_pessoa: valores.tipoPessoa,
    nome_razao_social: valores.nomeRazaoSocial.trim(),
    cpf_cnpj: valores.cpfCnpj ? apenasDigitos(valores.cpfCnpj) : null,
    telefone: valores.telefone || null,
    whatsapp: valores.whatsapp || null,
    email: valores.email || null,
    cep: valores.cep ? apenasDigitos(valores.cep) : null,
    endereco: valores.endereco || null,
    numero: valores.numero || null,
    complemento: valores.complemento || null,
    bairro: valores.bairro || null,
    cidade: valores.cidade || null,
    estado: valores.estado || null,
    unidade_consumidora: valores.unidadeConsumidora || null,
    concessionaria: valores.concessionaria || null,
    tipo_instalacao: valores.tipoInstalacao || null,
    observacoes: valores.observacoes || null,
    created_by: userId,
    ...(perfilEnergetico && {
      tipo_ligacao: perfilEnergetico.tipoLigacao,
      consumo_medio_kwh: perfilEnergetico.consumoMedioKwh,
      consumo_ultimos_12_meses: perfilEnergetico.consumoUltimos12Meses,
      tarifa_cents_kwh: perfilEnergetico.tarifaCentavosKwh,
      ultima_fatura_analisada_em: new Date().toISOString(),
    }),
  };
}

export async function salvarClienteAction(
  valores: ClienteFormValues,
  perfilEnergetico?: PerfilEnergeticoCliente
): Promise<ResultadoAcaoCliente> {
  const validado = clienteSchema.safeParse(valores);
  if (!validado.success) {
    return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const linha = paraLinhaBanco(validado.data, user.id, perfilEnergetico);

  if (validado.data.id) {
    const { error } = await supabase.from("clients").update(linha).eq("id", validado.data.id);
    if (error) return { sucesso: false, erro: error.message };
    revalidatePath("/painel/clientes");
    return { sucesso: true, clienteId: validado.data.id };
  }

  const { data, error } = await supabase.from("clients").insert(linha).select("id").single();
  if (error) return { sucesso: false, erro: error.message };

  revalidatePath("/painel/clientes");
  return { sucesso: true, clienteId: data.id };
}

const CAMPOS_PREENCHIVEIS_POR_FATURA = [
  "unidade_consumidora",
  "concessionaria",
  "endereco",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "cep",
  "tipo_instalacao",
] as const;

export interface DadosClienteDaFatura {
  unidadeConsumidora?: string | null;
  concessionaria?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  tipoInstalacao?: string | null;
}

/**
 * Aplica ao cadastro do cliente os dados extraídos de uma fatura de energia.
 *
 * Endereço/UC/concessionária: só preenche os campos que ainda estão vazios —
 * nunca sobrescreve o que já foi digitado manualmente.
 *
 * Perfil energético (consumo, tarifa, histórico, ligação): sempre sobrescreve
 * com a leitura mais recente — o consumo de um cliente muda com o tempo, e a
 * fatura mais nova é a fonte mais confiável.
 */
export async function preencherClienteComFaturaAction(
  clienteId: string,
  dadosFatura: DadosClienteDaFatura,
  perfilEnergetico: PerfilEnergeticoCliente
): Promise<ResultadoAcaoCliente> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const { data: clienteAtual, error: erroBusca } = await supabase
    .from("clients")
    .select(CAMPOS_PREENCHIVEIS_POR_FATURA.join(", "))
    .eq("id", clienteId)
    .maybeSingle<Record<(typeof CAMPOS_PREENCHIVEIS_POR_FATURA)[number], string | null>>();

  if (erroBusca || !clienteAtual) {
    return { sucesso: false, erro: erroBusca?.message ?? "Cliente não encontrado." };
  }

  const candidatos: Record<string, string | null | undefined> = {
    unidade_consumidora: dadosFatura.unidadeConsumidora,
    concessionaria: dadosFatura.concessionaria,
    endereco: dadosFatura.endereco,
    numero: dadosFatura.numero,
    bairro: dadosFatura.bairro,
    cidade: dadosFatura.cidade,
    estado: dadosFatura.estado,
    cep: dadosFatura.cep ? apenasDigitos(dadosFatura.cep) : dadosFatura.cep,
    tipo_instalacao: dadosFatura.tipoInstalacao,
  };

  const patch: Record<string, unknown> = {};
  for (const campo of CAMPOS_PREENCHIVEIS_POR_FATURA) {
    const valorAtual = clienteAtual[campo];
    const valorNovo = candidatos[campo];
    if ((valorAtual == null || valorAtual === "") && valorNovo) {
      patch[campo] = valorNovo;
    }
  }

  if (perfilEnergetico.tipoLigacao) patch.tipo_ligacao = perfilEnergetico.tipoLigacao;
  if (perfilEnergetico.consumoMedioKwh) patch.consumo_medio_kwh = perfilEnergetico.consumoMedioKwh;
  if (perfilEnergetico.consumoUltimos12Meses) patch.consumo_ultimos_12_meses = perfilEnergetico.consumoUltimos12Meses;
  if (perfilEnergetico.tarifaCentavosKwh) patch.tarifa_cents_kwh = perfilEnergetico.tarifaCentavosKwh;
  patch.ultima_fatura_analisada_em = new Date().toISOString();

  const { error } = await supabase.from("clients").update(patch).eq("id", clienteId);
  if (error) return { sucesso: false, erro: error.message };

  revalidatePath("/painel/clientes");
  return { sucesso: true, clienteId };
}

export async function buscarClientesAction(termo: string) {
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select(
      "id, nome_razao_social, cpf_cnpj, cidade, tipo_pessoa, tipo_instalacao, tipo_ligacao, consumo_medio_kwh, consumo_ultimos_12_meses, tarifa_cents_kwh"
    )
    .order("nome_razao_social")
    .limit(20);

  const termoSeguro = termo.trim().replace(/[,()."'\\%]/g, "");
  if (termoSeguro) {
    query = query.or(`nome_razao_social.ilike.%${termoSeguro}%,cpf_cnpj.ilike.%${termoSeguro}%`);
  }

  const { data } = await query;
  return data ?? [];
}
