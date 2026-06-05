export const COMPANY = {
  name: "Alto Solar",
  legalName: "Alto Solar Energia Fotovoltaica",
  // Número oficial (formato internacional, só dígitos)
  whatsappNumber: "5565984468196",
  phoneDisplay: "(65) 98446-8196",
  phoneTel: "+5565984468196",
  email: "contato@altosolar.com.br",
  address: "Cuiabá - Mato Grosso, Brasil",
  // [PREENCHER] dados oficiais para credibilidade/SEO
  addressFull: "Av. [Rua e número], Bairro, Cuiabá - MT, CEP 00000-000",
  cnpj: "00.000.000/0001-00",
  crea: "CREA-MT 69778434115",
  art: "ART registrada para cada projeto",
  geo: { lat: -15.601411, lng: -56.097892 }, // Cuiabá - MT
  openingHours: "Mo-Fr 08:00-18:00, Sa 08:00-12:00",
  defaultWhatsappMessage:
    "Olá, Alto Solar! Quero saber mais sobre energia solar. Pode me ajudar?",
  social: {
    instagram: "https://instagram.com/altosolar",
    facebook: "https://facebook.com/altosolar",
    // [PREENCHER] link real do perfil do Google Business
    googleBusiness: "https://g.page/altosolar",
    googleReviews: "https://g.page/altosolar",
  },
  rating: { value: "5,0", count: "120" },
  url: "https://www.altosolar.com.br",
};

