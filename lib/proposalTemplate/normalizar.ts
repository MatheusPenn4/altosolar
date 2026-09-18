/**
 * Único ponto do sistema que monta o JSON enviado ao gerador Python de propostas.
 * Função pura (sem I/O) para ser fácil de testar: recebe os dados já lidos do Supabase
 * (proposta, cliente, vendedor, configurações da empresa) e devolve o contrato exato
 * exigido por `api/_proposal_generator/generator.py`.
 *
 * Regra de ouro: todo cálculo (preço final, potência, simulação financeira) já aconteceu
 * antes — em `lib/domain/*` — e chega aqui pronto. Este módulo só formata para exibição
 * (pt-BR, centavos → "R$ X,XX", frações de kWp) e nunca inclui custo de fábrica, margem,
 * lucro, VPL ou TIR: esses campos simplesmente não têm onde ir no contrato de saída.
 */
import { centavosParaBRL } from "@/lib/domain/money";
import { contaComoModuloFotovoltaico, wattsParaKwp } from "@/lib/domain/potencia";
import type { Equipamento, FormaPagamento, Garantias } from "@/lib/schemas/proposta";
import type { PaymentConditionsProposta, SimulationDataProposta, TechnicalDataProposta } from "@/lib/supabase/types";
import {
  ASSETS_TEMPLATE,
  BENEFICIOS_PAGINA_2,
  CARDS_INFERIORES_PAGINA_2,
  CONDICOES_IMPORTANTES_PAGINA_6,
  DIFERENCIAIS_PAGINA_4,
  ETAPAS_PROJETO_PAGINA_4,
  FLUXO_ENERGIA_PAGINA_2,
  LABELS_TIPO_COBERTURA,
  LABELS_TIPO_INSTALACAO,
  NOTA_FINANCEIRA_PADRAO,
  NOTA_GERACAO_PADRAO,
  TEXTO_INSTITUCIONAL_PADRAO,
  TIMELINE_ICONS_PAGINA_6,
} from "./constantesInstitucionais";
import type { ProposalTemplateData, ProposalTemplateFinancialProjectionPoint, ProposalTemplatePaymentOption } from "./tipos";

const LOCALIZACAO_EMPRESA_PADRAO = "Cuiabá — Mato Grosso";
const GARANTIA_NOTA_PADRAO =
  "Os prazos definitivos de garantia serão confirmados conforme os equipamentos efetivamente fornecidos e seus respectivos certificados.";
const MESES_ABREVIADOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface ClienteParaProposta {
  nomeRazaoSocial: string;
  cidade: string | null;
  estado: string | null;
  unidadeConsumidora: string | null;
  concessionaria: string | null;
}

export interface VendedorParaProposta {
  nome: string | null;
  telefone: string | null;
}

export interface EmpresaParaProposta {
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  institucionalTexto: string | null;
}

export interface PropostaParaNormalizar {
  codigo: string;
  status: string;
  criadoEmISO: string; // proposals.created_at (timestamptz)
  validoAteISO: string; // proposals.valid_until (date, YYYY-MM-DD)
  potenciaWp: number | null;
  consumoMedioKwh: number | null;
  geracaoMensalKwh: number | null;
  geracaoAnualKwh: number | null;
  areaUtilM2: number | null;
  tarifaCentsKwh: number | null;
  salePriceCents: number;
  includedItems: string[];
  excludedItems: string[];
  warranties: Garantias;
  technicalData: TechnicalDataProposta;
  paymentConditions: PaymentConditionsProposta;
  simulationData: SimulationDataProposta;
}

export interface DadosParaNormalizarProposta {
  proposta: PropostaParaNormalizar;
  cliente: ClienteParaProposta;
  vendedor: VendedorParaProposta | null;
  empresa: EmpresaParaProposta;
  numeroVersao: number;
  demoMode?: boolean;
}

function dataCalendarioCuiaba(instanteISO: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cuiaba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instanteISO));
}

