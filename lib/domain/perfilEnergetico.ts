import type { FaturaExtraida } from "@/lib/gemini/fatura/schema";

/**
 * Perfil energético derivado de uma fatura de energia extraída — usado tanto
 * para preencher a etapa de Projeto da proposta quanto para persistir no
 * cadastro do cliente (para reaproveitar em propostas futuras).
 */
export interface PerfilEnergeticoCliente {
  tipoInstalacao: string | null;
  tipoLigacao: string | null;
  consumoMedioKwh: number | null;
  /** Do mês mais antigo para o mais recente — sempre 12 posições quando presente. */
  consumoUltimos12Meses: number[] | null;
  tarifaCentavosKwh: number | null;
}

export function calcularPerfilEnergetico(fatura: FaturaExtraida): PerfilEnergeticoCliente {
  const consumosValidos = fatura.historicoConsumo.map((h) => h.consumoKwh).filter((v) => v > 0);
  const consumoMedioKwh =
    consumosValidos.length > 0
      ? Math.round(consumosValidos.reduce((total, v) => total + v, 0) / consumosValidos.length)
      : fatura.consumoMesKwh ?? null;

  let consumoUltimos12Meses: number[] | null = null;
  if (fatura.historicoConsumo.length >= 12) {
    // A fatura costuma trazer o mês atual + os 12 anteriores (13 no total).
    // Ordena do mais antigo para o mais recente e fica só com os últimos 12.
    const ordenado = [...fatura.historicoConsumo].sort((a, b) =>
      (a.mesReferencia ?? "").localeCompare(b.mesReferencia ?? "")
    );
    consumoUltimos12Meses = ordenado.slice(-12).map((h) => h.consumoKwh);
  }

  return {
    tipoInstalacao: fatura.classificacao,
    tipoLigacao: fatura.tipoLigacao,
    consumoMedioKwh,
    consumoUltimos12Meses,
    tarifaCentavosKwh: fatura.tarifaMediaCentavosKwh,
  };
}
