-- Alto Solar — Painel Administrativo
-- 0005: faturas de energia do cliente (upload + extração por IA)

create table client_energy_bills (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,

  source_file_path text,
  source_hash text,

  extraction_status extraction_status not null default 'pending',
  extraction_model text,
  extraction_prompt_version text,
  extraction_schema_version text,
  extraction_raw jsonb,
  extraction_duration_ms integer,
  extraction_from_cache boolean not null default false,
  extraction_confirmed_at timestamptz,

  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_energy_bills_client_idx on client_energy_bills (client_id);
create index client_energy_bills_source_hash_idx on client_energy_bills (source_hash);

create trigger set_updated_at before update on client_energy_bills
  for each row execute function set_updated_at();

alter table client_energy_bills enable row level security;

create policy "client_energy_bills_all_usuarios_ativos" on client_energy_bills
  for all using (is_usuario_ativo()) with check (is_usuario_ativo());

-- Storage: bucket privado para os PDFs das faturas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('faturas-energia', 'faturas-energia', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

create policy "faturas_energia_select_usuarios_ativos"
  on storage.objects for select
  using (bucket_id = 'faturas-energia' and is_usuario_ativo());

create policy "faturas_energia_insert_usuarios_ativos"
  on storage.objects for insert
  with check (bucket_id = 'faturas-energia' and is_usuario_ativo());

create policy "faturas_energia_delete_usuarios_ativos"
  on storage.objects for delete
  using (bucket_id = 'faturas-energia' and is_usuario_ativo());
