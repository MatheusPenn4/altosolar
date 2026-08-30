/**
 * A cota diária da API do Gemini reseta à meia-noite no horário do Pacífico
 * (EUA) — não em um período rolante de 24h. Este módulo calcula o início da
 * janela diária atual e o próximo horário de reset, em UTC, já considerando
 * o horário de verão da Califórnia (PDT/PST).
 *
 * Fonte: https://ai.google.dev/gemini-api/docs/rate-limits
 */

const FUSO_PACIFICO = "America/Los_Angeles";

/** Offset em minutos do fuso informado em relação ao UTC no instante `data` (ex.: -420 para PDT). */
function offsetMinutos(data: Date, fuso: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    timeZoneName: "shortOffset",
  }).formatToParts(data);
  const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = nome.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const horas = Number(match[1]);
  const minutos = match[2] ? Number(match[2]) : 0;
  return horas * 60 + (horas < 0 ? -minutos : minutos);
}

function dataNoFusoAAAAMMDD(data: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

/** Início (00:00) do dia atual no horário do Pacífico, retornado como instante UTC. */
export function inicioDoDiaPacificoUTC(agora: Date): Date {
  const aaaaMMdd = dataNoFusoAAAAMMDD(agora, FUSO_PACIFICO);
  const meiaNoiteComoSeUTC = new Date(`${aaaaMMdd}T00:00:00Z`).getTime();
  const offset = offsetMinutos(agora, FUSO_PACIFICO);
  return new Date(meiaNoiteComoSeUTC - offset * 60_000);
}

/** Próximo horário (a partir de `agora`) em que a cota diária do Gemini reseta, em UTC. */
export function proximoResetGeminiUTC(agora: Date): Date {
  const inicioHoje = inicioDoDiaPacificoUTC(agora);
  if (agora.getTime() < inicioHoje.getTime()) return inicioHoje;
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  return inicioDoDiaPacificoUTC(amanha);
}