export const NAV = [
  { label: "Início", href: "#inicio" },
  { label: "Soluções", href: "#beneficios" },
  { label: "Resultados", href: "#resultados" },
  { label: "Projetos", href: "#projetos" },
  { label: "Economia", href: "#calculadora" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export const HERO_CARDS = [
  { value: "+500", label: "Sistemas Instalados" },
  { value: "Até 95%", label: "de Economia" },
  { value: "Equipe", label: "Própria de Instalação" },
  { value: "Financiamento", label: "Facilitado" },
];

export const CITIES = [
  { name: "Cuiabá", x: 47, y: 62 },
  { name: "Várzea Grande", x: 44, y: 64 },
  { name: "Chapada dos Guimarães", x: 52, y: 58 },
  { name: "Santo Antônio de Leverger", x: 48, y: 70 },
  { name: "Campo Verde", x: 58, y: 68 },
  { name: "Tangará da Serra", x: 30, y: 55 },
];

export const STATS = [
  { value: 500, suffix: "+", label: "Sistemas Instalados" },
  { value: 30, prefix: "R$ ", suffix: "Mi+", label: "Economizados pelos Clientes" },
  { value: 25, suffix: " Anos", label: "Garantia dos Equipamentos" },
  { value: 95, suffix: "%", label: "de Economia Possível" },
];

export const BENEFITS = [
  {
    icon: "Zap",
    title: "Economia Imediata",
    desc: "Reduza sua conta de luz já no primeiro mês após a instalação.",
  },
  {
    icon: "ShieldCheck",
    title: "Proteção Contra Reajustes",
    desc: "Blinde seu orçamento dos aumentos anuais da tarifa de energia.",
  },
  {
    icon: "TrendingUp",
    title: "Valorização do Imóvel",
    desc: "Imóveis com energia solar valorizam e vendem mais rápido.",
  },
  {
    icon: "Leaf",
    title: "Energia Limpa",
    desc: "Energia 100% renovável, sustentável e livre de poluição.",
  },
  {
    icon: "PiggyBank",
    title: "Retorno Financeiro",
    desc: "O investimento se paga e depois é só lucro por décadas.",
  },
  {
    icon: "BadgeCheck",
    title: "Garantia de Longo Prazo",
    desc: "Equipamentos com até 25 anos de garantia de performance.",
  },
  {
    icon: "MonitorSmartphone",
    title: "Monitoramento Online",
    desc: "Acompanhe a geração de energia em tempo real pelo celular.",
  },
  {
    icon: "Landmark",
    title: "Financiamento Facilitado",
    desc: "Parcelas que cabem no valor que você já paga de energia.",
  },
];

export const STEPS = [
  { n: "01", title: "Solicitação", desc: "Você fala com a gente pelo WhatsApp, sem compromisso." },
  { n: "02", title: "Análise da Conta", desc: "Analisamos seu consumo e dimensionamos o sistema ideal." },
  { n: "03", title: "Projeto", desc: "Criamos um projeto personalizado com a melhor economia." },
  { n: "04", title: "Homologação", desc: "Cuidamos de toda a burocracia junto à concessionária." },
  { n: "05", title: "Instalação", desc: "Nossa equipe própria instala com rapidez e segurança." },
  { n: "06", title: "Economia", desc: "Você passa a gerar sua própria energia e economizar." },
];

export type Project = {
  title: string;
  category: "Residencial" | "Comercial" | "Rural";
  city: string;
  power: string;
  economy: string;
  year: string;
  image: string;
};

export const PROJECTS: Project[] = [
  {
    title: "Residência de Alto Padrão",
    category: "Residencial",
    city: "Cuiabá - MT",
    power: "8,2 kWp",
    economy: "94%",
    year: "2024",
    // [SUBSTITUIR] por foto real: /public/projects/...
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Centro de Distribuição",
    category: "Comercial",
    city: "Várzea Grande - MT",
    power: "75 kWp",
    economy: "92%",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Fazenda Produtiva",
    category: "Rural",
    city: "Campo Verde - MT",
    power: "120 kWp",
    economy: "95%",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Condomínio Residencial",
    category: "Residencial",
    city: "Chapada dos Guimarães - MT",
    power: "12 kWp",
    economy: "93%",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Indústria Local",
    category: "Comercial",
    city: "Tangará da Serra - MT",
    power: "210 kWp",
    economy: "96%",
    year: "2023",
    image:
      "https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Propriedade Agrícola",
    category: "Rural",
    city: "Santo Antônio de Leverger - MT",
    power: "60 kWp",
    economy: "95%",
    year: "2024",
    image:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80",
  },
];

/** A2 — Resultados reais (estrutura pronta p/ contas/fotos reais) */
export type Result = {
  name: string;
  city: string;
  power: string;
  before: number;
  after: number;
  // [SUBSTITUIR] prints e fotos reais em /public/results
  billImage?: string;
  installImage?: string;
};

export const RESULTS: Result[] = [
  {
    name: "Residência",
    city: "Cuiabá - MT",
    power: "8,2 kWp",
    before: 940,
    after: 87,
    installImage:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Comércio",
    city: "Várzea Grande - MT",
    power: "22 kWp",
    before: 2480,
    after: 190,
    installImage:
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Propriedade Rural",
    city: "Campo Verde - MT",
    power: "60 kWp",
    before: 6100,
    after: 320,
    installImage:
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=900&q=80",
  },
];

/** A3 — Itens de confiança institucional (placeholders organizados) */
export const TRUST_ITEMS = [
  { icon: "Building2", label: "CNPJ", value: COMPANY.cnpj },
  { icon: "MapPin", label: "Endereço Físico", value: COMPANY.addressFull },
  { icon: "FileBadge", label: "Responsável Técnico", value: COMPANY.crea },
  { icon: "FileCheck", label: "ART", value: COMPANY.art },
  { icon: "Plug", label: "Homologação", value: "Projetos homologados na Energisa MT" },
  { icon: "Users", label: "Equipe Própria", value: "Sem terceirização da instalação" },
  { icon: "BadgeCheck", label: "Equipamentos", value: "Módulos Tier 1 e inversores certificados Inmetro" },
  { icon: "ShieldCheck", label: "Garantia", value: "Até 25 anos de garantia de performance" },
];

export const COMPARISON = [
  "Equipe própria de instalação",
  "Mais de 500 instalações",
  "Instalação rápida",
  "Financiamento facilitado",
  "Pós-venda dedicado",
  "Monitoramento online",
  "Garantia real de longo prazo",
];

/** M2 — Depoimentos (suporte a foto, origem e vídeo) */
export type Testimonial = {
  name: string;
  city: string;
  rating: number;
  text: string;
  source: "Google" | "WhatsApp" | "Vídeo";
  photo?: string; // [SUBSTITUIR] foto real
  videoUrl?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ricardo Almeida",
    city: "Cuiabá - MT",
    rating: 5,
    source: "Google",
    text: "Minha conta caiu de R$ 950 para menos de R$ 90. A equipe foi rápida e profissional do início ao fim. Melhor investimento que já fiz.",
  },
  {
    name: "Fernanda Souza",
    city: "Várzea Grande - MT",
    rating: 5,
    source: "Google",
    text: "Atendimento impecável. Explicaram tudo com clareza, cuidaram da burocracia e instalaram em poucos dias. Recomendo de olhos fechados.",
  },
  {
    name: "José Carlos Pereira",
    city: "Campo Verde - MT",
    rating: 5,
    source: "WhatsApp",
    text: "Na fazenda a economia foi enorme. A Alto Solar dimensionou certinho e hoje gero minha própria energia com tranquilidade.",
  },
  {
    name: "Mariana Lima",
    city: "Chapada dos Guimarães - MT",
    rating: 5,
    source: "Google",
    text: "Profissionalismo de empresa grande, mas com atendimento próximo. O monitoramento pelo app é ótimo. Estou muito satisfeita.",
  },
  {
    name: "Antônio Ribeiro",
    city: "Tangará da Serra - MT",
    rating: 5,
    source: "WhatsApp",
    text: "Financiei o sistema e a parcela ficou menor que minha antiga conta de luz. Ou seja, já economizo desde o primeiro mês.",
  },
];

export const FAQ = [
  {
    q: "Quanto vou economizar com energia solar?",
    a: "A economia chega a até 95% na conta de energia. O valor exato depende do seu consumo, mas a maioria dos nossos clientes reduz a fatura para próximo da taxa mínima da concessionária. Faça a simulação no site ou fale conosco no WhatsApp para um cálculo personalizado.",
  },
  {
    q: "O sistema precisa de manutenção?",
    a: "A manutenção é mínima. Os painéis são resistentes e duráveis, e geralmente basta uma limpeza periódica. Além disso, você acompanha tudo em tempo real pelo monitoramento online e contamos com pós-venda dedicado.",
  },
  {
    q: "Quanto tempo dura um sistema de energia solar?",
    a: "Os equipamentos têm vida útil superior a 25 anos, com garantia de performance dos painéis. É um investimento que se paga e continua gerando economia por décadas.",
  },
  {
    q: "Funciona em dias nublados ou chuvosos?",
    a: "Sim. O sistema continua gerando energia em dias nublados, com produção reduzida. O dimensionamento já considera a média de geração ao longo do ano, garantindo a economia projetada.",
  },
  {
    q: "Posso financiar o sistema?",
    a: "Sim! Trabalhamos com financiamento facilitado, com parcelas que muitas vezes cabem no valor que você já paga de energia. Assim, você começa a economizar desde o primeiro mês.",
  },
  {
    q: "Quanto tempo leva a instalação?",
    a: "Com nossa equipe própria, a instalação é extremamente rápida — normalmente concluída em poucos dias após a aprovação do projeto. Cuidamos também de toda a homologação junto à concessionária.",
  },
];

export const PARTNERS = [
  "Canadian Solar",
  "Growatt",
  "JA Solar",
  "Trina Solar",
  "Fronius",
  "Deye",
  "BYD",
  "Huawei",
];

/** Parâmetros da calculadora de economia */
export const CALC = {
  defaultBill: 800,
  minBill: 150,
  maxBill: 5000,
  step: 50,
  savingsRate: 0.9, // ~90% de economia média
  years: 25,
};

/** M4 — Cidades para páginas locais de SEO (/energia-solar-<slug>) */
export type CitySEO = {
  slug: string;
  name: string;
  preposition: string; // em / na
};

export const CITY_PAGES: CitySEO[] = [
  { slug: "energia-solar-cuiaba", name: "Cuiabá", preposition: "em" },
  { slug: "energia-solar-varzea-grande", name: "Várzea Grande", preposition: "em" },
  {
    slug: "energia-solar-chapada-dos-guimaraes",
    name: "Chapada dos Guimarães",
    preposition: "em",
  },
  { slug: "energia-solar-campo-verde", name: "Campo Verde", preposition: "em" },
  {
    slug: "energia-solar-tangara-da-serra",
    name: "Tangará da Serra",
    preposition: "em",
  },
];
