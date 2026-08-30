/**
 * Simulação financeira da proposta. Calcula somente com dados explícitos informados
 * pelo usuário — nenhuma premissa (tarifa, reajuste, degradação, custos de manutenção,
 * geração mensal) é inventada aqui. Tudo é parâmetro de entrada.
 */

export interface PremissasSimulacao {
  tarifaCentavosKwh: number;
  geracaoMensalKwh: number;
  consumoMedioMensalKwh: number;
  valorFinalCentavos: number;
  /** Reajuste anual da tarifa, em % (ex.: 8 = 8% a.a.). Opcional — 0 se não informado. */
  reajusteAnualPercentual?: number;
  /** Degradação anual dos módulos, em % (ex.: 0.5 = 0.5% a.a.). Opcional. */
  degradacaoAnualPercentual?: number;
  anosProjecao?: number;
}

export interface ResultadoSimulacao {
  economiaMensalCentavos: number;
  economiaPrimeiroAnoCentavos: number;
  paybackMeses: number | null;
  projecaoAnual: { ano: number; economiaAnualCentavos: number; economiaAcumuladaCentavos: number }[];
}

export function calcularEconomiaMensalCentavos(premissas: PremissasSimulacao): number {
  const energiaCompensadaKwh = Math.min(
    premissas.geracaoMensalKwh,
    premissas.consumoMedioMensalKwh
  );
  return Math.round(energiaCompensadaKwh * premissas.tarifaCentavosKwh);
}

export function calcularPaybackMeses(
  valorFinalCentavos: number,
  economiaMensalCentavos: number
): number | null {
  if (economiaMensalCentavos <= 0) return null;
  return Math.ceil(valorFinalCentavos / economiaMensalCentavos);
}

export function simular(premissas: PremissasSimulacao): ResultadoSimulacao {
  const economiaMensalCentavos = calcularEconomiaMensalCentavos(premissas);
  const economiaPrimeiroAnoCentavos = economiaMensalCentavos * 12;
  const paybackMeses = calcularPaybackMeses(
    premissas.valorFinalCentavos,
    economiaMensalCentavos
  );

  const anos = premissas.anosProjecao ?? 0;
  const reajuste = (premissas.reajusteAnualPercentual ?? 0) / 100;
  const degradacao = (premissas.degradacaoAnualPercentual ?? 0) / 100;

  const projecaoAnual: ResultadoSimulacao["projecaoAnual"] = [];
  let acumulado = 0;
  for (let ano = 1; ano <= anos; ano++) {
    const fatorTarifa = Math.pow(1 + reajuste, ano - 1);
    const fatorGeracao = Math.pow(1 - degradacao, ano - 1);
    const economiaAnualCentavos = Math.round(
      economiaPrimeiroAnoCentavos * fatorTarifa * fatorGeracao
    );
    acumulado += economiaAnualCentavos;
    projecaoAnual.push({
      ano,
      economiaAnualCentavos,
      economiaAcumuladaCentavos: acumulado,
    });
  }

  return {
    economiaMensalCentavos,
    economiaPrimeiroAnoCentavos,
    paybackMeses,
    projecaoAnual,
  };
}
