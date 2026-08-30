export type StatusProposta =
  | "draft"
  | "ready"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "archived";

export const STATUS_PROPOSTA_LABEL: Record<StatusProposta, string> = {
  draft: "Rascunho",
  ready: "Pronta",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
  archived: "Arquivada",
};

export type TipoPessoa = "fisica" | "juridica";

export type ExtractionStatus = "pending" | "processing" | "success" | "failed" | "manual";

import type { Equipamento, FormaPagamento } from "@/lib/schemas/proposta";

interface ServicoWizardTipo {
  chave: string;
  label: string;
  incluido: boolean;
}

/** Formato armazenado em proposals.technical_data (jsonb). */
export interface TechnicalDataProposta {
  tipoInstalacao: string;
  tipoLigacao: string;
  consumoUltimos12Meses: number[] | null;
  percentualCompensacao: number | null;
  tipoCobertura: string | null;
  observacoesTecnicas: string | null;
  potenciaCalculadaW: number;
  potenciaDiverge: boolean;
  justificativaDivergenciaPotencia: string | null;
  equipamentos: Equipamento[];
  servicos: ServicoWizardTipo[];
  custosAdicionais: { descricao: string; valorCentavos: number }[];
  responsabilidadesCliente?: string[];
}

/** Formato armazenado em proposals.payment_conditions (jsonb). */
export interface PaymentConditionsProposta {
  formasPagamento: FormaPagamento[];
  prazoEstimadoDias: number | null;
  observacoesComerciais?: string;
}

/** Formato armazenado em proposals.simulation_data (jsonb). */
export interface SimulationDataProposta {
  premissas: {
    reajusteAnualPercentual?: number;
    degradacaoAnualPercentual?: number;
    anosProjecao?: number;
  };
  resultado: {
    economiaMensalCentavos: number;
    economiaPrimeiroAnoCentavos: number;
    paybackMeses: number | null;
    projecaoAnual: { ano: number; economiaAnualCentavos: number; economiaAcumuladaCentavos: number }[];
  };
}
