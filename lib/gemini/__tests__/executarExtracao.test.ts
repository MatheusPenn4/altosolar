import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

import { executarExtracaoGemini } from "../executarExtracao";

const schema = z.object({ ok: z.boolean() });

describe("executarExtracaoGemini", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_MODEL", "gemini-test");
    vi.stubEnv("GEMINI_API_KEYS", "chave1,chave2");
    generateContentMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tenta de novo após um erro transitório (503) e tem sucesso, sem esgotar as chaves", async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'))
      .mockResolvedValueOnce({ text: JSON.stringify({ ok: true }) });

    const resultado = await executarExtracaoGemini({
      pdfBuffer: Buffer.from("%PDF-"),
      prompt: "teste",
      responseSchema: {},
      zodSchema: schema,
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados).toEqual({ ok: true });
    // Só usou a primeira chave (uma falha + uma tentativa com sucesso), nunca precisou da segunda.
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("troca de chave imediatamente (sem esperar) quando a cota esgota", async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'))
      .mockResolvedValueOnce({ text: JSON.stringify({ ok: true }) });

    const inicio = Date.now();
    const resultado = await executarExtracaoGemini({
      pdfBuffer: Buffer.from("%PDF-"),
      prompt: "teste",
      responseSchema: {},
      zodSchema: schema,
    });
    const duracao = Date.now() - inicio;

    expect(resultado.sucesso).toBe(true);
    expect(duracao).toBeLessThan(500); // nenhum atraso deveria ter sido aplicado
  });

  it("retorna uma mensagem amigável (não o JSON bruto do Google) quando todas as chaves falham por sobrecarga", async () => {
    generateContentMock.mockRejectedValue(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'));

    const resultado = await executarExtracaoGemini({
      pdfBuffer: Buffer.from("%PDF-"),
      prompt: "teste",
      responseSchema: {},
      zodSchema: schema,
      maxTentativasPorChave: 1,
    });

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toContain("alta demanda");
    expect(resultado.erro).not.toContain("UNAVAILABLE");
  }, 10_000);
});
