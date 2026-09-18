/**
 * Contrato exato de dados exigido pelo gerador Python (`api/_proposal_generator/generator.py`,
 * template 2.0.0). Mantido em sincronia manual com `validate_package()` daquele arquivo —
 * qualquer campo obrigatório novo lá precisa aparecer aqui também.
 *
 * Ninguém além de `normalizar.ts` deve construir este objeto: é a única porta de saída de
 * dados para o gerador, e é aqui que ficam as regras de "o que nunca pode aparecer no PDF"
 * (custo de fábrica, margem, VPL, TIR etc. simplesmente não têm campo correspondente).
 */

export interface ProposalTemplateMeta {
  template_version: "2.0.0";
  document_title: string;
  proposal_number: string;
  version: string;
  issue_date: string; // DD/MM/YYYY
  valid_until: string; // DD/MM/YYYY
  commercial_validity: string;
  validity_days: number;
  status: string;
  disclaimer: string; // "" em propostas reais
  page_label: "Página";
  page_total: 6;
  demo_mode?: boolean;
}

export interface ProposalTemplateAssets {
  logo: string;
  backgrounds: string[];
}

export interface ProposalTemplateCompany {
  name: string;
  commercial_contact: string;
  phone: string;
  cnpj: string;
  location: string;
}

export interface ProposalTemplateClient {
  name: string;
  city: string;
  installation_type: string;
  consumer_unit: string;
  utility: string;
  consultant: string;
}

export interface ProposalTemplateProject {
  installed_power_kwp: number;
  installed_power_display: string;
  module_quantity: number;
  module_power_w: number;
  calculated_power: string;
  monthly_generation_kwh: number;
  monthly_generation_display: string;
  annual_generation_kwh: number;
  annual_generation_display: string;
  monthly_consumption_kwh: number;
  monthly_consumption_display: string;
  annual_consumption_kwh: number;
  annual_consumption_display: string;
  compensation_percent: number;
  compensation_display: string;
  useful_area_m2: number;
  useful_area_display: string;
  mounting_type: string;
  location: string;
  generation_note: string;
}

export interface ProposalTemplateMonthlyRow {
  month: string;
  consumption: number;
  generation: number;
}

export interface ProposalTemplateMonthlyProfile {
  title: string;
  consumption_label: string;
  generation_label: string;
  unit: "kWh";
  rows: ProposalTemplateMonthlyRow[];
  totals: {
    annual_consumption: string;
    annual_generation: string;
    average_consumption: string;
    average_generation: string;
  };
}

export interface ProposalTemplateEquipment {
  title: string;
  headers: [string, string, string];
  rows: [string, string, string][];
  area_label: string;
}

export interface ProposalTemplateWarrantyCard {
  title: string;
  value: string;
}

export interface ProposalTemplateFinancialProjectionPoint {
  year: number;
  label: string;
  value: number;
  display: string;
}

export interface ProposalTemplateFinancial {
  investment: string;
  monthly_savings: string;
  first_year_savings: string;
  payback: string;
  savings_25_years: string;
  tariff: string;
  compensation: string;
  energy_25_years: string;
  analysis_period: string;
  note: string;
  projection: ProposalTemplateFinancialProjectionPoint[];
}

export interface ProposalTemplatePaymentOption {
  title: string;
  lines: string[];
}

export interface ProposalTemplatePage1 {
  title_lines: [string, string];
  subtitle: string;
  prepared_for_label: string;
  system_label: string;
  footer_line: string;
  consultant_line: string;
}

export interface ProposalTemplatePage2 {
  title: string;
  institutional: string;
  solution_title: string;
  solution_text: string;
  project_facts: { value_field: string; label: string }[];
  flow_steps: { number: string; label: string }[];
  benefits: { title: string; text: string }[];
  bottom_cards: { title: string; text: string }[];
}

export interface ProposalTemplatePage3 {
  title: string;
  subtitle: string;
  summary_line: string;
  metric_cards: { value: string; label: string }[];
}

export interface ProposalTemplatePage4 {
  title: string;
  subtitle: string;
  services_title: string;
  warranty_note_title: string;
  timeline_title: string;
  timeline: string[];
  differentials_title: string;
}

export interface ProposalTemplatePage5 {
  page_title: string;
  page_subtitle: string;
  investment_title: string;
  investment_complement: string;
  metric_cards: { value: string; label: string }[];
  projection_title: string;
  payment_title: string;
  assumptions_title: string;
  assumptions: string[];
  bottom_cards: { title: string; value: string }[];
}

export interface ProposalTemplatePage6 {
  title: string;
  subtitle: string;
  commercial_title: string;
  commercial_lines: string[];
  included_title: string;
  included_lines: string[];
  timeline: { label: string; icon: "accept" | "validation" | "project" | "installation" | "activation" }[];
  conditions_title: string;
  conditions_text: string;
  contact_title: string;
  contact_lines: string[];
  qr_placeholder: string;
  signatures: [string, string];
  final_message: string;
}

export interface ProposalTemplateData {
  meta: ProposalTemplateMeta;
  assets: ProposalTemplateAssets;
  company: ProposalTemplateCompany;
  client: ProposalTemplateClient;
  project: ProposalTemplateProject;
  monthly_profile: ProposalTemplateMonthlyProfile;
  equipment: ProposalTemplateEquipment;
  services: string[];
  warranties: ProposalTemplateWarrantyCard[];
  warranty_details: string[];
  warranty_note: string;
  differentials: string[];
  financial: ProposalTemplateFinancial;
  payment_options: ProposalTemplatePaymentOption[];
  payment_note: string;
  pages: {
    "1": ProposalTemplatePage1;
    "2": ProposalTemplatePage2;
    "3": ProposalTemplatePage3;
    "4": ProposalTemplatePage4;
    "5": ProposalTemplatePage5;
    "6": ProposalTemplatePage6;
  };
  header: { proposal_line: string; client_line: string };
  footer: { company_line: string; phone_line: string; proposal_line: string };
  qr: { available: boolean; url: string };
}
