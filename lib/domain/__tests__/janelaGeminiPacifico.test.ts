import { describe, expect, it } from "vitest";
import { inicioDoDiaPacificoUTC, proximoResetGeminiUTC } from "../janelaGeminiPacifico";

describe("inicioDoDiaPacificoUTC", () => {
  it("calcula meia-noite no Pacífico durante o horário de verão (PDT, UTC-7)", () => {
    // 30/08/2026 14:00 UTC == 07:00 PDT do mesmo dia (30/08)
    const agora = new Date("2026-08-30T14:00:00Z");
    const inicio = inicioDoDiaPacificoUTC(agora);
    expect(inicio.toISOString()).toBe("2026-08-30T07:00:00.000Z");
  });

  it("calcula meia-noite no Pacífico durante o horário padrão (PST, UTC-8)", () => {
    // 15/01/2026 14:00 UTC == 06:00 PST do mesmo dia (15/01)
    const agora = new Date("2026-01-15T14:00:00Z");
    const inicio = inicioDoDiaPacificoUTC(agora);
    expect(inicio.toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("antes da meia-noite pacífica, ainda pertence ao dia UTC anterior", () => {
    // 30/08/2026 05:00 UTC (== 29/08 22:00 PDT) ainda está no dia 29 no Pacífico
    const agora = new Date("2026-08-30T05:00:00Z");
    const inicio = inicioDoDiaPacificoUTC(agora);
    expect(inicio.toISOString()).toBe("2026-08-29T07:00:00.000Z");
  });
});

describe("proximoResetGeminiUTC", () => {
  it("aponta para a meia-noite pacífica de hoje quando ainda não passou", () => {
    const agora = new Date("2026-08-30T05:00:00Z"); // antes das 07:00 UTC (meia-noite PDT)
    const proximo = proximoResetGeminiUTC(agora);
    expect(proximo.toISOString()).toBe("2026-08-30T07:00:00.000Z");
  });

  it("aponta para amanhã quando a meia-noite pacífica de hoje já passou", () => {
    const agora = new Date("2026-08-30T14:00:00Z"); // depois das 07:00 UTC
    const proximo = proximoResetGeminiUTC(agora);
    expect(proximo.toISOString()).toBe("2026-08-31T07:00:00.000Z");
  });
});
