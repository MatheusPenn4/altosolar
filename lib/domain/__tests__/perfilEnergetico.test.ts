import { describe, expect, it } from "vitest";
import { calcularPerfilEnergetico } from "../perfilEnergetico";
import type { FaturaExtraida } from "@/lib/gemini/fatura/schema";

function faturaBase(overrides: Partial<FaturaExtraida> = {}): FaturaExtraida {
  return {
    concessionaria: "Energisa MT",
    unidadeConsumidora: "123",
    nomeTitular: "Fulano",
    endereco: null,
    numero: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
    classificacao: "residencial",
    tipoLigacao: "trifasica",
    grupoTarifario: "B1",
    mesReferencia: "2026-07",
    dataEmissao: null,
    dataVencimento: null,
    consumoMesKwh: 2880,
    historicoConsumo: [],
    valorTotalCentavos: 252461,
    tarifaMediaCentavosKwh: 88,
    bandeiraTarifaria: "Amarela",
    possuiGeracaoPropria: false,
    observacoes: [],
    alertas: [],
    ...overrides,
  };
}

describe("calcularPerfilEnergetico", () => {
  it("usa consumoMesKwh quando não há histórico", () => {
    const perfil = calcularPerfilEnergetico(faturaBase({ historicoConsumo: [] }));
    expect(perfil.consumoMedioKwh).toBe(2880);
    expect(perfil.consumoUltimos12Meses).toBeNull();
  });

  it("com 13 meses (atual + 12 anteriores), fica com os 12 mais recentes em ordem cronológica", () => {
    const historico = [
      { mesReferencia: "2026-07", consumoKwh: 2880 },
      { mesReferencia: "2026-06", consumoKwh: 2355 },
      { mesReferencia: "2026-05", consumoKwh: 2659 },
      { mesReferencia: "2026-04", consumoKwh: 2197 },
      { mesReferencia: "2026-03", consumoKwh: 2151 },
      { mesReferencia: "2026-02", consumoKwh: 1886 },
      { mesReferencia: "2026-01", consumoKwh: 1706 },
      { mesReferencia: "2025-12", consumoKwh: 1565 },
      { mesReferencia: "2025-11", consumoKwh: 1720 },
      { mesReferencia: "2025-10", consumoKwh: 1505 },
      { mesReferencia: "2025-09", consumoKwh: 1522 },
      { mesReferencia: "2025-08", consumoKwh: 1778 },
      { mesReferencia: "2025-07", consumoKwh: 1551 },
    ];
    const perfil = calcularPerfilEnergetico(faturaBase({ historicoConsumo: historico }));
    expect(perfil.consumoUltimos12Meses).toHaveLength(12);
    expect(perfil.consumoUltimos12Meses![0]).toBe(1778); // 2025-08, o mais antigo dos 12
    expect(perfil.consumoUltimos12Meses![11]).toBe(2880); // 2026-07, o mais recente
    expect(perfil.consumoUltimos12Meses).not.toContain(1551); // 2025-07 fica de fora (13º mês)
  });

  it("mapeia classificação e tipo de ligação diretamente", () => {
    const perfil = calcularPerfilEnergetico(faturaBase());
    expect(perfil.tipoInstalacao).toBe("residencial");
    expect(perfil.tipoLigacao).toBe("trifasica");
    expect(perfil.tarifaCentavosKwh).toBe(88);
  });
});