function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function epochDiasUTC(dataISO: string): number {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / 86_400_000;
}

function diasEntre(inicioISO: string, fimISO: string): number {
  return Math.round(epochDiasUTC(fimISO) - epochDiasUTC(inicioISO));
}

function formatarInteiroBR(valor: number): string {
  return Math.round(valor).toLocaleString("pt-BR");
}

function formatarKwpNumero(watts: number): number {
  return Math.round(wattsParaKwp(watts) * 100) / 100;
}

function formatarKwpDisplay(watts: number): string {
  return `${wattsParaKwp(watts).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`;
}

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatarPayback(meses: number | null): string {
  if (meses == null || meses <= 0) return "Não aplicável";
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos !== 1 ? "s" : ""}`);
  if (mesesRestantes > 0 || anos === 0) {
    partes.push(`${mesesRestantes} ${mesesRestantes === 1 ? "mês" : "meses"}`);
  }
  return partes.join(" e ");
}

function labelTipoInstalacao(tipo: string): string {
  return LABELS_TIPO_INSTALACAO[tipo] ?? (tipo.charAt(0).toUpperCase() + tipo.slice(1));
}

function labelTipoCobertura(tipo: string | null): string {
  if (!tipo) return "Não informado";
  return LABELS_TIPO_COBERTURA[tipo] ?? tipo;
}

function montarLinhaCidade(cidade: string | null, estado: string | null): string {
  if (cidade && estado) return `${cidade} — ${estado}`;
  return cidade || estado || "Não informado";
}

/** Módulos = itens do orçamento identificados como painel fotovoltaico (exclui inversor etc). */
function calcularModulos(equipamentos: Equipamento[]): { quantidade: number; potenciaUnitariaW: number } {
  const modulos = equipamentos.filter((e) => contaComoModuloFotovoltaico(e.descricao, e.potenciaUnitariaW));
  if (modulos.length === 0) {
    // Situação defensiva: não deveria ocorrer com o fluxo normal do assistente
    // (a etapa de projeto exige potência calculada > 0), mas evita quebrar a
    // geração caso um item de módulo não tenha sido reconhecido automaticamente.
    return { quantidade: 1, potenciaUnitariaW: 0 };
  }
  const quantidadeTotal = modulos.reduce((soma, m) => soma + m.quantidade, 0);
  const potenciaTotalW = modulos.reduce((soma, m) => soma + m.quantidade * (m.potenciaUnitariaW ?? 0), 0);
  const potenciaUnitariaMediaW = quantidadeTotal > 0 ? Math.round(potenciaTotalW / quantidadeTotal) : 0;
  return { quantidade: Math.round(quantidadeTotal), potenciaUnitariaW: potenciaUnitariaMediaW };
}

function montarEquipmentRows(equipamentos: Equipamento[]): [string, string, string][] {
  return equipamentos.map((e) => {
    const quantidadeTexto = Number.isInteger(e.quantidade) ? String(e.quantidade) : e.quantidade.toLocaleString("pt-BR");
    const unidade = e.unidade || (e.quantidade === 1 ? "unidade" : "unidades");
    return [e.descricao, e.fabricante || "—", `${quantidadeTexto} ${unidade}`];
  });
}

function montarPerfilMensal(
  consumoUltimos12Meses: number[] | null,
  consumoMedioKwh: number,
  geracaoMensalKwh: number,
  issueDateCuiabaISO: string
): ProposalTemplateData["monthly_profile"]["rows"] {
  const [, mesIssueStr] = issueDateCuiabaISO.split("-");
  const mesIssueIndex = Number(mesIssueStr) - 1; // 0-11, mês da emissão = último ponto da série
  const consumos =
    consumoUltimos12Meses && consumoUltimos12Meses.length === 12
      ? consumoUltimos12Meses
      : Array.from({ length: 12 }, () => consumoMedioKwh);

  return Array.from({ length: 12 }, (_, indice) => {
    const mesIndex = (mesIssueIndex - 11 + indice + 24) % 12;
    return {
      month: MESES_ABREVIADOS[mesIndex],
      consumption: Math.round(consumos[indice]),
      // Não há histórico de geração mensal real no sistema hoje — usamos a média
      // estimada em todos os meses (linha reta) em vez de inventar variação sazonal.
      generation: Math.round(geracaoMensalKwh),
    };
  });
}

function amostrarProjecao(
  projecaoAnual: SimulationDataProposta["resultado"]["projecaoAnual"]
): { ano: number; economiaAnualCentavos: number; economiaAcumuladaCentavos: number }[] {
  if (projecaoAnual.length === 0) {
    return [
      { ano: 0, economiaAnualCentavos: 0, economiaAcumuladaCentavos: 0 },
      { ano: 1, economiaAnualCentavos: 0, economiaAcumuladaCentavos: 0 },
    ];
  }
  if (projecaoAnual.length === 1) {
    return [{ ano: 0, economiaAnualCentavos: 0, economiaAcumuladaCentavos: 0 }, projecaoAnual[0]];
  }
  const MAX_PONTOS = 6;
  if (projecaoAnual.length <= MAX_PONTOS) return projecaoAnual;
  const indices = new Set<number>();
  const ultimo = projecaoAnual.length - 1;
  for (let i = 0; i < MAX_PONTOS; i++) {
    indices.add(Math.round((i * ultimo) / (MAX_PONTOS - 1)));
  }
  return [...indices].sort((a, b) => a - b).map((i) => projecaoAnual[i]);
}

function montarFormasPagamento(formasPagamento: FormaPagamento[], salePriceCents: number): ProposalTemplatePaymentOption[] {
  const LABEL_TIPO: Record<FormaPagamento["tipo"], string> = {
    a_vista: "À vista",
    entrada_parcelas: "Entrada + parcelas",
    financiamento: "Financiamento",
  };
  return formasPagamento.slice(0, 3).map((forma, indice) => {
    const titulo = `Opção ${indice + 1} — ${LABEL_TIPO[forma.tipo]}`;
    let linhas: string[];
    if (forma.tipo === "a_vista") {
      linhas = [`Valor: ${centavosParaBRL(salePriceCents)}`, forma.descricao || "Pagamento conforme contratação"];
    } else if (forma.tipo === "entrada_parcelas") {
      linhas = [
        `Entrada: ${centavosParaBRL(forma.valorEntradaCentavos ?? 0)}`,
        `Saldo: ${forma.numeroParcelas ?? 0} parcelas de ${centavosParaBRL(forma.valorParcelaCentavos ?? 0)}`,
      ];
      if (forma.observacoes) linhas.push(forma.observacoes);
    } else {
      linhas = [forma.descricao || "Disponível mediante análise de crédito", "Taxas definidas pela instituição financeira"];
      if (forma.observacoes) linhas.push(forma.observacoes);
    }
    return { title: titulo, lines: linhas };
  });
}

function montarGarantias(garantias: Garantias): { warranties: ProposalTemplateData["warranties"]; details: string[] } {
  const warranties: ProposalTemplateData["warranties"] = [
    { title: "Garantia da instalação", value: garantias.instalacao || "A confirmar" },
    { title: "Equipamentos", value: garantias.modulos || garantias.inversor || "Conforme fabricante" },
    { title: "Performance", value: garantias.performance || "Conforme certificado" },
  ];
  const details: string[] = [];
  if (garantias.instalacao) details.push(`Instalação: ${garantias.instalacao}`);
  if (garantias.modulos) details.push(`Módulos: ${garantias.modulos}`);
  if (garantias.performance) details.push(`Performance: ${garantias.performance}`);
  if (garantias.inversor) details.push(`Inversor: ${garantias.inversor}`);
  if (garantias.microinversor) details.push(`Microinversor: ${garantias.microinversor}`);
  if (garantias.outras) details.push(`Outras condições: ${garantias.outras}`);
  return { warranties, details: details.length > 0 ? details : ["Garantias conforme certificado dos fabricantes."] };
}

export function montarDadosProposta(dados: DadosParaNormalizarProposta): ProposalTemplateData {
  const { proposta, cliente, vendedor, empresa, numeroVersao } = dados;
  const tecnico = proposta.technicalData;

  const issueDateCuiaba = dataCalendarioCuiaba(proposta.criadoEmISO);
  const issueDateBR = formatarDataBR(issueDateCuiaba);
  const validUntilBR = formatarDataBR(proposta.validoAteISO);
  const validityDays = Math.max(0, diasEntre(issueDateCuiaba, proposta.validoAteISO));

  const potenciaPropostaW = proposta.potenciaWp ?? tecnico.potenciaCalculadaW ?? 0;
  const modulosCalculados = calcularModulos(tecnico.equipamentos);
  const moduleQuantity = modulosCalculados.quantidade;
  // Fallback defensivo: se nenhum item foi reconhecido como módulo, usa a
  // potência proposta como "potência unitária" de um único item — mantém
  // module_quantity × module_power_w consistente com installed_power_kwp.
  const modulePowerW = modulosCalculados.potenciaUnitariaW > 0 ? modulosCalculados.potenciaUnitariaW : Math.max(Math.round(potenciaPropostaW), 1);

  const consumoMedioKwh = proposta.consumoMedioKwh ?? 0;
  const geracaoMensalKwh = proposta.geracaoMensalKwh ?? 0;
  const geracaoAnualKwh = proposta.geracaoAnualKwh ?? Math.round(geracaoMensalKwh * 12);
  const consumoAnualKwh = Math.round(consumoMedioKwh * 12);
  const compensationPercent =
    tecnico.percentualCompensacao ?? (consumoAnualKwh > 0 ? Math.round((geracaoAnualKwh / consumoAnualKwh) * 1000) / 10 : 0);

  const consultorNome = vendedor?.nome?.trim() || "Equipe Alto Solar";
  const empresaNome = empresa.nome || "Alto Solar";
  const cidadeLinha = montarLinhaCidade(cliente.cidade, cliente.estado);
  const tipoInstalacaoLabel = labelTipoInstalacao(tecnico.tipoInstalacao);
  const tipoCoberturaLabel = labelTipoCobertura(tecnico.tipoCobertura);

  const resultado = proposta.simulationData?.resultado;
  const economiaMensalCentavos = resultado?.economiaMensalCentavos ?? 0;
  const economiaPrimeiroAnoCentavos = resultado?.economiaPrimeiroAnoCentavos ?? economiaMensalCentavos * 12;
  const anosProjecao = proposta.simulationData?.premissas?.anosProjecao ?? resultado?.projecaoAnual?.length ?? 0;
  const amostraProjecao = amostrarProjecao(resultado?.projecaoAnual ?? []);
  const projection: ProposalTemplateFinancialProjectionPoint[] = amostraProjecao.map((ponto) => ({
    year: ponto.ano,
    label: ponto.ano === 0 ? "Início" : `${ponto.ano} ano${ponto.ano !== 1 ? "s" : ""}`,
    // Em reais (não centavos): precisa bater exatamente com o valor formatado em
    // `savings_25_years` (BRL), que é o que o gerador Python usa para validar
    // a proposta — dividir um inteiro de centavos por 100 é seguro aqui porque
    // sempre resulta em no máximo 2 casas decimais.
    value: Math.round(ponto.economiaAcumuladaCentavos) / 100,
    display: centavosParaBRL(ponto.economiaAcumuladaCentavos).replace(/ /g, " "),
  }));
  const economiaAcumuladaFinal = amostraProjecao[amostraProjecao.length - 1].economiaAcumuladaCentavos;
  const energyOverPeriodKwh = Math.round(geracaoAnualKwh * Math.max(anosProjecao, 1));

  const { warranties, details: warrantyDetails } = montarGarantias(proposta.warranties);
  const servicosIncluidos = tecnico.servicos.filter((s) => s.incluido).map((s) => s.label);
  const paymentOptions = montarFormasPagamento(proposta.paymentConditions?.formasPagamento ?? [], proposta.salePriceCents);

  const installedPowerKwpNumero = formatarKwpNumero(potenciaPropostaW);
  const installedPowerDisplay = formatarKwpDisplay(potenciaPropostaW);
  const monthlyProfileRows = montarPerfilMensal(
    tecnico.consumoUltimos12Meses,
    consumoMedioKwh,
    geracaoMensalKwh,
    issueDateCuiaba
  );

  const equipmentRows = montarEquipmentRows(tecnico.equipamentos);
  const areaUtilM2 = proposta.areaUtilM2 && proposta.areaUtilM2 > 0 ? proposta.areaUtilM2 : 1;
  const tarifaCentsKwh = proposta.tarifaCentsKwh ?? 0;

  const projectFactsPagina2 = [
    { value_field: "installed_power_display", label: "Potência instalada" },
    { value_field: "annual_generation_display", label: "Geração anual" },
    { value_field: "compensation_display", label: "Compensação estimada" },
  ];

  const data: ProposalTemplateData = {
    meta: {
      template_version: "2.0.0",
      document_title: "Proposta Comercial de Energia Solar",
      proposal_number: proposta.codigo,
      version: String(numeroVersao),
      issue_date: issueDateBR,
      valid_until: validUntilBR,
      commercial_validity: `${validityDays} dias corridos`,
      validity_days: validityDays,
      status: proposta.status,
      disclaimer: dados.demoMode ? "MODELO DEMONSTRATIVO — SEM VALIDADE COMERCIAL" : "",
      page_label: "Página",
      page_total: 6,
      ...(dados.demoMode ? { demo_mode: true } : {}),
    },
    assets: ASSETS_TEMPLATE,
    company: {
      name: empresaNome,
      commercial_contact: consultorNome,
      phone: empresa.telefone || empresa.whatsapp || "—",
      cnpj: empresa.cnpj || "—",
      location: LOCALIZACAO_EMPRESA_PADRAO,
    },
    client: {
      name: cliente.nomeRazaoSocial,
      city: cidadeLinha,
      installation_type: tipoInstalacaoLabel,
      consumer_unit: cliente.unidadeConsumidora || "Não informado",
      utility: cliente.concessionaria || "Concessionária local",
      consultant: consultorNome,
    },
    project: {
      installed_power_kwp: installedPowerKwpNumero,
      installed_power_display: installedPowerDisplay,
      module_quantity: moduleQuantity,
      module_power_w: modulePowerW,
      calculated_power: `${moduleQuantity} x ${modulePowerW} W = ${formatarInteiroBR(moduleQuantity * modulePowerW)} W`,
      monthly_generation_kwh: Math.round(geracaoMensalKwh),
      monthly_generation_display: `${formatarInteiroBR(geracaoMensalKwh)} kWh`,
      annual_generation_kwh: Math.round(geracaoAnualKwh),
      annual_generation_display: `${formatarInteiroBR(geracaoAnualKwh)} kWh`,
      monthly_consumption_kwh: Math.round(consumoMedioKwh),
      monthly_consumption_display: `${formatarInteiroBR(consumoMedioKwh)} kWh`,
      annual_consumption_kwh: consumoAnualKwh,
      annual_consumption_display: `${formatarInteiroBR(consumoAnualKwh)} kWh`,
      compensation_percent: compensationPercent,
      compensation_display: formatarPercentual(compensationPercent),
      useful_area_m2: areaUtilM2,
      useful_area_display: `${formatarInteiroBR(areaUtilM2)} m²`,
      mounting_type: tipoCoberturaLabel,
      location: cidadeLinha,
      generation_note: NOTA_GERACAO_PADRAO,
    },
    monthly_profile: {
      title: "Consumo x Geração",
      consumption_label: "Consumo",
      generation_label: "Geração",
      unit: "kWh",
      rows: monthlyProfileRows,
      totals: {
        annual_consumption: `${formatarInteiroBR(consumoAnualKwh)} kWh`,
        annual_generation: `${formatarInteiroBR(geracaoAnualKwh)} kWh`,
        average_consumption: `${formatarInteiroBR(consumoMedioKwh)} kWh/mês`,
        average_generation: `${formatarInteiroBR(geracaoMensalKwh)} kWh/mês`,
      },
    },
    equipment: {
      title: "Equipamentos e escopo técnico",
      headers: ["Item", "Fabricante / modelo", "Quantidade"],
      rows: equipmentRows,
      area_label: `Área útil aproximada: ${formatarInteiroBR(areaUtilM2)} m²`,
    },
    services: servicosIncluidos,
    warranties,
    warranty_details: warrantyDetails,
    warranty_note: GARANTIA_NOTA_PADRAO,
    differentials: DIFERENCIAIS_PAGINA_4,
    financial: {
      investment: centavosParaBRL(proposta.salePriceCents),
      monthly_savings: centavosParaBRL(economiaMensalCentavos),
      first_year_savings: centavosParaBRL(economiaPrimeiroAnoCentavos),
      payback: formatarPayback(resultado?.paybackMeses ?? null),
      savings_25_years: centavosParaBRL(economiaAcumuladaFinal),
      tariff: `R$ ${(tarifaCentsKwh / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por kWh`,
      compensation: formatarPercentual(compensationPercent),
      energy_25_years: `${formatarInteiroBR(energyOverPeriodKwh)} kWh`,
      analysis_period: `${Math.max(anosProjecao, 1)} ano${Math.max(anosProjecao, 1) !== 1 ? "s" : ""}`,
      note: NOTA_FINANCEIRA_PADRAO,
      projection,
    },
    payment_options: paymentOptions.length > 0 ? paymentOptions : [{ title: "Opção 1 — À vista", lines: [`Valor: ${centavosParaBRL(proposta.salePriceCents)}`, "Pagamento conforme contratação"] }],
    payment_note: proposta.paymentConditions?.observacoesComerciais || "Condições definitivas confirmadas na contratação.",
    pages: {
      "1": {
        title_lines: ["PROPOSTA COMERCIAL", "DE ENERGIA SOLAR"],
        subtitle: "Economia, segurança e energia para o seu futuro.",
        prepared_for_label: "Preparada para",
        system_label: `Sistema fotovoltaico de ${installedPowerDisplay}`,
        footer_line: `Proposta ${proposta.codigo} • Versão ${numeroVersao} • ${issueDateBR}`,
        consultant_line: `Consultor responsável: ${consultorNome}`,
      },
      "2": {
        title: "Energia inteligente para transformar sua conta em investimento",
        institutional: empresa.institucionalTexto || TEXTO_INSTITUCIONAL_PADRAO,
        solution_title: "Uma solução pensada para você",
        solution_text: `Para ${cliente.nomeRazaoSocial}, recomendamos um sistema de ${installedPowerDisplay}, projetado para gerar aproximadamente ${formatarInteiroBR(geracaoAnualKwh)} kWh por ano e compensar cerca de ${formatarPercentual(compensationPercent)} do consumo energético estimado.`,
        project_facts: projectFactsPagina2,
        flow_steps: FLUXO_ENERGIA_PAGINA_2,
        benefits: BENEFICIOS_PAGINA_2,
        bottom_cards: CARDS_INFERIORES_PAGINA_2,
      },
      "3": {
        title: "Uma solução dimensionada para sua necessidade",
        subtitle: "Conheça os principais números do projeto recomendado.",
        summary_line: `${cliente.nomeRazaoSocial}  •  ${tipoCoberturaLabel}  •  ${cidadeLinha}  •  ${cliente.concessionaria || "Concessionária local"}`,
        metric_cards: [
          { value: installedPowerDisplay, label: "Potência instalada" },
          { value: `${formatarInteiroBR(geracaoMensalKwh)} kWh`, label: "Geração mensal" },
          { value: `${formatarInteiroBR(geracaoAnualKwh)} kWh`, label: "Geração anual" },
          { value: `${formatarInteiroBR(consumoMedioKwh)} kWh`, label: "Consumo médio" },
          { value: formatarPercentual(compensationPercent), label: "Compensação estimada" },
        ],
      },
      "4": {
        title: "Excelência do projeto à instalação",
        subtitle: "Qualidade técnica, organização e acompanhamento em todas as etapas.",
        services_title: "Serviços incluídos",
        warranty_note_title: "Garantias responsáveis",
        timeline_title: "Etapas do projeto",
        timeline: ETAPAS_PROJETO_PAGINA_4,
        differentials_title: "Por que escolher a Alto Solar?",
      },
      "5": {
        page_title: "Investimento e retorno estimado",
        page_subtitle: "Premissas claras para uma decisão segura.",
        investment_title: "INVESTIMENTO TOTAL",
        investment_complement: "Uma solução completa para gerar economia por muitos anos.",
        metric_cards: [
          { value: centavosParaBRL(economiaMensalCentavos), label: "Economia média mensal" },
          { value: centavosParaBRL(economiaPrimeiroAnoCentavos), label: "Economia no primeiro ano" },
          { value: formatarPayback(resultado?.paybackMeses ?? null), label: "Payback estimado" },
        ],
        projection_title: "Economia acumulada",
        payment_title: "Formas de pagamento",
        assumptions_title: "Premissas da simulação",
        assumptions: [
          `Tarifa utilizada: R$ ${(tarifaCentsKwh / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kWh`,
          `Geração média: ${formatarInteiroBR(geracaoMensalKwh)} kWh/mês`,
          `Consumo médio: ${formatarInteiroBR(consumoMedioKwh)} kWh/mês`,
          `Compensação estimada: ${formatarPercentual(compensationPercent)}`,
          `Período analisado: ${Math.max(anosProjecao, 1)} anos`,
        ],
        bottom_cards: [
          { title: "Economia estimada no período", value: centavosParaBRL(economiaAcumuladaFinal) },
          { title: "Energia gerada no período", value: `${formatarInteiroBR(energyOverPeriodKwh)} kWh` },
        ],
      },
      "6": {
        title: "Pronto para começar a economizar?",
        subtitle: "A Alto Solar está pronta para acompanhar seu projeto em todas as etapas.",
        commercial_title: "Condições comerciais",
        commercial_lines: [
          `Investimento: ${centavosParaBRL(proposta.salePriceCents)}`,
          `Validade: ${validityDays} dias corridos`,
          `Emissão: ${issueDateBR}`,
          `Validade final: ${validUntilBR}`,
          "Prazo sujeito à vistoria e homologação",
        ],
        included_title: "O que está incluído",
        included_lines: proposta.includedItems.length > 0 ? proposta.includedItems : servicosIncluidos,
        timeline: TIMELINE_ICONS_PAGINA_6,
        conditions_title: "Condições importantes",
        conditions_text: CONDICOES_IMPORTANTES_PAGINA_6,
        contact_title: "Fale com a Alto Solar",
        contact_lines: [consultorNome, empresa.telefone || empresa.whatsapp || "—", `CNPJ: ${empresa.cnpj || "—"}`, LOCALIZACAO_EMPRESA_PADRAO],
        qr_placeholder: "QR Code disponível na versão final",
        signatures: [cliente.nomeRazaoSocial, empresaNome],
        final_message: "Agradecemos a oportunidade de participar deste projeto. Será um prazer transformar energia em economia para você.",
      },
    },
    header: {
      proposal_line: `Proposta ${proposta.codigo}`,
      client_line: cliente.nomeRazaoSocial,
    },
    footer: {
      company_line: empresaNome,
      phone_line: empresa.telefone || empresa.whatsapp || "—",
      proposal_line: `${proposta.codigo} • Versão ${numeroVersao}`,
    },
    qr: { available: false, url: "" },
  };

  return data;
}
