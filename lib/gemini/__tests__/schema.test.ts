import { describe, expect, it } from "vitest";
import { orcamentoExtraidoSchema, GEMINI_RESPONSE_SCHEMA } from "../schema";
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

  it("rejeita item com confianca fora de 0–1", () => {
    const invalido = {
      ...fixtureBelEnergy,
      itens: [{ ...fixtureBelEnergy.itens[0], confianca: 1.2 }, ...fixtureBelEnergy.itens.slice(1)],
    };
    expect(orcamentoExtraidoSchema.safeParse(invalido).success).toBe(false);
  });
});

describe("GEMINI_RESPONSE_SCHEMA — sincronia com orcamentoExtraidoSchema", () => {
  it("limita confianca a 0–1 no structured output do Gemini, não só no Zod", () => {
    // Regressão: sem minimum/maximum aqui, o Gemini podia devolver confianca
    // fora do intervalo, a validação Zod falhava depois e isso era tratado
    // como "JSON malformado" — consumindo uma tentativa de retry à toa.
    const propriedadeConfianca = (
      GEMINI_RESPONSE_SCHEMA.properties.itens.items.properties as { confianca: { minimum?: number; maximum?: number } }
    ).confianca;
    expect(propriedadeConfianca.minimum).toBe(0);
    expect(propriedadeConfianca.maximum).toBe(1);
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
