"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema, type ClienteFormValues } from "@/lib/schemas/cliente";
import { apenasDigitos } from "@/lib/format";

export interface ResultadoAcaoCliente {
  sucesso: boolean;
  erro?: string;
  clienteId?: string;
}

function paraLinhaBanco(valores: ClienteFormValues, userId: string) {
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
  };
}

export async function salvarClienteAction(valores: ClienteFormValues): Promise<ResultadoAcaoCliente> {
  const validado = clienteSchema.safeParse(valores);
  if (!validado.success) {
    return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const linha = paraLinhaBanco(validado.data, user.id);

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

export async function buscarClientesAction(termo: string) {
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, nome_razao_social, cpf_cnpj, cidade, tipo_pessoa")
    .order("nome_razao_social")
    .limit(20);

  const termoSeguro = termo.trim().replace(/[,()."'\\%]/g, "");
  if (termoSeguro) {
    query = query.or(`nome_razao_social.ilike.%${termoSeguro}%,cpf_cnpj.ilike.%${termoSeguro}%`);
  }

  const { data } = await query;
  return data ?? [];
}
