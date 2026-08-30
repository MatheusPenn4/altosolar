/**
 * Numeração de propostas: `AS-{ano}-{sequencial com 4 dígitos}`, ex.: AS-2026-0001.
 * O sequencial reinicia a cada ano civil. A busca do último sequencial usado é feita
 * no banco (fora deste módulo); esta função é pura para facilitar testes.
 */
export function gerarCodigoProposta(ano: number, ultimoSequencialDoAno: number): string {
  const proximoSequencial = ultimoSequencialDoAno + 1;
  const sequencialFormatado = String(proximoSequencial).padStart(4, "0");
  return `AS-${ano}-${sequencialFormatado}`;
}

export function extrairAnoESequencial(codigo: string): { ano: number; sequencial: number } | null {
  const match = codigo.match(/^AS-(\d{4})-(\d{4,})$/);
  if (!match) return null;
  return { ano: Number(match[1]), sequencial: Number(match[2]) };
}

/** Próximo número de versão de uma proposta (1 se ainda não houver versões). */
export function proximaVersao(versoesExistentes: number[]): number {
  if (versoesExistentes.length === 0) return 1;
  return Math.max(...versoesExistentes) + 1;
}
