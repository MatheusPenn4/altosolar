-- Alto Solar — Painel Administrativo
-- 0008: gerenciamento centralizado de provedores de IA
--
-- Até aqui a única credencial de IA era a env var GEMINI_API_KEY(S), sem
-- gestão nem diagnóstico no painel. Esta migration cria a estrutura para
-- cadastrar múltiplas configurações de provedor (com fallback por
-- prioridade), registrar saúde/cooldown de cada uma, e logar as execuções
-- (sem nunca persistir a credencial em texto puro nem o conteúdo do
-- documento analisado). A env var GEMINI_API_KEY(S) continua funcionando
-- como fallback enquanto nenhuma configuração estiver cadastrada — ver
-- lib/ai/credenciais.ts.

-- ---------------------------------------------------------------------------
-- Papel de administrador — hoje só existe "ativo/inativo"; gerenciar
-- credenciais de IA exige um nível a mais de permissão.
-- ---------------------------------------------------------------------------
alter table profiles
  add column is_admin boolean not null default false;

comment on column profiles.is_admin is
  'Permite gerenciar (criar/editar/desativar) configurações de provedores de IA. Promover manualmente a primeira conta admin via SQL após esta migration.';

create or replace function is_admin_ativo()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and ativo = true and is_admin = true
  );
$$ language sql security definer stable set search_path = public;

-- ---------------------------------------------------------------------------
-- ai_provider_configs — uma linha por configuração de provedor de IA
-- ---------------------------------------------------------------------------
create table ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  provider text not null check (provider in ('google_gemini')),
  modelo text not null,

  credencial_criptografada bytea not null,
  credencial_preview text not null,

  ativo boolean not null default true,
  prioridade integer not null default 1,

  status text not null default 'desconhecido'
    check (status in ('disponivel', 'limite_atingido', 'credencial_invalida', 'indisponivel', 'desconhecido')),
  cooldown_ate timestamptz,
  quota_reset_em timestamptz,
  quota_reset_confiavel boolean not null default false,

  ultima_utilizacao_em timestamptz,
  ultimo_sucesso_em timestamptz,
  ultimo_erro_em timestamptz,
  ultimo_erro_categoria text,
  ultimo_erro_codigo text,
  ultimo_erro_mensagem text,

  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column ai_provider_configs.credencial_criptografada is
  'AES-256-GCM (iv + authTag + ciphertext), cifrada em lib/ai/criptografia.ts. Nunca decifrada fora do servidor, nunca devolvida por nenhum Server Action.';
comment on column ai_provider_configs.credencial_preview is
  'Prévia mascarada exibida na UI (ex.: "AIza••••••••••8K2"). Calculada uma vez ao salvar.';
comment on column ai_provider_configs.quota_reset_confiavel is
  'true somente quando o provider informou um horário de reset real (ex.: Retry-After). Quando false, cooldown_ate é uma estimativa interna — a UI deve deixar isso explícito.';
comment on table ai_provider_configs is
  'Contagens de sucesso/erro recentes não ficam armazenadas aqui — são calculadas sob demanda a partir de ai_events (evita incrementos concorrentes/race conditions).';

create index ai_provider_configs_prioridade_idx on ai_provider_configs (prioridade) where ativo = true;

create trigger set_updated_at before update on ai_provider_configs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_events — log de execução (imutável: só select + insert), mesmo espírito
-- de audit_logs
-- ---------------------------------------------------------------------------
create table ai_events (
  id uuid primary key default gen_random_uuid(),
  provider_config_id uuid references ai_provider_configs (id) on delete set null,
  provider text not null,
  modelo text,
  operacao text not null check (operacao in ('analisar_orcamento', 'analisar_fatura', 'testar_conexao')),
  resultado text not null check (resultado in ('sucesso', 'erro')),
  categoria_erro text,
  codigo_http integer,
  mensagem text,
  duracao_ms integer,
  tentativa integer,
  fallback_de_config_id uuid references ai_provider_configs (id) on delete set null,
  user_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

comment on column ai_events.mensagem is
  'Mensagem sanitizada para diagnóstico — nunca contém a credencial nem o conteúdo do documento analisado.';

create index ai_events_created_at_idx on ai_events (created_at desc);
create index ai_events_provider_config_idx on ai_events (provider_config_id);

-- ---------------------------------------------------------------------------
-- app_settings — configuração global do AI Manager (reaproveita o singleton
-- existente em vez de criar mais uma tabela)
-- ---------------------------------------------------------------------------
alter table app_settings
  add column ai_fallback_automatico boolean not null default true,
  add column ai_max_tentativas_por_provider integer not null default 2,
  add column ai_max_fallbacks integer not null default 3,
  add column ai_timeout_ms integer not null default 45000;

comment on column app_settings.ai_max_tentativas_por_provider is
  'Tentativas na MESMA configuração antes de cair para a próxima (erro transitório/parsing). Limitado a 3 na aplicação, independente do valor salvo aqui.';
comment on column app_settings.ai_max_fallbacks is
  'Quantas configurações diferentes o AI Manager tenta por requisição, no máximo. Limitado a 5 na aplicação.';
comment on column app_settings.ai_timeout_ms is
  'Timeout por chamada ao provider. As colunas gemini_model/gemini_daily_limit continuam existindo por compatibilidade, mas deixam de ser a fonte de verdade do modelo/limite usado.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table ai_provider_configs enable row level security;
alter table ai_events enable row level security;

-- ai_provider_configs — qualquer usuário ativo pode ver status/diagnóstico
-- (a credencial nunca sai como texto puro, é ciphertext); só admins gerenciam.
create policy "ai_provider_configs_select_usuarios_ativos" on ai_provider_configs
  for select using (is_usuario_ativo());

create policy "ai_provider_configs_insert_admins" on ai_provider_configs
  for insert with check (is_admin_ativo());

create policy "ai_provider_configs_update_admins" on ai_provider_configs
  for update using (is_admin_ativo()) with check (is_admin_ativo());

create policy "ai_provider_configs_delete_admins" on ai_provider_configs
  for delete using (is_admin_ativo());

-- ai_events — inserido pela própria sessão do vendedor logado (não só admin);
-- só leitura + inserção, sem update/delete (log imutável).
create policy "ai_events_select_usuarios_ativos" on ai_events
  for select using (is_usuario_ativo());

create policy "ai_events_insert_usuarios_ativos" on ai_events
  for insert with check (is_usuario_ativo());
