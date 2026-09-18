import { z } from "zod";

/**
 * Versão do schema de extração. Incrementar sempre que a forma do JSON mudar —
 * usado no cache por hash do PDF (um mesmo arquivo só reaproveita o resultado
 * se a versão do schema E do prompt forem as mesmas da análise anterior).
 */
export const VERSAO_SCHEMA_EXTRACAO = "1.0.0";

const itemOrcamentoSchema = z.object({
  descricao: z.string().min(1),
  codigo: z.string().nullable(),
  fabricante: z.string().nullable(),
  quantidade: z.number(),
  unidade: z.string().nullable(),
  potenciaUnitariaW: z.number().nullable(),
  paginaOrigem: z.number().int().nullable(),
  confianca: z.number().min(0).max(1),
});

const valoresOrcamentoSchema = z.object({
  produtosCentavos: z.number().int(),
  freteCentavos: z.number().int(),
  seguroCentavos: z.number().int(),
  icmsCentavos: z.number().int(),
  ipiCentavos: z.number().int(),
  stCentavos: z.number().int(),
  diferencialAliquotaCentavos: z.number().int(),
  totalCentavos: z.number().int(),
});

export const orcamentoExtraidoSchema = z.object({
  fornecedor: z.string().nullable(),
  numeroCotacao: z.string().nullable(),
  integrador: z.string().nullable(),
  clienteDestino: z.string().nullable(),
  emissao: z.string().nullable(),
  validade: z.string().nullable(),
  condicaoPagamento: z.string().nullable(),
  potenciaWp: z.number(),
  itens: z.array(itemOrcamentoSchema),
  valores: valoresOrcamentoSchema,
  observacoes: z.array(z.string()),
  alertas: z.array(z.string()),
});

export type OrcamentoExtraido = z.infer<typeof orcamentoExtraidoSchema>;
export type ItemOrcamentoExtraido = z.infer<typeof itemOrcamentoSchema>;

/**
 * JSON Schema equivalente, usado no `responseSchema` do Gemini (Structured Output).
 * Mantido em sincronia manualmente com `orcamentoExtraidoSchema` acima.
 */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    fornecedor: { type: ["string", "null"] },
    numeroCotacao: { type: ["string", "null"] },
    integrador: { type: ["string", "null"] },
    clienteDestino: { type: ["string", "null"] },
    emissao: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
    validade: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
    condicaoPagamento: { type: ["string", "null"] },
    potenciaWp: { type: "number" },
    itens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descricao: { type: "string" },
          codigo: { type: ["string", "null"] },
          fabricante: { type: ["string", "null"] },
          quantidade: { type: "number" },
          unidade: { type: ["string", "null"] },
          potenciaUnitariaW: { type: ["number", "null"] },
          paginaOrigem: { type: ["integer", "null"] },
          // minimum/maximum alinhados com orcamentoExtraidoSchema (z.number().min(0).max(1))
          // logo abaixo — sem isso o Gemini podia devolver um valor fora de 0-1, a
          // validação Zod falhava e o erro era tratado como "JSON malformado",
          // consumindo uma tentativa de retry à toa.
          confianca: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["descricao", "quantidade", "confianca"],
      },
    },
    valores: {
      type: "object",
      properties: {
        produtosCentavos: { type: "integer" },
        freteCentavos: { type: "integer" },
        seguroCentavos: { type: "integer" },
        icmsCentavos: { type: "integer" },
        ipiCentavos: { type: "integer" },
        stCentavos: { type: "integer" },
        diferencialAliquotaCentavos: { type: "integer" },
        totalCentavos: { type: "integer" },
      },
      required: [
        "produtosCentavos",
        "freteCentavos",
        "seguroCentavos",
        "icmsCentavos",
        "ipiCentavos",
        "stCentavos",
        "diferencialAliquotaCentavos",
        "totalCentavos",
      ],
    },
    observacoes: { type: "array", items: { type: "string" } },
    alertas: { type: "array", items: { type: "string" } },
  },
  required: ["potenciaWp", "itens", "valores", "observacoes", "alertas"],
} as const;
