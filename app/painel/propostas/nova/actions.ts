"use server";

import { createClient } from "@/lib/supabase/server";
import { criarPropostaSchema, type CriarPropostaInput } from "@/lib/schemas/proposta";
import { calcularPreco, validarAlteracaoManual } from "@/lib/domain/precificacao";
import { somarCentavos } from "@/lib/domain/money";
import { extrairAnoESequencial, gerarCodigoProposta } from "@/lib/domain/numeracao";
import { calcularPotenciaTotalW, divergePotencia } from "@/lib/domain/potencia";
import { simular } from "@/lib/domain/simulacao";
import { orcamentoExtraidoSchema, type OrcamentoExtraido } from "@/lib/gemini/schema";
import { validarOrcamento, type AlertaValidacao } from "@/lib/domain/validacaoOrcamento";

export interface ResultadoConfirmarOrcamento {
  sucesso: boolean;
  erro?: string;
  alertas?: AlertaValidacao[];
}

/** Salva as correções feitas pelo usuário na Etapa 2 (Conferência da extração). */
export async function confirmarOrcamentoAction(
  factoryQuoteId: string,
  orcamentoCorrigido: OrcamentoExtraido
): Promise<ResultadoConfirmarOrcamento> {
  const validado = orcamentoExtraidoSchema.safeParse(orcamentoCorrigido);
  if (!validado.success) {
    return { sucesso: false, erro: "Dados do orçamento inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const orcamento = validado.data;
  const alertas = validarOrcamento(orcamento);

  const { error: erroUpdate } = await supabase
    .from("factory_quotes")
    .update({
      fornecedor: orcamento.fornecedor,
      numero_cotacao: orcamento.numeroCotacao,
      integrador: orcamento.integrador,
      cliente_destino: orcamento.clienteDestino,
      emissao: orcamento.emissao,
      validade: orcamento.validade,
      condicao_pagamento: orcamento.condicaoPagamento,
      potencia_wp: Math.round(orcamento.potenciaWp),
      produtos_cents: orcamento.valores.produtosCentavos,
      frete_cents: orcamento.valores.freteCentavos,
      seguro_cents: orcamento.valores.seguroCentavos,
      icms_cents: orcamento.valores.icmsCentavos,
      ipi_cents: orcamento.valores.ipiCentavos,
      st_cents: orcamento.valores.stCentavos,
      diferencial_aliquota_cents: orcamento.valores.diferencialAliquotaCentavos,
      total_cents: orcamento.valores.totalCentavos,
      extraction_raw: { ...orcamento, _correcoesUsuario: true },
      extraction_confirmed_at: new Date().toISOString(),
    })
    .eq("id", factoryQuoteId);

  if (erroUpdate) return { sucesso: false, erro: erroUpdate.message };

  await supabase.from("factory_quote_items").delete().eq("factory_quote_id", factoryQuoteId);

  if (orcamento.itens.length > 0) {
    const { error: erroItens } = await supabase.from("factory_quote_items").insert(
      orcamento.itens.map((item) => ({
        factory_quote_id: factoryQuoteId,
        descricao: item.descricao,
        codigo: item.codigo,
        fabricante: item.fabricante,
        quantidade: item.quantidade,
        unidade: item.unidade,
        potencia_unitaria_w: item.potenciaUnitariaW,
        pagina_origem: item.paginaOrigem,
        confidence: item.confianca,
      }))
    );
    if (erroItens) return { sucesso: false, erro: erroItens.message };
  }

  await supabase.from("audit_logs").insert({
    entity_type: "factory_quote",
    entity_id: factoryQuoteId,
    action: "confirm_extraction",
    new_data: { numeroCotacao: orcamento.numeroCotacao, totalCentavos: orcamento.valores.totalCentavos },
    user_id: user.id,
  });

  return { sucesso: true, alertas };
}

export interface ResultadoCriarProposta {
  sucesso: boolean;
  erro?: string;
  propostaId?: string;
  codigo?: string;
}

async function proximoCodigoProposta(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const ano = new Date().getFullYear();
  const { data } = await supabase
    .from("proposals")
    .select("codigo")
    .like("codigo", `AS-${ano}-%`);

  const maiorSequencial = (data ?? [])
    .map((p) => extrairAnoESequencial(p.codigo)?.sequencial ?? 0)
    .reduce((max, atual) => Math.max(max, atual), 0);

  return gerarCodigoProposta(ano, maiorSequencial);
}

export async function criarPropostaAction(input: CriarPropostaInput): Promise<ResultadoCriarProposta> {
  const validado = criarPropostaSchema.safeParse(input);
  if (!validado.success) {
    return { sucesso: false, erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = validado.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  // Recalcula tudo no servidor — nunca confia em totais vindos do cliente.
  const custosAdicionaisCentavos = somarCentavos(...dados.precificacao.custosAdicionais.map((c) => c.valorCentavos));

  if (dados.precificacao.valorFinalManualCentavos !== null) {
    const erros = validarAlteracaoManual(
      dados.precificacao.motivoAlteracao ?? "",
      dados.precificacao.valorFinalManualCentavos
    );
    if (erros.length > 0) return { sucesso: false, erro: erros[0] };
  }

  const preco = calcularPreco({
    valorFabricaCentavos: dados.precificacao.valorFabricaCentavos,
    custosAdicionaisCentavos,
    descontoCentavos: dados.precificacao.descontoCentavos,
    valorFinalManualCentavos: dados.precificacao.valorFinalManualCentavos,
  });

  const modulos = dados.equipamentos.filter((e) => e.potenciaUnitariaW);
  const potenciaCalculadaW = calcularPotenciaTotalW(
    modulos.map((m) => ({ quantidade: m.quantidade, potenciaUnitariaW: m.potenciaUnitariaW ?? 0 }))
  );
  const potenciaDiverge =
    potenciaCalculadaW > 0 && divergePotencia(dados.dadosTecnicos.potenciaPropostaW, potenciaCalculadaW);
  if (potenciaDiverge && !dados.dadosTecnicos.justificativaDivergenciaPotencia) {
    return {
      sucesso: false,
      erro: "A potência proposta diverge da potência calculada dos módulos. Confirme ou justifique antes de continuar.",
    };
  }

  const resultadoSimulacao = simular({
    tarifaCentavosKwh: dados.dadosTecnicos.tarifaCentavosKwh,
    geracaoMensalKwh: dados.dadosTecnicos.geracaoMensalKwh,
    consumoMedioMensalKwh: dados.dadosTecnicos.consumoMedioKwh,
    valorFinalCentavos: preco.valorFinalCentavos,
    reajusteAnualPercentual: dados.premissasFinanceiras.reajusteAnualPercentual,
    degradacaoAnualPercentual: dados.premissasFinanceiras.degradacaoAnualPercentual,
    anosProjecao: dados.premissasFinanceiras.anosProjecao,
  });

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + dados.condicoesComerciais.validadeDias);

  let codigo = await proximoCodigoProposta(supabase);

  const inserirProposta = async (codigoTentativa: string) =>
    supabase
      .from("proposals")
      .insert({
        codigo: codigoTentativa,
        client_id: dados.clientId,
        factory_quote_id: dados.factoryQuoteId,
        status: "draft",
        potencia_wp: Math.round(dados.dadosTecnicos.potenciaPropostaW),
        consumo_medio_kwh: dados.dadosTecnicos.consumoMedioKwh,
        geracao_mensal_kwh: dados.dadosTecnicos.geracaoMensalKwh,
        geracao_anual_kwh: dados.dadosTecnicos.geracaoAnualKwh,
        area_util_m2: dados.dadosTecnicos.areaUtilM2 ?? null,
        tarifa_cents_kwh: dados.dadosTecnicos.tarifaCentavosKwh,
        factory_cost_cents: dados.precificacao.valorFabricaCentavos,
        additional_costs_cents: custosAdicionaisCentavos,
        discount_cents: dados.precificacao.descontoCentavos,
        sale_price_cents: preco.valorFinalCentavos,
        manual_price_override: dados.precificacao.valorFinalManualCentavos !== null,
        override_reason: dados.precificacao.motivoAlteracao ?? null,
        payment_conditions: {
          formasPagamento: dados.condicoesComerciais.formasPagamento,
          prazoEstimadoDias: dados.condicoesComerciais.prazoEstimadoDias,
          observacoesComerciais: dados.condicoesComerciais.observacoesComerciais,
        },
        technical_data: {
          tipoInstalacao: dados.dadosTecnicos.tipoInstalacao,
          tipoLigacao: dados.dadosTecnicos.tipoLigacao,
          consumoUltimos12Meses: dados.dadosTecnicos.consumoUltimos12Meses ?? null,
          percentualCompensacao: dados.dadosTecnicos.percentualCompensacao ?? null,
          tipoCobertura: dados.dadosTecnicos.tipoCobertura ?? null,
          observacoesTecnicas: dados.dadosTecnicos.observacoesTecnicas ?? null,
          potenciaCalculadaW,
          potenciaDiverge,
          justificativaDivergenciaPotencia: dados.dadosTecnicos.justificativaDivergenciaPotencia ?? null,
          equipamentos: dados.equipamentos,
          servicos: dados.servicos,
          custosAdicionais: dados.precificacao.custosAdicionais,
        },
        simulation_data: {
          premissas: dados.premissasFinanceiras,
          resultado: resultadoSimulacao,
        },
        included_items: dados.condicoesComerciais.itensIncluidos,
        excluded_items: dados.condicoesComerciais.itensNaoIncluidos,
        warranties: dados.garantias,
        notes: dados.notas ?? null,
        valid_until: validUntil.toISOString().slice(0, 10),
        seller_id: dados.dadosTecnicos.vendedorId ?? null,
        created_by: user.id,
      })
      .select("id, codigo")
      .single();

  let { data: proposta, error } = await inserirProposta(codigo);

  // Corrida rara de numeração: se o código já existir, tenta o próximo uma vez.
  if (error?.code === "23505") {
    const anoAtual = new Date().getFullYear();
    const seq = extrairAnoESequencial(codigo)?.sequencial ?? 0;
    codigo = gerarCodigoProposta(anoAtual, seq);
    ({ data: proposta, error } = await inserirProposta(codigo));
  }

  if (error || !proposta) {
    return { sucesso: false, erro: error?.message ?? "Não foi possível criar a proposta." };
  }

  if (dados.precificacao.valorFinalManualCentavos !== null) {
    await supabase.from("price_overrides").insert({
      proposal_id: proposta.id,
      previous_value_cents: dados.precificacao.valorFabricaCentavos + custosAdicionaisCentavos - dados.precificacao.descontoCentavos,
      new_value_cents: dados.precificacao.valorFinalManualCentavos,
      reason: dados.precificacao.motivoAlteracao ?? "",
      created_by: user.id,
    });
  }

  await supabase.from("audit_logs").insert({
    entity_type: "proposal",
    entity_id: proposta.id,
    action: "create",
    new_data: { codigo: proposta.codigo, sale_price_cents: preco.valorFinalCentavos },
    user_id: user.id,
  });

  return { sucesso: true, propostaId: proposta.id, codigo: proposta.codigo };
}
