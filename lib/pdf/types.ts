/**
 * Dados já resolvidos (sem lógica de negócio) para renderizar o PDF da proposta.
 * Todo cálculo (preço, potência, simulação) já deve ter sido feito antes — o
 * template de PDF apenas exibe.
 */
export interface EquipamentoPdf {
  descricao: string;
  fabricante: string | null;
  quantidade: number;
  unidade: string | null;
  potenciaUnitariaW: number | null;
}

export interface ServicoPdf {
  label: string;
  incluido: boolean;
}

export interface GarantiasPdf {
  instalacao?: string;
  modulos?: string;
  performance?: string;
  inversor?: string;
  microinversor?: string;
  outras?: string;
}

export interface FormaPagamentoPdf {
  tipo: "a_vista" | "entrada_parcelas" | "financiamento";
  descricao: string;
  valorEntradaCentavos?: number;
  numeroParcelas?: number;
  valorParcelaCentavos?: number;
  observacoes?: string;
}

export interface ProjecaoAnualPdf {
  ano: number;
  economiaAnualCentavos: number;
  economiaAcumuladaCentavos: number;
}

export interface PropostaPdfData {
  codigo: string;
  versao: number;
  geradoEmISO: string;

  cliente: {
    nome: string;
    cidade: string | null;
    estado: string | null;
  };

  vendedor: {
    nome: string;
    telefone: string | null;
    email: string | null;
  };

  empresa: {
    nomeFantasia: string;
    razaoSocial: string | null;
    cnpj: string | null;
    endereco: string | null;
    telefone: string | null;
    whatsapp: string | null;
    email: string | null;
    textoInstitucional: string | null;
    logoDataUrl: string | null;
  };

  projeto: {
    potenciaWp: number;
    consumoMedioKwh: number;
    geracaoMensalKwh: number;
    geracaoAnualKwh: number;
    areaUtilM2: number | null;
    percentualCompensacao: number | null;
    tipoInstalacao: string;
    tipoCobertura: string | null;
  };

  equipamentos: EquipamentoPdf[];
  servicos: ServicoPdf[];
  garantias: GarantiasPdf;
  diferenciais: string[];

  simulacao: {
    economiaMensalCentavos: number;
    economiaPrimeiroAnoCentavos: number;
    paybackMeses: number | null;
    projecaoAnual: ProjecaoAnualPdf[];
    premissas: {
      tarifaCentavosKwh: number;
      reajusteAnualPercentual?: number;
      degradacaoAnualPercentual?: number;
    };
  };

  investimento: {
    valorFinalCentavos: number;
    formasPagamento: FormaPagamentoPdf[];
  };

  condicoes: {
    validade: string;
    prazoEstimadoDias: number | null;
    itensIncluidos: string[];
    itensNaoIncluidos: string[];
    responsabilidadesCliente: string[];
    observacoesComerciais: string | null;
  };
}
