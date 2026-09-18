import { describe, expect, it } from "vitest";
import { ApiError } from "@google/genai";
import { classificarErro, erroDeParsing, MENSAGENS_USUARIO, MENSAGENS_TESTE_CONEXAO } from "../erros";

describe("classificarErro", () => {
  it("usa o status HTTP estruturado do ApiError quando disponível", () => {
    expect(classificarErro(new ApiError({ message: "forbidden", status: 403 })).categoria).toBe("credencial");
    expect(classificarErro(new ApiError({ message: "too many requests", status: 429 })).categoria).toBe("quota");
    expect(classificarErro(new ApiError({ message: "bad request", status: 400 })).categoria).toBe("entrada_invalida");
    expect(classificarErro(new ApiError({ message: "server error", status: 503 })).categoria).toBe("transitorio");
  });

  it("classifica erro de credencial por mensagem quando não é ApiError", () => {
    expect(classificarErro(new Error("401 Unauthorized")).categoria).toBe("credencial");
    expect(classificarErro(new Error("PERMISSION_DENIED: API key not valid")).categoria).toBe("credencial");
  });

  it("classifica erro de quota por mensagem", () => {
    expect(classificarErro(new Error("RESOURCE_EXHAUSTED")).categoria).toBe("quota");
    expect(classificarErro(new Error("quota exceeded")).categoria).toBe("quota");
  });

  it("classifica erro transitório por mensagem (rede/timeout/sobrecarga)", () => {
    expect(classificarErro(new Error("fetch failed")).categoria).toBe("transitorio");
    expect(classificarErro(new Error("The operation was aborted")).categoria).toBe("transitorio");
    expect(classificarErro(new Error("ECONNRESET")).categoria).toBe("transitorio");
    expect(classificarErro(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}')).categoria).toBe("transitorio");
  });

  it("cai em desconhecido quando nada bate", () => {
    expect(classificarErro(new Error("algo estranho aconteceu")).categoria).toBe("desconhecido");
  });

  it("nunca deixa a mensagem sanitizada carregar uma API key", () => {
    const classificado = classificarErro(new Error("chave inválida: AIzaSyD-abcdefghijklmnopqrstuvwxyz1234"));
    expect(classificado.mensagem).not.toContain("AIzaSyD");
  });
});

describe("erroDeParsing", () => {
  it("é sempre categoria parsing", () => {
    expect(erroDeParsing("JSON inválido").categoria).toBe("parsing");
  });
});

describe("mensagens amigáveis", () => {
  it("cobre todas as categorias possíveis, para usuário final e para teste de conexão", () => {
    const categorias = ["credencial", "quota", "transitorio", "entrada_invalida", "parsing", "desconhecido"] as const;
    for (const categoria of categorias) {
      expect(MENSAGENS_USUARIO[categoria]).toBeTruthy();
      expect(MENSAGENS_TESTE_CONEXAO[categoria]).toBeTruthy();
    }
  });

  it("mensagem ao usuário nunca expõe termos técnicos crus (ex.: RESOURCE_EXHAUSTED, 503)", () => {
    for (const mensagem of Object.values(MENSAGENS_USUARIO)) {
      expect(mensagem).not.toMatch(/RESOURCE_EXHAUSTED|UNAVAILABLE|50\d|429|401|403/);
    }
  });
});
