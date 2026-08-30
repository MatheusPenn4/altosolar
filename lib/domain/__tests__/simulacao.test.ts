import { describe, expect, it } from "vitest";
import { calcularPaybackMeses, simular } from "../simulacao";

describe("simular", () => {
  it("calcula economia mensal limitada pelo menor entre geração e consumo", () => {
    const resultado = simular({
      tarifaCentavosKwh: 95,
      geracaoMensalKwh: 1500,
      consumoMedioMensalKwh: 1200,
      valorFinalCentavos: 2600278,
    });

    expect(resultado.economiaMensalCentavos).toBe(1200 * 95);
    expect(resultado.economiaPrimeiroAnoCentavos).toBe(1200 * 95 * 12);
  });

  it("calcula payback simples em meses", () => {
    expect(calcularPaybackMeses(2600278, 100000)).toBe(27);
    expect(calcularPaybackMeses(2600278, 0)).toBeNull();
  });

  it("projeta economia acumulada respeitando reajuste e degradação informados", () => {
    const resultado = simular({
      tarifaCentavosKwh: 100,
      geracaoMensalKwh: 1000,
      consumoMedioMensalKwh: 1000,
      valorFinalCentavos: 1000000,
      reajusteAnualPercentual: 8,
      degradacaoAnualPercentual: 0.5,
      anosProjecao: 3,
    });

    expect(resultado.projecaoAnual).toHaveLength(3);
    expect(resultado.projecaoAnual[0].ano).toBe(1);
    expect(resultado.projecaoAnual[1].economiaAnualCentavos).toBeGreaterThan(
      resultado.projecaoAnual[0].economiaAnualCentavos
    );
    expect(resultado.projecaoAnual[2].economiaAcumuladaCentavos).toBe(
      resultado.projecaoAnual[0].economiaAnualCentavos +
        resultado.projecaoAnual[1].economiaAnualCentavos +
        resultado.projecaoAnual[2].economiaAnualCentavos
    );
  });

  it("não projeta anos quando anosProjecao não é informado", () => {
    const resultado = simular({
      tarifaCentavosKwh: 100,
      geracaoMensalKwh: 1000,
      consumoMedioMensalKwh: 1000,
      valorFinalCentavos: 1000000,
    });
    expect(resultado.projecaoAnual).toHaveLength(0);
  });
});
