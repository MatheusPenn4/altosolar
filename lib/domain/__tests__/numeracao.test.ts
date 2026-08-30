import { describe, expect, it } from "vitest";
import { extrairAnoESequencial, gerarCodigoProposta, proximaVersao } from "../numeracao";

describe("gerarCodigoProposta", () => {
  it("gera o primeiro código do ano", () => {
    expect(gerarCodigoProposta(2026, 0)).toBe("AS-2026-0001");
  });

  it("incrementa a partir do último sequencial", () => {
    expect(gerarCodigoProposta(2026, 41)).toBe("AS-2026-0042");
  });
});

describe("extrairAnoESequencial", () => {
  it("extrai ano e sequencial de um código válido", () => {
    expect(extrairAnoESequencial("AS-2026-0042")).toEqual({ ano: 2026, sequencial: 42 });
  });

  it("retorna null para código inválido", () => {
    expect(extrairAnoESequencial("XYZ-123")).toBeNull();
  });
});

describe("proximaVersao", () => {
  it("retorna 1 quando não há versões", () => {
    expect(proximaVersao([])).toBe(1);
  });

  it("retorna o próximo número após a versão mais alta", () => {
    expect(proximaVersao([1, 2, 3])).toBe(4);
  });
});
