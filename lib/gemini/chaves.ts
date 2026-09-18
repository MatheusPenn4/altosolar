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

/**
 * Erros transitórios de infraestrutura do Google (modelo sobrecarregado,
 * indisponibilidade momentânea, falha de rede) — não são causados pela chave
 * usada nem pelo conteúdo enviado, e costumam se resolver em uma nova
 * tentativa após um pequeno atraso.
 */
export function pareceErroTransitorio(mensagemErro: string): boolean {
  return /UNAVAILABLE|"code"\s*:\s*50[0-9]|overloaded|internal error|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(
    mensagemErro
  );
}
