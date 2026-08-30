import { z } from "zod";

/**
 * Versão do schema de extração da fatura de energia. Incrementar sempre que a
 * forma do JSON mudar — usado no cache por hash do PDF junto com a versão do prompt.
 */
export const VERSAO_SCHEMA_FATURA = "1.0.0";

const historicoConsumoSchema = z.object({
  mesReferencia: z.string().nullable(), // "YYYY-MM"
  consumoKwh: z.number(),
});

export const faturaExtraidaSchema = z.object({
  concessionaria: z.string().nullable(),
  unidadeConsumidora: z.string().nullable(),
  nomeTitular: z.string().nullable(),
  endereco: z.string().nullable(),
  numero: z.string().nullable(),
  bairro: z.string().nullable(),
  cidade: z.string().nullable(),
  estado: z.string().nullable(),
  cep: z.string().nullable(),
  classificacao: z.enum(["residencial", "comercial", "industrial", "rural"]).nullable(),
  tipoLigacao: z.enum(["monofasica", "bifasica", "trifasica"]).nullable(),
  grupoTarifario: z.string().nullable(),
  mesReferencia: z.string().nullable(), // "YYYY-MM"
  dataEmissao: z.string().nullable(), // "YYYY-MM-DD"
  dataVencimento: z.string().nullable(),
  consumoMesKwh: z.number().nullable(),
  historicoConsumo: z.array(historicoConsumoSchema),
  valorTotalCentavos: z.number().int().nullable(),
  tarifaMediaCentavosKwh: z.number().int().nullable(),
  bandeiraTarifaria: z.string().nullable(),
  possuiGeracaoPropria: z.boolean(),
  observacoes: z.array(z.string()),
  alertas: z.array(z.string()),
});

export type FaturaExtraida = z.infer<typeof faturaExtraidaSchema>;
export type HistoricoConsumo = z.infer<typeof historicoConsumoSchema>;

/** JSON Schema equivalente usado no `responseSchema` do Gemini. */
export const GEMINI_RESPONSE_SCHEMA_FATURA = {
  type: "object",
  properties: {
    concessionaria: { type: ["string", "null"] },
    unidadeConsumidora: { type: ["string", "null"] },
    nomeTitular: { type: ["string", "null"] },
    endereco: { type: ["string", "null"] },
    numero: { type: ["string", "null"] },
    bairro: { type: ["string", "null"] },
    cidade: { type: ["string", "null"] },
    estado: { type: ["string", "null"], description: "Sigla UF, 2 letras" },
    cep: { type: ["string", "null"] },
    classificacao: { type: ["string", "null"], enum: ["residencial", "comercial", "industrial", "rural", null] },
    tipoLigacao: { type: ["string", "null"], enum: ["monofasica", "bifasica", "trifasica", null] },
    grupoTarifario: { type: ["string", "null"], description: "Ex.: B1, B2, B3" },
    mesReferencia: { type: ["string", "null"], description: "Formato YYYY-MM" },
    dataEmissao: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
    dataVencimento: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
    consumoMesKwh: { type: ["number", "null"] },
    historicoConsumo: {
      type: "array",
      description: "Histórico de consumo mensal mostrado no gráfico/tabela da fatura, um item por mês.",
      items: {
        type: "object",
        properties: {
          mesReferencia: { type: ["string", "null"], description: "Formato YYYY-MM" },
          consumoKwh: { type: "number" },
        },
        required: ["consumoKwh"],
      },
    },
    valorTotalCentavos: { type: ["integer", "null"] },
    tarifaMediaCentavosKwh: {
      type: ["integer", "null"],
      description: "Se não houver um valor unitário explícito na fatura, calcule valorTotalCentavos / consumoMesKwh.",
    },
    bandeiraTarifaria: { type: ["string", "null"] },
    possuiGeracaoPropria: {
      type: "boolean",
      description: "true se a fatura mostrar créditos de energia injetada/compensação (geração distribuída já instalada).",
    },
    observacoes: { type: "array", items: { type: "string" } },
    alertas: { type: "array", items: { type: "string" } },
  },
  required: ["historicoConsumo", "possuiGeracaoPropria", "observacoes", "alertas"],
} as const;
