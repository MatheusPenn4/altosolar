/**
 * Cálculos de potência do sistema fotovoltaico.
 * Potência é armazenada internamente em watts (Wp) — nunca em kWp — para evitar
 * arredondamentos em somas; a conversão para kWp é só de exibição.
 */

export interface ModuloFotovoltaico {
  quantidade: number;
  potenciaUnitariaW: number;
}

/**
 * Itens que têm potência unitária própria mas NÃO são módulos fotovoltaicos
 * (inversor, microinversor, otimizador, string box...). O campo "potência (W)"
 * no orçamento/proposta é preenchido para qualquer equipamento — sem essa
 * exclusão, a potência do inversor seria somada junto com a dos módulos.
 */
const PADRAO_NAO_MODULO = /invers|otimizador|string\s*box/i;

/** Um item conta para a potência do sistema (kWp) somente se for um módulo fotovoltaico. */
export function contaComoModuloFotovoltaico(descricao: string, potenciaUnitariaW: number | null | undefined): boolean {
  return !!potenciaUnitariaW && potenciaUnitariaW > 0 && !PADRAO_NAO_MODULO.test(descricao);
}

/** Soma quantidade × potência unitária de todos os módulos informados, em watts. */
export function calcularPotenciaTotalW(modulos: ModuloFotovoltaico[]): number {
  return modulos.reduce(
    (total, m) => total + m.quantidade * m.potenciaUnitariaW,
    0
  );
}

export function wattsParaKwp(watts: number): number {
  return watts / 1000;
}

export function kwpParaWatts(kwp: number): number {
  return Math.round(kwp * 1000);
}

export function formatarKwp(watts: number): string {
  return `${wattsParaKwp(watts).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kWp`;
}

/** Tolerância relativa (%) para considerar a potência do orçamento compatível com a calculada. */
export const TOLERANCIA_DIVERGENCIA_POTENCIA = 0.01; // 1%

export function divergePotencia(
  potenciaOrcamentoW: number,
  potenciaCalculadaW: number,
  tolerancia = TOLERANCIA_DIVERGENCIA_POTENCIA
): boolean {
  if (potenciaCalculadaW === 0) return potenciaOrcamentoW !== 0;
  const diferencaRelativa =
    Math.abs(potenciaOrcamentoW - potenciaCalculadaW) / potenciaCalculadaW;
  return diferencaRelativa > tolerancia;
}
