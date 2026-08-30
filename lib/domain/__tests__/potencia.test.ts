import { describe, expect, it } from "vitest";
import {
  calcularPotenciaTotalW,
  divergePotencia,
  formatarKwp,
  kwpParaWatts,
  wattsParaKwp,
} from "../potencia";

describe("calcularPotenciaTotalW — critério de aceite BelEnergy", () => {
  it("30 módulos × 585 W = 17.550 W = 17,55 kWp", () => {
    const totalW = calcularPotenciaTotalW([{ quantidade: 30, potenciaUnitariaW: 585 }]);
    expect(totalW).toBe(17550);
    expect(wattsParaKwp(totalW)).toBeCloseTo(17.55);
    expect(formatarKwp(totalW)).toBe("17,55 kWp");
  });

  it("soma múltiplos tipos de módulo", () => {
    const totalW = calcularPotenciaTotalW([
      { quantidade: 10, potenciaUnitariaW: 585 },
      { quantidade: 20, potenciaUnitariaW: 585 },
    ]);
    expect(totalW).toBe(17550);
  });
});

describe("conversões kWp <-> W", () => {
  it("converte kWp para watts", () => {
    expect(kwpParaWatts(17.55)).toBe(17550);
  });
});

describe("divergePotencia", () => {
  it("não diverge dentro da tolerância", () => {
    expect(divergePotencia(17550, 17550)).toBe(false);
    expect(divergePotencia(17600, 17550)).toBe(false); // ~0.28%
  });

  it("diverge além da tolerância", () => {
    expect(divergePotencia(20000, 17550)).toBe(true);
  });
});
