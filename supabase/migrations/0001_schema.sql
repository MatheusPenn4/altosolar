-- Alto Solar — Painel Administrativo
-- 0001: schema base (enums, tabelas, índices)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type proposal_status as enum (
  'draft', 'ready', 'sent', 'accepted', 'rejected', 'expired', 'archived'
);

create type tipo_pessoa as enum ('fisica', 'juridica');

create type extraction_status as enum (
  'pending', 'processing', 'success', 'failed', 'manual'
);

-- ---------------------------------------------------------------------------
-- profiles — um por usuário autenticado (auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  telefone text,
  funcao text not null default 'vendedor',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  tipo_pessoa tipo_pessoa not null default 'fisica',
  nome_razao_social text not null,
  cpf_cnpj text,
  telefone text,
  whatsapp text,
  email text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  unidade_consumidora text,
  concessionaria text,
  tipo_instalacao text,
  observacoes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_nome_idx on clients using gin (to_tsvector('portuguese', nome_razao_social));
create index clients_cpf_cnpj_idx on clients (cpf_cnpj);
create index clients_created_by_idx on clients (created_by);

-- ---------------------------------------------------------------------------
-- factory_quotes — orçamentos importados da fábrica
-- ---------------------------------------------------------------------------
create table factory_quotes (
  id uuid primary key default gen_random_uuid(),
  fornecedor text,
  numero_cotacao text,
  integrador text,
  cliente_destino text,
  emissao date,
  validade date,
  condicao_pagamento text,
  potencia_wp integer not null default 0,

  produtos_cents bigint not null default 0,
  frete_cents bigint not null default 0,
  seguro_cents bigint not null default 0,
  icms_cents bigint not null default 0,
  ipi_cents bigint not null default 0,
  st_cents bigint not null default 0,
  diferencial_aliquota_cents bigint not null default 0,
  total_cents bigint not null default 0,

  source_file_path text,
  source_hash text,

  extraction_status extraction_status not null default 'pending',
  extraction_model text,
  extraction_prompt_version text,
  extraction_schema_version text,
  extraction_raw jsonb,
  extraction_duration_ms integer,
  extraction_confirmed_at timestamptz,

  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index factory_quotes_source_hash_idx on factory_quotes (source_hash);
create index factory_quotes_created_by_idx on factory_quotes (created_by);

-- ---------------------------------------------------------------------------
-- factory_quote_items
-- ---------------------------------------------------------------------------
create table factory_quote_items (
  id uuid primary key default gen_random_uuid(),
  factory_quote_id uuid not null references factory_quotes (id) on delete cascade,
  descricao text not null,
  codigo text,
  fabricante text,
  quantidade numeric not null default 0,
  unidade text,
  potencia_unitaria_w numeric,
  pagina_origem integer,
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index factory_quote_items_quote_idx on factory_quote_items (factory_quote_id);

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------
create table proposals (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  client_id uuid references clients (id),
  factory_quote_id uuid references factory_quotes (id),
  status proposal_status not null default 'draft',

  potencia_wp integer,
  consumo_medio_kwh numeric,
  geracao_mensal_kwh numeric,
  geracao_anual_kwh numeric,
  area_util_m2 numeric,
  tarifa_cents_kwh integer,

  factory_cost_cents bigint not null default 0,
  additional_costs_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  sale_price_cents bigint not null default 0,
  manual_price_override boolean not null default false,
  override_reason text,

  payment_conditions jsonb not null default '{}'::jsonb,
  technical_data jsonb not null default '{}'::jsonb,
  simulation_data jsonb not null default '{}'::jsonb,
  included_items jsonb not null default '[]'::jsonb,
  excluded_items jsonb not null default '[]'::jsonb,
  warranties jsonb not null default '{}'::jsonb,

  notes text,
  valid_until date,
  seller_id uuid references profiles (id),

  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposals_client_idx on proposals (client_id);
create index proposals_status_idx on proposals (status);
create index proposals_created_by_idx on proposals (created_by);
create index proposals_codigo_idx on proposals (codigo);

-- ---------------------------------------------------------------------------
-- proposal_versions
-- ---------------------------------------------------------------------------
create table proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  pdf_path text,
  generated_by uuid references profiles (id),
  generated_at timestamptz not null default now(),
  unique (proposal_id, version_number)
);

create index proposal_versions_proposal_idx on proposal_versions (proposal_id);

-- ---------------------------------------------------------------------------
-- price_overrides — histórico de alterações manuais do valor final
-- ---------------------------------------------------------------------------
create table price_overrides (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  previous_value_cents bigint not null,
  new_value_cents bigint not null,
  reason text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index price_overrides_proposal_idx on price_overrides (proposal_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- app_settings — configurações globais (linha única)
-- ---------------------------------------------------------------------------
create table app_settings (
  id boolean primary key default true constraint app_settings_singleton check (id),
  company_name text not null default 'Alto Solar',
  company_legal_name text,
  company_cnpj text,
  company_address text,
  company_phone text,
  company_whatsapp text,
  company_email text,
  company_logo_path text,
  institutional_text text,
  default_services jsonb not null default '[]'::jsonb,
  default_warranties jsonb not null default '{}'::jsonb,
  default_financial_assumptions jsonb not null default '{}'::jsonb,
  default_validity_days integer not null default 7,
  default_seller_id uuid references profiles (id),
  gemini_model text,
  ai_analysis_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into app_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function set_updated_at();
create trigger set_updated_at before update on clients for each row execute function set_updated_at();
create trigger set_updated_at before update on factory_quotes for each row execute function set_updated_at();
create trigger set_updated_at before update on factory_quote_items for each row execute function set_updated_at();
create trigger set_updated_at before update on proposals for each row execute function set_updated_at();
create trigger set_updated_at before update on app_settings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- cria profile automaticamente ao registrar um novo usuário
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
