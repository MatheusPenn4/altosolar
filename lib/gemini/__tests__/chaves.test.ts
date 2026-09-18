import { afterEach, describe, expect, it, vi } from "vitest";
import { obterChavesGemini, pareceEsgotamentoDeCota, pareceErroTransitorio } from "../chaves";

describe("obterChavesGemini", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa GEMINI_API_KEYS (separada por vírgula) quando definida", () => {
    vi.stubEnv("GEMINI_API_KEYS", "chave1, chave2 ,chave3");
    vi.stubEnv("GEMINI_API_KEY", "ignorada");
    expect(obterChavesGemini()).toEqual(["chave1", "chave2", "chave3"]);
  });

  it("cai para GEMINI_API_KEY quando GEMINI_API_KEYS não está definida", () => {
    vi.stubEnv("GEMINI_API_KEYS", "");
    vi.stubEnv("GEMINI_API_KEY", "unica");
    expect(obterChavesGemini()).toEqual(["unica"]);
  });

  it("retorna lista vazia quando nada está configurado", () => {
    vi.stubEnv("GEMINI_API_KEYS", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(obterChavesGemini()).toEqual([]);
  });

  it("ignora entradas vazias na lista (ex.: vírgula sobrando no fim)", () => {
    vi.stubEnv("GEMINI_API_KEYS", "chave1,chave2,");
    expect(obterChavesGemini()).toEqual(["chave1", "chave2"]);
  });
});

describe("pareceEsgotamentoDeCota", () => {
  it("reconhece erros de cota esgotada", () => {
    expect(pareceEsgotamentoDeCota("429 Too Many Requests")).toBe(true);
    expect(pareceEsgotamentoDeCota('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}')).toBe(true);
    expect(pareceEsgotamentoDeCota("Quota exceeded for requests")).toBe(true);
  });

  it("não confunde outros erros com esgotamento de cota", () => {
    expect(pareceEsgotamentoDeCota("model not found")).toBe(false);
    expect(pareceEsgotamentoDeCota("invalid PDF")).toBe(false);
  });
});

describe("pareceErroTransitorio", () => {
  it("reconhece sobrecarga/indisponibilidade momentânea do Gemini", () => {
    expect(
      pareceErroTransitorio('{"error":{"code":503,"message":"...high demand...","status":"UNAVAILABLE"}}')
    ).toBe(true);
    expect(pareceErroTransitorio("The model is overloaded, please try again later")).toBe(true);
    expect(pareceErroTransitorio("fetch failed")).toBe(true);
  });

  it("não confunde erro de cota nem erro de dado inválido com transitório", () => {
    expect(pareceErroTransitorio("429 Too Many Requests - RESOURCE_EXHAUSTED")).toBe(false);
    expect(pareceErroTransitorio("invalid PDF")).toBe(false);
    expect(pareceErroTransitorio("Resposta do Gemini não passou na validação do schema")).toBe(false);
  });
});
