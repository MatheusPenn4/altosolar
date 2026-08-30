import { describe, expect, it } from "vitest";
import {
  calcularPotenciaTotalW,
  contaComoModuloFotovoltaico,
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

describe("contaComoModuloFotovoltaico", () => {
  it("considera módulo um item com potência unitária e descrição de módulo", () => {
    expect(contaComoModuloFotovoltaico("Módulo Fotovoltaico 585W", 585)).toBe(true);
    expect(contaComoModuloFotovoltaico("Painel solar 550W", 550)).toBe(true);
  });

  it("não considera o inversor um módulo, mesmo com potência unitária preenchida", () => {
    expect(contaComoModuloFotovoltaico("Inversor Growatt 10kW", 10000)).toBe(false);
    expect(contaComoModuloFotovoltaico("Microinversor Enphase", 300)).toBe(false);
  });

  it("não conta itens sem potência unitária", () => {
    expect(contaComoModuloFotovoltaico("Módulo Fotovoltaico 585W", null)).toBe(false);
    expect(contaComoModuloFotovoltaico("Módulo Fotovoltaico 585W", 0)).toBe(false);
  });

  it("critério de aceite: soma dos módulos ignora a potência do inversor", () => {
    const itens = [
      { descricao: "Módulo Fotovoltaico 585W", quantidade: 30, potenciaUnitariaW: 585 },
      { descricao: "Inversor Growatt 10kW", quantidade: 1, potenciaUnitariaW: 10000 },
    ];
    const modulos = itens.filter((i) => contaComoModuloFotovoltaico(i.descricao, i.potenciaUnitariaW));
    const totalW = calcularPotenciaTotalW(modulos);
    expect(totalW).toBe(17550);
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
