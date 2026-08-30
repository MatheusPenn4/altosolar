import { describe, expect, it } from "vitest";
import {
  formatarCEP,
  formatarCpfCnpj,
  formatarTelefone,
  validarCNPJ,
  validarCPF,
} from "../format";

describe("formatarTelefone", () => {
  it("formata celular com 11 dígitos", () => {
    expect(formatarTelefone("65999998888")).toBe("(65) 99999-8888");
  });
  it("formata fixo com 10 dígitos", () => {
    expect(formatarTelefone("6533334444")).toBe("(65) 3333-4444");
  });
});

describe("formatarCEP", () => {
  it("formata CEP", () => {
    expect(formatarCEP("78000000")).toBe("78000-000");
  });
});

describe("formatarCpfCnpj", () => {
  it("formata CPF", () => {
    expect(formatarCpfCnpj("11144477735")).toBe("111.444.777-35");
  });
  it("formata CNPJ", () => {
    expect(formatarCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("validarCPF", () => {
  it("aceita CPF válido", () => {
    expect(validarCPF("111.444.777-35")).toBe(true);
  });
  it("rejeita CPF com dígitos repetidos", () => {
    expect(validarCPF("111.111.111-11")).toBe(false);
  });
  it("rejeita CPF com dígito verificador errado", () => {
    expect(validarCPF("111.444.777-36")).toBe(false);
  });
});

describe("validarCNPJ", () => {
  it("aceita CNPJ válido", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });
  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
  });
});
