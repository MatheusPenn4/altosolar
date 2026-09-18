import type { ZodType } from "zod";
import { classificarErro, erroDeParsing, MENSAGENS_USUARIO } from "./erros";
import type { AdaptadorProvedor } from "./provedores/tipos";
import type { ConfiguracaoProvedorResolvida, ErroClassificado, ProviderIA, ResultadoAnaliseIA } from "./tipos";

/** Tetos absolutos — nunca confiamos cegamente no que está salvo em app_settings
 * para limitar tentativas/custo, mesmo que o valor no banco tenha sido alterado. */
const TETO_MAX_TENTATIVAS_POR_PROVIDER = 3;
const TETO_MAX_FALLBACKS = 5;
const BACKOFF_BASE_MS = 600;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RegistroTentativa {
  config: ConfiguracaoProvedorResolvida;
  tentativa: number;
  ehFallback: boolean;
  duracaoMs: number;
  resultado: "sucesso" | "erro";
  erro?: ErroClassificado;
}

export interface OpcoesAnaliseDocumento<T> {
  configuracoes: ConfiguracaoProvedorResolvida[];
  obterAdaptador: (provider: ProviderIA) => AdaptadorProvedor;
  prompt: string;
  responseSchema: object;
  zodSchema: ZodType<T>;
  pdfBuffer: Buffer;
  mimeType?: string;
  maxTentativasPorProvider: number;
  maxFallbacks: number;
  timeoutMs: number;
  /** Prazo absoluto (Date.now() + margem) para não estourar o maxDuration da
   * rota Vercel — nenhuma tentativa nova começa depois disso. */
  prazoFinalMs: number;
  aoTentar?: (registro: RegistroTentativa) => void | Promise<void>;
}

/**
 * AI Manager: seleciona a configuração de maior prioridade disponível, chama
 * o adaptador do provider, classifica qualquer erro e decide entre repetir a
 * mesma configuração, cair para a próxima, ou desistir sem tentar outra —
 * conforme a categoria do erro (ver a tabela no plano/README). Não conhece
 * Supabase nem o SDK do Gemini diretamente — só recebe as configurações já
 * resolvidas e um adaptador por provider, o que permite testar toda a lógica
 * de fallback sem rede nem banco.
 */
export async function analisarDocumento<T>(opts: OpcoesAnaliseDocumento<T>): Promise<ResultadoAnaliseIA<T>> {
  const inicio = Date.now();
  const maxTentativas = Math.max(1, Math.min(opts.maxTentativasPorProvider, TETO_MAX_TENTATIVAS_POR_PROVIDER));
  const maxFallbacks = Math.max(1, Math.min(opts.maxFallbacks, TETO_MAX_FALLBACKS));
  const mimeType = opts.mimeType ?? "application/pdf";

  if (opts.configuracoes.length === 0) {
    return {
      sucesso: false,
      dados: null,
      erroUsuario: "Nenhuma integração de IA está disponível no momento. Use o preenchimento manual.",
      modelo: null,
      providerConfigId: null,
      duracaoMs: Date.now() - inicio,
    };
  }

  let ultimoErro: ErroClassificado | null = null;
  let ultimaConfigTentada: ConfiguracaoProvedorResolvida | null = null;
  let providersTentados = 0;

  for (const config of opts.configuracoes) {
    if (providersTentados >= maxFallbacks) break;
    if (Date.now() >= opts.prazoFinalMs) break;
    providersTentados++;
    ultimaConfigTentada = config;
    const ehFallback = providersTentados > 1;
    const adaptador = opts.obterAdaptador(config.provider);

    let tentativa = 1;
    while (tentativa <= maxTentativas) {
      const tempoRestante = opts.prazoFinalMs - Date.now();
      if (tempoRestante <= 1000) break; // sem tempo hábil para mais uma tentativa

      const t0 = Date.now();
      try {
        const { texto } = await adaptador.gerarJSON({
          apiKey: config.apiKey,
          modelo: config.modelo,
          prompt: opts.prompt,
          pdfBuffer: opts.pdfBuffer,
          mimeType,
          responseSchema: opts.responseSchema,
          timeoutMs: Math.min(opts.timeoutMs, tempoRestante),
        });

        let json: unknown;
        try {
          json = JSON.parse(texto);
        } catch {
          const erro = erroDeParsing("Resposta do provider não é um JSON válido.");
          ultimoErro = erro;
          await opts.aoTentar?.({ config, tentativa, ehFallback, duracaoMs: Date.now() - t0, resultado: "erro", erro });
          if (tentativa < maxTentativas) {
            tentativa++;
            continue;
          }
          break;
        }

        const validado = opts.zodSchema.safeParse(json);

        if (!validado.success) {
          const erro = erroDeParsing(`Resposta não passou na validação do schema: ${validado.error.message}`);
          ultimoErro = erro;
          await opts.aoTentar?.({
            config,
            tentativa,
            ehFallback,
            duracaoMs: Date.now() - t0,
            resultado: "erro",
            erro,
          });
          if (tentativa < maxTentativas) {
            tentativa++;
            continue;
          }
          break; // esgotou tentativas nesta config — cai pra próxima do for
        }

        await opts.aoTentar?.({ config, tentativa, ehFallback, duracaoMs: Date.now() - t0, resultado: "sucesso" });

        return {
          sucesso: true,
          dados: validado.data,
          erroUsuario: null,
          modelo: config.modelo,
          providerConfigId: config.id,
          duracaoMs: Date.now() - inicio,
        };
      } catch (erroBruto) {
        const erro = classificarErro(erroBruto);
        ultimoErro = erro;
        await opts.aoTentar?.({ config, tentativa, ehFallback, duracaoMs: Date.now() - t0, resultado: "erro", erro });

        if (erro.categoria === "entrada_invalida") {
          // O problema é o documento/request, não o provider — outro
          // provider tenderia a falhar do mesmo jeito. Não faz fallback.
          return {
            sucesso: false,
            dados: null,
            erroUsuario: MENSAGENS_USUARIO.entrada_invalida,
            modelo: null,
            providerConfigId: config.id,
            duracaoMs: Date.now() - inicio,
          };
        }

        if (erro.categoria === "credencial" || erro.categoria === "quota") {
          // Sem valor em repetir na mesma config: chave inválida não fica
          // válida numa segunda tentativa, e cota esgotada não libera em
          // 600ms. Cai direto para a próxima config, sem esperar.
          break;
        }

        // transitorio | parsing | desconhecido: vale repetir a mesma config.
        if (tentativa < maxTentativas) {
          if (erro.categoria === "transitorio") await aguardar(BACKOFF_BASE_MS * tentativa);
          tentativa++;
          continue;
        }
        break; // esgotou tentativas — cai pra próxima config
      }
    }
  }

  return {
    sucesso: false,
    dados: null,
    erroUsuario: MENSAGENS_USUARIO[ultimoErro?.categoria ?? "desconhecido"],
    modelo: ultimaConfigTentada?.modelo ?? null,
    providerConfigId: ultimaConfigTentada?.id ?? null,
    duracaoMs: Date.now() - inicio,
  };
}
