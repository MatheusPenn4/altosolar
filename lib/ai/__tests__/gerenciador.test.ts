import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@google/genai";
import { analisarDocumento, type RegistroTentativa } from "../gerenciador";
import type { AdaptadorProvedor } from "../provedores/tipos";
import type { ConfiguracaoProvedorResolvida } from "../tipos";

const zodSchema = z.object({ ok: z.boolean() });
const RESPOSTA_VALIDA = JSON.stringify({ ok: true });

function config(id: string, prioridade: number): ConfiguracaoProvedorResolvida {
  return { id, nome: `Config ${id}`, provider: "google_gemini", modelo: "modelo-teste", apiKey: `chave-${id}`, prioridade };
}

function opcoesBase(overrides: Partial<Parameters<typeof analisarDocumento>[0]> = {}) {
  const registros: RegistroTentativa[] = [];
  return {
    registros,
    opcoes: {
      configuracoes: [] as ConfiguracaoProvedorResolvida[],
      obterAdaptador: () => {
        throw new Error("obterAdaptador não configurado no teste");
      },
      prompt: "prompt de teste",
      responseSchema: {},
      zodSchema,
      pdfBuffer: Buffer.from("pdf"),
      maxTentativasPorProvider: 2,
      maxFallbacks: 3,
      timeoutMs: 5000,
      prazoFinalMs: Date.now() + 30_000,
      aoTentar: (r: RegistroTentativa) => {
        registros.push(r);
      },
      ...overrides,
    },
  };
}

/** Adaptador fake cujo comportamento por chamada é definido por uma fila de "ações". */
function adaptadorComRoteiro(...acoes: Array<() => Promise<{ texto: string }>>): AdaptadorProvedor {
  let indice = 0;
  return {
    provider: "google_gemini",
    async gerarJSON() {
      const acao = acoes[Math.min(indice, acoes.length - 1)];
      indice++;
      return acao();
    },
    async testarConexao() {
      throw new Error("não usado neste teste");
    },
  };
}

async function ok(): Promise<{ texto: string }> {
  return { texto: RESPOSTA_VALIDA };
}

function falha(erro: unknown): () => Promise<{ texto: string }> {
  return async () => {
    throw erro;
  };
}

describe("analisarDocumento — seleção e sucesso direto", () => {
  it("usa a config de maior prioridade e retorna sucesso sem tentar nenhuma outra", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [config("1", 1), config("2", 2)];
    opcoes.obterAdaptador = () => adaptadorComRoteiro(ok);

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados).toEqual({ ok: true });
    expect(resultado.providerConfigId).toBe("1");
    expect(registros).toHaveLength(1); // só a config 1 foi tentada
    expect(registros[0].ehFallback).toBe(false);
  });

  it("sem nenhuma configuração disponível, retorna erro sem tentar chamar nada", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [];

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erroUsuario).toMatch(/Nenhuma integração/);
    expect(registros).toHaveLength(0);
  });
});

describe("analisarDocumento — fallback por categoria de erro", () => {
  it("429 (quota): não repete na mesma config, cai para a próxima imediatamente", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [config("1", 1), config("2", 2)];

    // obterAdaptador só recebe o provider (não o id da config), então o fake
    // decide o comportamento pela ordem das chamadas: a 1ª falha com 429, a
    // 2ª (já na config de fallback) responde com sucesso.
    let chamadas = 0;
    opcoes.obterAdaptador = () => ({
      provider: "google_gemini",
      async gerarJSON() {
        chamadas++;
        if (chamadas === 1) throw new ApiError({ message: "quota", status: 429 });
        return { texto: RESPOSTA_VALIDA };
      },
      async testarConexao() {
        throw new Error("não usado");
      },
    });

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(true);
    expect(resultado.providerConfigId).toBe("2");
    expect(registros).toHaveLength(2);
    expect(registros[0].erro?.categoria).toBe("quota");
    expect(registros[0].config.id).toBe("1");
    expect(registros[1].ehFallback).toBe(true);
    expect(registros[1].config.id).toBe("2");
  });

  it("401 (credencial): não repete, marca e cai para a próxima sem esperar", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [config("1", 1), config("2", 2)];

    let chamadas = 0;
    opcoes.obterAdaptador = () => ({
      provider: "google_gemini",
      async gerarJSON() {
        chamadas++;
        if (chamadas === 1) throw new ApiError({ message: "invalid api key", status: 401 });
        return { texto: RESPOSTA_VALIDA };
      },
      async testarConexao() {
        throw new Error("não usado");
      },
    });

    const inicio = Date.now();
    const resultado = await analisarDocumento(opcoes);
    const duracao = Date.now() - inicio;

    expect(resultado.sucesso).toBe(true);
    expect(resultado.providerConfigId).toBe("2");
    expect(registros.filter((r) => r.config.id === "1")).toHaveLength(1); // sem retry na config 1
    expect(registros[0].erro?.categoria).toBe("credencial");
    expect(duracao).toBeLessThan(500); // sem backoff — troca imediata
  });

  it("erro transitório (5xx): repete a MESMA config antes de cair para a próxima", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [config("1", 1)];

    let chamadas = 0;
    opcoes.obterAdaptador = () => ({
      provider: "google_gemini",
      async gerarJSON() {
        chamadas++;
        if (chamadas === 1) throw new ApiError({ message: "server overloaded", status: 503 });
        return { texto: RESPOSTA_VALIDA };
      },
      async testarConexao() {
        throw new Error("não usado");
      },
    });

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(true);
    expect(registros).toHaveLength(2);
    expect(registros[0].config.id).toBe("1");
    expect(registros[1].config.id).toBe("1");
    expect(registros[1].ehFallback).toBe(false); // ainda é a mesma config, não é fallback
  });

  it("entrada inválida (400): não tenta nenhuma outra config", async () => {
    const { opcoes, registros } = opcoesBase();
    opcoes.configuracoes = [config("1", 1), config("2", 2)];
    opcoes.obterAdaptador = () => adaptadorComRoteiro(falha(new ApiError({ message: "bad request", status: 400 })));

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erroUsuario).toMatch(/legível/);
    expect(registros).toHaveLength(1); // só a config 1 foi tentada, sem fallback pra config 2
  });
});

