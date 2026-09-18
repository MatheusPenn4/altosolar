/**
 * Textos e mapeamentos fixos do template de proposta — copy institucional da Alto Solar
 * (como funciona a energia solar, diferenciais, etapas do projeto). Não vem do cliente
 * nem do orçamento: é decidido aqui, no servidor, igual para toda proposta real.
 */
import { BENEFITS } from "@/lib/constants";
import type { ProposalTemplateAssets } from "./tipos";

export const ASSETS_TEMPLATE: ProposalTemplateAssets = {
  logo: "assets/logo/alto-solar-logo.png",
  backgrounds: [
    "assets/backgrounds/alto-solar-template-p01-capa.png",
    "assets/backgrounds/alto-solar-template-p02-solucao.png",
    "assets/backgrounds/alto-solar-template-p03-projeto.png",
    "assets/backgrounds/alto-solar-template-p04-qualidade.png",
    "assets/backgrounds/alto-solar-template-p05-investimento.png",
    "assets/backgrounds/alto-solar-template-p06-condicoes.png",
  ],
};

export const TIMELINE_ICONS_PAGINA_6 = [
  { label: "Aceite", icon: "accept" as const },
  { label: "Validação técnica", icon: "validation" as const },
  { label: "Projeto", icon: "project" as const },
  { label: "Instalação", icon: "installation" as const },
  { label: "Ativação", icon: "activation" as const },
];

export const ETAPAS_PROJETO_PAGINA_4 = [
  "Análise",
  "Projeto",
  "Homologação",
  "Instalação",
  "Ativação",
  "Acompanhamento",
];

export const FLUXO_ENERGIA_PAGINA_2 = [
  { number: "1", label: "Captação solar" },
  { number: "2", label: "Conversão pelo inversor" },
  { number: "3", label: "Distribuição da energia" },
  { number: "4", label: "Compensação do excedente" },
  { number: "5", label: "Acompanhamento da geração" },
];

export const BENEFICIOS_PAGINA_2 = [
  { title: "Mais economia", text: "Redução consistente da despesa com energia." },
  { title: "Proteção tarifária", text: "Menor exposição aos reajustes de energia." },
  { title: "Energia sustentável", text: "Geração limpa e renovável no próprio local." },
  { title: "Valorização do imóvel", text: "Infraestrutura moderna e eficiente." },
  { title: "Suporte especializado", text: "Acompanhamento antes, durante e após a entrega." },
];

export const CARDS_INFERIORES_PAGINA_2 = [
  {
    title: "Do projeto à ativação",
    text: "Uma equipe acompanha cada etapa para garantir organização, segurança e clareza durante todo o processo.",
  },
  {
    title: "Energia para o futuro",
    text: "Produza sua própria energia e reduza a exposição aos constantes aumentos da tarifa elétrica.",
  },
];

/** Diferenciais da página 4 — reaproveita os mesmos textos da landing page. */
export const DIFERENCIAIS_PAGINA_4 = BENEFITS.slice(0, 8).map((b) => b.title);

export const CONDICOES_IMPORTANTES_PAGINA_6 =
  "O dimensionamento definitivo está sujeito à validação técnica do local. Adequações civis, reforços estruturais, alterações no padrão de entrada ou serviços não descritos deverão ser avaliados separadamente. Os prazos podem variar conforme concessionária, disponibilidade dos equipamentos e condições climáticas.";

export const TEXTO_INSTITUCIONAL_PADRAO =
  "A Alto Solar desenvolve soluções fotovoltaicas dimensionadas para as necessidades de cada cliente. Cuidamos de todas as etapas, da análise inicial à ativação do sistema, com atendimento próximo, transparência e compromisso com qualidade.";

export const NOTA_GERACAO_PADRAO =
  "A geração apresentada é uma estimativa e pode variar conforme incidência solar, orientação, inclinação, sombreamento, temperatura, condições climáticas e características do local de instalação.";

export const NOTA_FINANCEIRA_PADRAO =
  "Os resultados financeiros são estimativas baseadas nas premissas apresentadas. A economia efetiva poderá variar conforme consumo, tarifa, regras de compensação, disponibilidade solar e desempenho real do sistema.";

export const LABELS_TIPO_INSTALACAO: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
  rural: "Rural",
};

export const LABELS_TIPO_COBERTURA: Record<string, string> = {
  ceramica: "Telhado cerâmico",
  fibrocimento: "Telhado de fibrocimento",
  metalica: "Telhado metálico",
  laje: "Laje",
  solo: "Solo",
  outra: "Cobertura personalizada",
};
