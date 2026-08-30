import { describe, expect, it } from "vitest";
import { orcamentoExtraidoSchema } from "../schema";
import { validarOrcamento } from "@/lib/domain/validacaoOrcamento";
import { calcularPotenciaTotalW, wattsParaKwp } from "@/lib/domain/potencia";
import fixtureBelEnergy from "../fixtures/belenergy-referencia.json";

describe("orcamentoExtraidoSchema — fixture BelEnergy", () => {
  it("valida a fixture de referência sem erros", () => {
    const resultado = orcamentoExtraidoSchema.safeParse(fixtureBelEnergy);
    expect(resultado.success).toBe(true);
  });

  it("rejeita quando falta um campo obrigatório", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- descartado propositalmente para testar a ausência do campo
    const { valores, ...semValores } = fixtureBelEnergy;
    const resultado = orcamentoExtraidoSchema.safeParse(semValores);
    expect(resultado.success).toBe(false);
  });
});

describe("Critérios de aceite — orçamento de referência BelEnergy", () => {
  const orcamento = orcamentoExtraidoSchema.parse(fixtureBelEnergy);

  it("número da cotação WEB-006638236", () => {
    expect(orcamento.numeroCotacao).toBe("WEB-006638236");
  });

  it("condição de pagamento PIX", () => {
    expect(orcamento.condicaoPagamento).toBe("PIX");
  });

  it("potência de 17,55 kWp (30 módulos de 585 W)", () => {
    const modulos = orcamento.itens.filter((i) => i.potenciaUnitariaW);
    const potenciaCalculada = calcularPotenciaTotalW(
      modulos.map((m) => ({ quantidade: m.quantidade, potenciaUnitariaW: m.potenciaUnitariaW! }))
    );
    expect(potenciaCalculada).toBe(17550);
    expect(wattsParaKwp(potenciaCalculada)).toBeCloseTo(17.55);
    expect(orcamento.potenciaWp).toBe(17550);
  });

  it("30 módulos de 585 W e 1 inversor Growatt de 10 kW", () => {
    const modulo = orcamento.itens.find((i) => i.potenciaUnitariaW === 585);
    expect(modulo?.quantidade).toBe(30);

    const inversor = orcamento.itens.find((i) => /invers/i.test(i.descricao));
    expect(inversor?.fabricante).toBe("Growatt");
    expect(inversor?.quantidade).toBe(1);
  });

  it("total dos produtos R$ 24.398,66 e frete R$ 1.604,12", () => {
    expect(orcamento.valores.produtosCentavos).toBe(2439866);
    expect(orcamento.valores.freteCentavos).toBe(160412);
  });

  it("total geral R$ 26.002,78 (produtos + frete)", () => {
    expect(orcamento.valores.totalCentavos).toBe(2600278);
    expect(orcamento.valores.produtosCentavos + orcamento.valores.freteCentavos).toBe(
      orcamento.valores.totalCentavos
    );
  });

  it("não gera alertas de validação determinística", () => {
    const alertas = validarOrcamento(orcamento);
    const erros = alertas.filter((a) => a.severidade === "erro");
    expect(erros).toHaveLength(0);
  });
});