describe("analisarDocumento — tetos de segurança contra loop infinito", () => {
  it("nunca ultrapassa maxFallbacks mesmo com mais configs disponíveis e erro contínuo", async () => {
    const { opcoes, registros } = opcoesBase({ maxFallbacks: 2, maxTentativasPorProvider: 1 });
    opcoes.configuracoes = [config("1", 1), config("2", 2), config("3", 3), config("4", 4)];
    opcoes.obterAdaptador = () => adaptadorComRoteiro(falha(new ApiError({ message: "quota", status: 429 })));

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(false);
    expect(registros).toHaveLength(2); // respeitou maxFallbacks=2, não tentou config 3 e 4
  });

  it("nunca ultrapassa o teto absoluto de 5 fallbacks mesmo se ai_settings pedir mais", async () => {
    const { opcoes, registros } = opcoesBase({ maxFallbacks: 999, maxTentativasPorProvider: 1 });
    opcoes.configuracoes = Array.from({ length: 10 }, (_, i) => config(String(i + 1), i + 1));
    opcoes.obterAdaptador = () => adaptadorComRoteiro(falha(new ApiError({ message: "quota", status: 429 })));

    await analisarDocumento(opcoes);

    expect(registros).toHaveLength(5);
  });

  it("nunca ultrapassa o teto absoluto de 3 tentativas por config mesmo se ai_settings pedir mais", async () => {
    const { opcoes, registros } = opcoesBase({ maxFallbacks: 1, maxTentativasPorProvider: 999 });
    opcoes.configuracoes = [config("1", 1)];
    opcoes.obterAdaptador = () => adaptadorComRoteiro(falha(new ApiError({ message: "server error", status: 503 })));

    await analisarDocumento(opcoes);

    expect(registros).toHaveLength(3);
  });
});

describe("analisarDocumento — parsing", () => {
  it("JSON inválido é classificado como parsing e tenta de novo antes de desistir", async () => {
    const { opcoes, registros } = opcoesBase({ maxTentativasPorProvider: 2 });
    opcoes.configuracoes = [config("1", 1)];

    let chamadas = 0;
    opcoes.obterAdaptador = () => ({
      provider: "google_gemini",
      async gerarJSON() {
        chamadas++;
        return { texto: chamadas === 1 ? "isto não é JSON" : RESPOSTA_VALIDA };
      },
      async testarConexao() {
        throw new Error("não usado");
      },
    });

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(true);
    expect(registros[0].erro?.categoria).toBe("parsing");
  });

  it("resposta que não passa no schema Zod é parsing, não sucesso silencioso", async () => {
    const { opcoes } = opcoesBase({ maxTentativasPorProvider: 1, maxFallbacks: 1 });
    opcoes.configuracoes = [config("1", 1)];
    opcoes.obterAdaptador = () => adaptadorComRoteiro(async () => ({ texto: JSON.stringify({ ok: "não é boolean" }) }));

    const resultado = await analisarDocumento(opcoes);

    expect(resultado.sucesso).toBe(false);
  });
});
