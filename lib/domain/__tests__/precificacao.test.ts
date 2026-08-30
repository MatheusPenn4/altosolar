import { describe, expect, it } from "vitest";
import { calcularPreco, validarAlteracaoManual, valorFinalPadraoCentavos } from "../precificacao";

describe("valorFinalPadraoCentavos", () => {
  it("por padrão o valor final é o valor da fábrica (sem custos/desconto)", () => {
    expect(
      valorFinalPadraoCentavos({
        valorFabricaCentavos: 2600278,
        custosAdicionaisCentavos: 0,
        descontoCentavos: 0,
      })
    ).toBe(2600278);
  });
});

describe("calcularPreco", () => {
  it("calcula lucro e margem quando não há override manual", () => {
    const resultado = calcularPreco({
      valorFabricaCentavos: 2600278,
      custosAdicionaisCentavos: 200000,
      descontoCentavos: 0,
      valorFinalManualCentavos: null,
    });

    expect(resultado.custoTotalCentavos).toBe(2800278);
    expect(resultado.valorFinalCentavos).toBe(2800278);
    expect(resultado.lucroBrutoCentavos).toBe(0);
    expect(resultado.abaixoDoCusto).toBe(false);
  });

  it("recalcula lucro e margem quando há valor final manual", () => {
    const resultado = calcularPreco({
      valorFabricaCentavos: 2600278,
      custosAdicionaisCentavos: 200000,
      descontoCentavos: 0,
      valorFinalManualCentavos: 3500000,
    });

    expect(resultado.custoTotalCentavos).toBe(2800278);
    expect(resultado.valorFinalCentavos).toBe(3500000);
    expect(resultado.lucroBrutoCentavos).toBe(699722);
    expect(resultado.margemPercentual).toBeCloseTo((699722 / 3500000) * 100);
    expect(resultado.diferencaCentavos).toBe(3500000 - 2600278);
  });

  it("detecta valor final abaixo do custo total", () => {
    const resultado = calcularPreco({
      valorFabricaCentavos: 2600278,
      custosAdicionaisCentavos: 200000,
      descontoCentavos: 0,
      valorFinalManualCentavos: 2000000,
    });

    expect(resultado.abaixoDoCusto).toBe(true);
    expect(resultado.lucroBrutoCentavos).toBeLessThan(0);
  });
});

describe("validarAlteracaoManual", () => {
  it("exige motivo com pelo menos 5 caracteres", () => {
    expect(validarAlteracaoManual("ok", 100).length).toBeGreaterThan(0);
    expect(validarAlteracaoManual("Desconto negociado com o cliente", 100)).toHaveLength(0);
  });

  it("rejeita valor final zero ou negativo", () => {
    expect(validarAlteracaoManual("Motivo válido aqui", 0).length).toBeGreaterThan(0);
    expect(validarAlteracaoManual("Motivo válido aqui", -100).length).toBeGreaterThan(0);
  });
});
