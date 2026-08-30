/**
 * Formação de preço da proposta. Todos os valores em centavos inteiros.
 *
 * Regra: por padrão, valor final de venda = valor total extraído do orçamento da fábrica.
 * O usuário pode sobrescrever esse valor (override), mas o valor original permanece
 * visível apenas internamente, nunca no PDF entregue ao cliente.
 */

export interface ComposicaoPreco {
  valorFabricaCentavos: number;
  custosAdicionaisCentavos: number;
  descontoCentavos: number;
  /** Quando null, o valor final é o padrão (fábrica + custos - desconto). */
  valorFinalManualCentavos: number | null;
}

export interface ResultadoPreco {
  custoTotalCentavos: number;
  valorFinalCentavos: number;
  diferencaCentavos: number;
  lucroBrutoCentavos: number;
  margemPercentual: number;
  abaixoDoCusto: boolean;
}

export function valorFinalPadraoCentavos(
  composicao: Pick<
    ComposicaoPreco,
    "valorFabricaCentavos" | "custosAdicionaisCentavos" | "descontoCentavos"
  >
): number {
  return (
    composicao.valorFabricaCentavos +
    composicao.custosAdicionaisCentavos -
    composicao.descontoCentavos
  );
}

export function calcularPreco(composicao: ComposicaoPreco): ResultadoPreco {
  const custoTotalCentavos =
    composicao.valorFabricaCentavos + composicao.custosAdicionaisCentavos;

  const valorFinalCentavos =
    composicao.valorFinalManualCentavos ?? valorFinalPadraoCentavos(composicao);

  const lucroBrutoCentavos = valorFinalCentavos - custoTotalCentavos;
  const margemPercentual =
    valorFinalCentavos === 0 ? 0 : (lucroBrutoCentavos / valorFinalCentavos) * 100;

  return {
    custoTotalCentavos,
    valorFinalCentavos,
    diferencaCentavos: valorFinalCentavos - composicao.valorFabricaCentavos,
    lucroBrutoCentavos,
    margemPercentual,
    abaixoDoCusto: valorFinalCentavos < custoTotalCentavos,
  };
}

export interface AlteracaoManualPreco {
  usuarioId: string;
  dataISO: string;
  valorAnteriorCentavos: number;
  valorNovoCentavos: number;
  motivo: string;
}

export function validarAlteracaoManual(
  motivo: string,
  valorNovoCentavos: number
): string[] {
  const erros: string[] = [];
  if (!motivo || motivo.trim().length < 5) {
    erros.push("Informe uma justificativa com pelo menos 5 caracteres.");
  }
  if (valorNovoCentavos <= 0) {
    erros.push("O valor final deve ser maior que zero.");
  }
  return erros;
}
