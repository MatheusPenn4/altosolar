-- Alto Solar — Painel Administrativo
-- 0003: buckets de Storage e políticas de acesso
--
-- Ambos os buckets são PRIVADOS. Downloads devem sempre usar signed URLs
-- geradas no servidor (nunca URL pública).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('orcamentos-fabrica', 'orcamentos-fabrica', false, 15728640, array['application/pdf']),
  ('propostas-geradas', 'propostas-geradas', false, 15728640, array['application/pdf'])
on conflict (id) do nothing;

create policy "orcamentos_fabrica_select_usuarios_ativos"
  on storage.objects for select
  using (bucket_id = 'orcamentos-fabrica' and is_usuario_ativo());

create policy "orcamentos_fabrica_insert_usuarios_ativos"
  on storage.objects for insert
  with check (bucket_id = 'orcamentos-fabrica' and is_usuario_ativo());

create policy "orcamentos_fabrica_delete_usuarios_ativos"
  on storage.objects for delete
  using (bucket_id = 'orcamentos-fabrica' and is_usuario_ativo());

create policy "propostas_geradas_select_usuarios_ativos"
  on storage.objects for select
  using (bucket_id = 'propostas-geradas' and is_usuario_ativo());

create policy "propostas_geradas_insert_usuarios_ativos"
  on storage.objects for insert
  with check (bucket_id = 'propostas-geradas' and is_usuario_ativo());

create policy "propostas_geradas_delete_usuarios_ativos"
  on storage.objects for delete
  using (bucket_id = 'propostas-geradas' and is_usuario_ativo());
