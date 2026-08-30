import { describe, expect, it } from "vitest";
import { brlParaCentavos, centavosParaBRL, somarCentavos } from "../money";

describe("brlParaCentavos", () => {
  it("converte valores com separador de milhar e decimal brasileiro", () => {
    expect(brlParaCentavos("R$ 26.002,78")).toBe(2600278);
    expect(brlParaCentavos("24.398,66")).toBe(2439866);
    expect(brlParaCentavos("1.604,12")).toBe(160412);
  });

  it("converte números diretamente", () => {
    expect(brlParaCentavos(26002.78)).toBe(2600278);
  });

  it("trata valores vazios como zero", () => {
    expect(brlParaCentavos("")).toBe(0);
  });

  it("lança erro para valor inválido", () => {
    expect(() => brlParaCentavos("abc")).toThrow();
  });
});

describe("centavosParaBRL", () => {
  it("formata centavos como moeda brasileira", () => {
    expect(centavosParaBRL(2600278)).toBe("R$ 26.002,78");
  });
});

describe("somarCentavos — critério de aceite BelEnergy", () => {
  it("24.398,66 + 1.604,12 = 26.002,78", () => {
    const produtos = brlParaCentavos("24.398,66");
    const frete = brlParaCentavos("1.604,12");
    const total = somarCentavos(produtos, frete);
    expect(total).toBe(2600278);
    expect(centavosParaBRL(total)).toBe("R$ 26.002,78");
  });
});
