-- Alto Solar — Painel Administrativo
-- 0006: perfil energético no cadastro do cliente
--
-- Guarda no próprio cliente os dados de consumo extraídos da fatura de energia,
-- para que uma nova proposta para o mesmo cliente já puxe esses dados
-- automaticamente, sem precisar reanexar a fatura toda vez.

alter table clients
  add column tipo_ligacao text,
  add column consumo_medio_kwh numeric,
  add column consumo_ultimos_12_meses jsonb,
  add column tarifa_cents_kwh integer,
  add column ultima_fatura_analisada_em timestamptz;

comment on column clients.consumo_ultimos_12_meses is
  'Array com os 12 valores de consumo mensal (kWh) mais recentes, do mais antigo para o mais recente.';
