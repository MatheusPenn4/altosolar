import type { OrcamentoExtraido } from "@/lib/gemini/schema";
import type {
  CondicoesComerciais,
  DadosTecnicos,
  Equipamento,
  Garantias,
  PremissasFinanceiras,
} from "@/lib/schemas/proposta";
import { SERVICOS_PADRAO } from "@/lib/schemas/proposta";

export interface ClienteResumo {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  cidade: string | null;
  tipo_pessoa: "fisica" | "juridica";
}

export interface ServicoWizard {
  chave: string;
  label: string;
  incluido: boolean;
}

export interface EstadoWizard {
  etapaAtual: number;

  // Etapa 1-2
  factoryQuoteId: string | null;
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  orcamento: OrcamentoExtraido | null;
  alertasOrcamento: { campo: string; mensagem: string; severidade: "erro" | "aviso" }[];
  modoManual: boolean;

  // Etapa 3
  clienteSelecionado: ClienteResumo | null;

  // Etapa 4
  dadosTecnicos: Partial<DadosTecnicos>;

  // Etapa 5
  equipamentos: Equipamento[];
  servicos: ServicoWizard[];
  garantias: Garantias;

  // Etapa 6
  custosAdicionais: { descricao: string; valorCentavos: number }[];
  descontoCentavos: number;
  valorFinalManualCentavos: number | null;
  motivoAlteracao: string;

  // Etapa 7
  condicoesComerciais: Partial<CondicoesComerciais>;

  // Etapa 8
  premissasFinanceiras: PremissasFinanceiras;

  notas: string;
}

export const LABEL_SERVICO: Record<string, string> = {
  instalacao: "Instalação",
  projeto_eletrico: "Projeto elétrico",
  homologacao: "Homologação junto à concessionária",
  estrutura_fixacao: "Estrutura de fixação",
  protecoes_eletricas: "Proteções elétricas",
  configuracao_sistema: "Configuração do sistema",
  monitoramento: "Monitoramento",
  treinamento_cliente: "Treinamento do cliente",
};

export function estadoInicial(): EstadoWizard {
  return {
    etapaAtual: 1,
    factoryQuoteId: null,
    arquivoNome: null,
    arquivoTamanho: null,
    orcamento: null,
    alertasOrcamento: [],
    modoManual: false,
    clienteSelecionado: null,
    dadosTecnicos: { tipoInstalacao: "residencial", tipoLigacao: "monofasica" },
    equipamentos: [],
    servicos: SERVICOS_PADRAO.map((chave) => ({ chave, label: LABEL_SERVICO[chave], incluido: true })),
    garantias: {},
    custosAdicionais: [],
    descontoCentavos: 0,
    valorFinalManualCentavos: null,
    motivoAlteracao: "",
    condicoesComerciais: {
      formasPagamento: [],
      validadeDias: 7,
      itensIncluidos: [],
      itensNaoIncluidos: [],
      responsabilidadesCliente: [],
    },
    premissasFinanceiras: { reajusteAnualPercentual: 8, degradacaoAnualPercentual: 0.5, anosProjecao: 25 },
    notas: "",
  };
}

export const CHAVE_RASCUNHO = "alto-solar:proposta-rascunho";

export const NOMES_ETAPAS = [
  "Orçamento",
  "Conferência",
  "Cliente",
  "Projeto",
  "Equipamentos",
  "Preço",
  "Condições",
  "Simulação",
  "Revisão",
];
