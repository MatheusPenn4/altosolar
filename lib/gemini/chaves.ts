/**
 * Suporta várias chaves da API do Gemini (ex.: de contas Google gratuitas
 * diferentes) para dar fallback automático quando uma delas esgota a cota
 * diária. `GEMINI_API_KEYS` tem prioridade — lista separada por vírgula.
 * Se não estiver definida, cai para a única `GEMINI_API_KEY`.
 */
export function obterChavesGemini(): string[] {
  const lista = process.env.GEMINI_API_KEYS;
  if (lista) {
    const chaves = lista
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (chaves.length > 0) return chaves;
  }

  const unica = process.env.GEMINI_API_KEY;
  return unica ? [unica] : [];
}

/** Erros que indicam que a chave atual esgotou a cota — vale a pena tentar a próxima. */
export function pareceEsgotamentoDeCota(mensagemErro: string): boolean {
  return /RESOURCE_EXHAUSTED|429|quota\s*exceeded/i.test(mensagemErro);
}
