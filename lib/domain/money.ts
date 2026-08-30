/**
 * Todo valor monetário do sistema é armazenado e calculado em CENTAVOS (inteiro).
 * Nunca usar `float` para dinheiro — evita erros de arredondamento em somas de orçamento.
 */

export function centavosParaBRL(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/**
 * Converte uma string de moeda brasileira (ex.: "R$ 26.002,78", "26.002,78", "1.234,5")
 * para centavos inteiros. Aceita separador de milhar "." e decimal ",".
 */
export function brlParaCentavos(valor: string | number): number {
  if (typeof valor === "number") {
    return Math.round(valor * 100);
  }

  const original = valor.trim();
  const limpo = original
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // remove separador de milhar
    .replace(",", ".");

  if (original === "") return 0;
  if (limpo === "" || limpo === "-") {
    throw new Error(`Valor monetário inválido: "${valor}"`);
  }

  const numero = Number(limpo);
  if (Number.isNaN(numero)) {
    throw new Error(`Valor monetário inválido: "${valor}"`);
  }

  return Math.round(numero * 100);
}

export function somarCentavos(...valores: number[]): number {
  return valores.reduce((total, valor) => total + Math.round(valor || 0), 0);
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}
