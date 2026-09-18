import { describe, expect, it } from "vitest";
import { montarDadosProposta, type DadosParaNormalizarProposta } from "../normalizar";
import { centavosParaBRL } from "@/lib/domain/money";
import type { TechnicalDataProposta } from "@/lib/supabase/types";

function baseTechnicalData(overrides: Partial<TechnicalDataProposta> = {}): TechnicalDataProposta {
  return {
    tipoInstalacao: "residencial",
    tipoLigacao: "monofasica",
    consumoUltimos12Meses: null,
    percentualCompensacao: null,
    tipoCobertura: "ceramica",
    observacoesTecnicas: null,
    potenciaCalculadaW: 8280,
    potenciaDiverge: false,
    justificativaDivergenciaPotencia: null,
    equipamentos: [
      { descricao: "Módulo fotovoltaico", codigo: null, fabricante: "Astronergy", quantidade: 12, unidade: "unidades", potenciaUnitariaW: 690 },
      { descricao: "Inversor", codigo: null, fabricante: "Deye", quantidade: 1, unidade: "unidade", potenciaUnitariaW: 8000 },
    ],
    servicos: [
      { chave: "instalacao", label: "Instalação", incluido: true },
      { chave: "homologacao", label: "Homologação", incluido: true },
      { chave: "monitoramento", label: "Monitoramento", incluido: false },
    ],
    custosAdicionais: [],
    ...overrides,
  };
}

function baseDados(overrides: Partial<DadosParaNormalizarProposta["proposta"]> = {}): DadosParaNormalizarProposta {
  return {
    proposta: {
      codigo: "AS-2026-0042",
      status: "draft",
      criadoEmISO: "2026-09-17T13:00:00.000Z",
      validoAteISO: "2026-09-27",
      potenciaWp: 8280,
      consumoMedioKwh: 1150,
      geracaoMensalKwh: 1080,
      geracaoAnualKwh: 12960,
      areaUtilM2: 46,
      tarifaCentsKwh: 105,
      salePriceCents: 2450000,
      includedItems: ["Equipamentos descritos", "Instalação"],
      excludedItems: [],
      warranties: { instalacao: "1 ano", modulos: "12 anos", performance: "25 anos" },
      technicalData: baseTechnicalData(),
      paymentConditions: {
        formasPagamento: [
          { tipo: "a_vista", descricao: "Pagamento à vista" },
          { tipo: "financiamento", descricao: "Financiamento facilitado" },
        ],
        prazoEstimadoDias: 30,
      },
      simulationData: {
        premissas: { anosProjecao: 25, reajusteAnualPercentual: 8, degradacaoAnualPercentual: 0.5 },
        resultado: {
          economiaMensalCentavos: 102600,
          economiaPrimeiroAnoCentavos: 1231200,
          paybackMeses: 23,
          projecaoAnual: Array.from({ length: 25 }, (_, i) => ({
            ano: i + 1,
            economiaAnualCentavos: 1231200 + i * 10000,
            economiaAcumuladaCentavos: (i + 1) * 1231200,
          })),
        },
      },
      ...overrides,
    },
    cliente: {
      nomeRazaoSocial: "João Batista da Silva",
      cidade: "Várzea Grande",
      estado: "MT",
      unidadeConsumidora: "7788990",
      concessionaria: "Energisa Mato Grosso",
    },
    vendedor: { nome: "Maria Ferreira", telefone: "(65) 99665-4179" },
    empresa: {
      nome: "Alto Solar",
      cnpj: "22.483.694/0001-06",
      telefone: "(65) 99665-4179",
      whatsapp: "(65) 99665-4179",
      institucionalTexto: null,
    },
    numeroVersao: 1,
  };
}

describe("montarDadosProposta", () => {
  it("nunca inclui valor de fábrica, margem, lucro, VPL ou TIR no payload", () => {
    const dados = montarDadosProposta(baseDados());
    const serializado = JSON.stringify(dados).toLowerCase();
    expect(serializado).not.toContain("margem");
    expect(serializado).not.toContain("lucro");
    expect(serializado).not.toMatch(/\bvpl\b/);
    expect(serializado).not.toMatch(/\btir\b/);
    expect(serializado).not.toContain("fábrica");
  });

  it("usa o valor comercial final (sale_price_cents) como investimento exibido", () => {
    const dados = montarDadosProposta(baseDados({ salePriceCents: 2450000 }));
    expect(dados.financial.investment).toBe(centavosParaBRL(2450000));
  });

  it("não mostra texto demonstrativo fora do modo demo", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.meta.disclaimer).toBe("");
    expect(dados.meta.demo_mode).toBeUndefined();
  });

  it("ativa o modo demonstrativo e o aviso quando solicitado explicitamente", () => {
    const entrada = baseDados();
    const dados = montarDadosProposta({ ...entrada, demoMode: true });
    expect(dados.meta.demo_mode).toBe(true);
    expect(dados.meta.disclaimer).toContain("MODELO DEMONSTRATIVO");
  });

  it("calcula validity_days a partir de created_at e valid_until (sem hardcode de 15 dias)", () => {
    const dados = montarDadosProposta(baseDados({ criadoEmISO: "2026-09-17T13:00:00.000Z", validoAteISO: "2026-09-27" }));
    expect(dados.meta.validity_days).toBe(10);
    expect(dados.meta.issue_date).toBe("17/09/2026");
    expect(dados.meta.valid_until).toBe("27/09/2026");
  });

  it("mapeia a tabela de equipamentos com a mesma quantidade de itens do orçamento", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.equipment.rows).toHaveLength(2);
    expect(dados.equipment.rows[0]).toEqual(["Módulo fotovoltaico", "Astronergy", "12 unidades"]);
  });

  it("calcula potência instalada e módulos consistentes entre si", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.project.installed_power_kwp).toBeCloseTo(8.28, 2);
    expect(dados.project.module_quantity * dados.project.module_power_w).toBe(8280);
  });

  it("mapeia formas de pagamento respeitando o tipo", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.payment_options).toHaveLength(2);
    expect(dados.payment_options[0].title).toContain("À vista");
    expect(dados.payment_options[1].title).toContain("Financiamento");
  });

  it("amostra a projeção financeira em no máximo 6 pontos e preserva o valor final", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.financial.projection.length).toBeLessThanOrEqual(6);
    const ultimoPonto = dados.financial.projection[dados.financial.projection.length - 1];
    expect(dados.financial.savings_25_years).toBe(
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ultimoPonto.value)
    );
  });

  it("filtra somente os serviços marcados como incluídos", () => {
    const dados = montarDadosProposta(baseDados());
    expect(dados.services).toEqual(["Instalação", "Homologação"]);
  });

  it("usa o vendedor responsável como consultor quando disponível, com fallback institucional", () => {
    const comVendedor = montarDadosProposta(baseDados());
    expect(comVendedor.client.consultant).toBe("Maria Ferreira");

    const semVendedor = montarDadosProposta({ ...baseDados(), vendedor: null });
    expect(semVendedor.client.consultant).toBe("Equipe Alto Solar");
  });

  it("garante ao menos dois pontos de projeção mesmo sem simulação (anosProjecao=0)", () => {
    const entrada = baseDados();
    entrada.proposta.simulationData = {
      premissas: {},
      resultado: {
        economiaMensalCentavos: 0,
        economiaPrimeiroAnoCentavos: 0,
        paybackMeses: null,
        projecaoAnual: [],
      },
    };
    const dados = montarDadosProposta(entrada);
    expect(dados.financial.projection.length).toBeGreaterThanOrEqual(2);
  });
});
