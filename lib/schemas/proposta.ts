import { z } from "zod";

export const TIPOS_INSTALACAO = ["residencial", "comercial", "industrial", "rural"] as const;
export const TIPOS_LIGACAO = ["monofasica", "bifasica", "trifasica"] as const;
export const TIPOS_COBERTURA = [
  "ceramica", "fibrocimento", "metalica", "laje", "solo", "outra",
] as const;

export const dadosTecnicosSchema = z.object({
  tipoInstalacao: z.enum(TIPOS_INSTALACAO),
  tipoLigacao: z.enum(TIPOS_LIGACAO),
  consumoMedioKwh: z.number().positive("Informe o consumo médio mensal."),
  consumoUltimos12Meses: z.array(z.number().nonnegative()).length(12).optional().nullable(),
  tarifaCentavosKwh: z.number().positive("Informe a tarifa utilizada no cálculo."),
  potenciaPropostaW: z.number().positive("Informe a potência proposta."),
  geracaoMensalKwh: z.number().positive("Informe a geração mensal estimada."),
  geracaoAnualKwh: z.number().positive("Informe a geração anual estimada."),
  areaUtilM2: z.number().positive().optional().nullable(),
  percentualCompensacao: z.number().min(0).max(200).optional().nullable(),
  tipoCobertura: z.enum(TIPOS_COBERTURA).optional().nullable(),
  observacoesTecnicas: z.string().optional(),
  vendedorId: z.string().uuid().optional().nullable(),
  potenciaOrcamentoDivergente: z.boolean().optional(),
  justificativaDivergenciaPotencia: z.string().optional(),
});
export type DadosTecnicos = z.infer<typeof dadosTecnicosSchema>;

export const SERVICOS_PADRAO = [
  "instalacao",
  "projeto_eletrico",
  "homologacao",
  "estrutura_fixacao",
  "protecoes_eletricas",
  "configuracao_sistema",
  "monitoramento",
  "treinamento_cliente",
] as const;

export const servicoSchema = z.object({
  chave: z.string(),
  label: z.string(),
  incluido: z.boolean(),
});

export const garantiasSchema = z.object({
  instalacao: z.string().optional(),
  modulos: z.string().optional(),
  performance: z.string().optional(),
  inversor: z.string().optional(),
  microinversor: z.string().optional(),
  outras: z.string().optional(),
});
export type Garantias = z.infer<typeof garantiasSchema>;

export const custoAdicionalSchema = z.object({
  descricao: z.string().min(1),
  valorCentavos: z.number().int().nonnegative(),
});
export type CustoAdicional = z.infer<typeof custoAdicionalSchema>;

export const formaPagamentoSchema = z.object({
  tipo: z.enum(["a_vista", "entrada_parcelas", "financiamento"]),
  descricao: z.string().min(1),
  valorEntradaCentavos: z.number().int().nonnegative().optional(),
  numeroParcelas: z.number().int().nonnegative().optional(),
  valorParcelaCentavos: z.number().int().nonnegative().optional(),
  observacoes: z.string().optional(),
});
export type FormaPagamento = z.infer<typeof formaPagamentoSchema>;

export const condicoesComerciaisSchema = z.object({
  formasPagamento: z.array(formaPagamentoSchema).min(1, "Adicione ao menos uma forma de pagamento."),
  prazoEstimadoDias: z.number().int().positive().optional().nullable(),
  validadeDias: z.number().int().positive(),
  itensIncluidos: z.array(z.string()),
  itensNaoIncluidos: z.array(z.string()),
  responsabilidadesCliente: z.array(z.string()),
  observacoesComerciais: z.string().optional(),
});
export type CondicoesComerciais = z.infer<typeof condicoesComerciaisSchema>;

export const premissasFinanceirasSchema = z.object({
  reajusteAnualPercentual: z.number().min(0).max(100).optional(),
  degradacaoAnualPercentual: z.number().min(0).max(10).optional(),
  anosProjecao: z.number().int().min(0).max(25).optional(),
});
export type PremissasFinanceiras = z.infer<typeof premissasFinanceirasSchema>;

export const equipamentoSchema = z.object({
  descricao: z.string().min(1),
  codigo: z.string().nullable().optional(),
  fabricante: z.string().nullable().optional(),
  quantidade: z.number(),
  unidade: z.string().nullable().optional(),
  potenciaUnitariaW: z.number().nullable().optional(),
});
export type Equipamento = z.infer<typeof equipamentoSchema>;

export const precificacaoInputSchema = z.object({
  valorFabricaCentavos: z.number().int().nonnegative(),
  custosAdicionais: z.array(custoAdicionalSchema),
  descontoCentavos: z.number().int().nonnegative(),
  valorFinalManualCentavos: z.number().int().positive().nullable(),
  motivoAlteracao: z.string().optional(),
});
export type PrecificacaoInput = z.infer<typeof precificacaoInputSchema>;

export const criarPropostaSchema = z.object({
  clientId: z.string().uuid(),
  factoryQuoteId: z.string().uuid().nullable(),
  equipamentos: z.array(equipamentoSchema),
  servicos: z.array(servicoSchema),
  garantias: garantiasSchema,
  dadosTecnicos: dadosTecnicosSchema,
  precificacao: precificacaoInputSchema,
  condicoesComerciais: condicoesComerciaisSchema,
  premissasFinanceiras: premissasFinanceirasSchema,
  notas: z.string().optional(),
});
export type CriarPropostaInput = z.infer<typeof criarPropostaSchema>;
