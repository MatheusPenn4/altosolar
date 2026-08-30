-- Alto Solar — Painel Administrativo
-- 0002: Row Level Security
--
-- Modelo: ferramenta interna de uma única equipe. Qualquer usuário autenticado
-- com profile ativo pode ler/escrever os dados administrativos (clientes,
-- orçamentos, propostas). Usuários não autenticados não têm acesso nenhum.
-- A service role (usada apenas em rotinas de servidor de confiança) ignora RLS.

create or replace function is_usuario_ativo()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and ativo = true
  );
$$ language sql security definer stable set search_path = public;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table factory_quotes enable row level security;
alter table factory_quote_items enable row level security;
alter table proposals enable row level security;
alter table proposal_versions enable row level security;
alter table price_overrides enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

-- profiles: cada usuário lê/edita o próprio perfil; todos os usuários ativos podem
-- ler os perfis dos colegas (necessário para exibir "vendedor responsável").
create policy "profiles_select_autenticados" on profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_proprio" on profiles
  for update using (auth.uid() = id);

-- clients
create policy "clients_all_usuarios_ativos" on clients
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- factory_quotes
create policy "factory_quotes_all_usuarios_ativos" on factory_quotes
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- factory_quote_items
create policy "factory_quote_items_all_usuarios_ativos" on factory_quote_items
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- proposals
create policy "proposals_all_usuarios_ativos" on proposals
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- proposal_versions
create policy "proposal_versions_all_usuarios_ativos" on proposal_versions
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- price_overrides — somente leitura + inserção (histórico não pode ser editado/apagado)
create policy "price_overrides_select_usuarios_ativos" on price_overrides
  for select using (is_usuario_ativo());

create policy "price_overrides_insert_usuarios_ativos" on price_overrides
  for insert with check (is_usuario_ativo());

-- audit_logs — somente leitura + inserção
create policy "audit_logs_select_usuarios_ativos" on audit_logs
  for select using (is_usuario_ativo());

create policy "audit_logs_insert_usuarios_ativos" on audit_logs
  for insert with check (is_usuario_ativo());

-- app_settings
create policy "app_settings_select_usuarios_ativos" on app_settings
  for select using (is_usuario_ativo());

create policy "app_settings_update_usuarios_ativos" on app_settings
  for update using (is_usuario_ativo()) with check (is_usuario_ativo());
