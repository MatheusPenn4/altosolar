import { describe, expect, it } from "vitest";
import { COLUNAS_CONFIG_SEM_CREDENCIAL } from "../constantes";

describe("COLUNAS_CONFIG_SEM_CREDENCIAL", () => {
  it("nunca inclui a coluna da credencial cifrada — trava a garantia de que a UI nunca recebe esse campo", () => {
    const colunas = COLUNAS_CONFIG_SEM_CREDENCIAL.split(",").map((c) => c.trim());
    expect(colunas).not.toContain("credencial_criptografada");
  });

  it("inclui a prévia mascarada (é isso que a UI deve mostrar)", () => {
    expect(COLUNAS_CONFIG_SEM_CREDENCIAL).toContain("credencial_preview");
  });
});
