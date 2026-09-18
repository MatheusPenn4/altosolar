import { afterEach, describe, expect, it, vi } from "vitest";
import { criptografar, descriptografar, mascarar, bufferParaBytea, byteaParaBuffer } from "../criptografia";

const CHAVE_TESTE = Buffer.alloc(32, 7).toString("base64");

describe("criptografar/descriptografar", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("round-trip: descriptografar(criptografar(x)) === x", () => {
    vi.stubEnv("AI_CREDENTIALS_ENCRYPTION_KEY", CHAVE_TESTE);
    const original = "AIzaSyD-chave-de-teste-1234567890";
    const cifrado = criptografar(original);
    expect(descriptografar(cifrado)).toBe(original);
  });

  it("gera um IV diferente a cada chamada — o ciphertext nunca se repete para o mesmo texto", () => {
    vi.stubEnv("AI_CREDENTIALS_ENCRYPTION_KEY", CHAVE_TESTE);
    const a = criptografar("mesma-chave");
    const b = criptografar("mesma-chave");
    expect(a.equals(b)).toBe(false);
  });

  it("recusa decifrar um payload adulterado (auth tag do GCM detecta a violação)", () => {
    vi.stubEnv("AI_CREDENTIALS_ENCRYPTION_KEY", CHAVE_TESTE);
    const cifrado = criptografar("segredo");
    const adulterado = Buffer.from(cifrado);
    adulterado[adulterado.length - 1] ^= 0xff; // corrompe o último byte do ciphertext
    expect(() => descriptografar(adulterado)).toThrow();
  });

  it("lança erro claro quando AI_CREDENTIALS_ENCRYPTION_KEY não está configurada", () => {
    vi.stubEnv("AI_CREDENTIALS_ENCRYPTION_KEY", "");
    expect(() => criptografar("x")).toThrow(/AI_CREDENTIALS_ENCRYPTION_KEY/);
  });
});

describe("mascarar", () => {
  it("mantém só início e fim visíveis", () => {
    expect(mascarar("AIzaSyD1234567890abcdefgh8K2")).toBe("AIza••••••••••h8K2");
  });

  it("mascara por completo chaves muito curtas", () => {
    expect(mascarar("abc")).toBe("•••");
  });
});

describe("bufferParaBytea/byteaParaBuffer", () => {
  it("round-trip preserva os bytes originais", () => {
    const original = Buffer.from([1, 2, 3, 255, 0, 128]);
    expect(byteaParaBuffer(bufferParaBytea(original)).equals(original)).toBe(true);
  });
});
