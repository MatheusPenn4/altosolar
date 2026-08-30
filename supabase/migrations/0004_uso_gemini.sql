-- Alto Solar — Painel Administrativo
-- 0004: acompanhamento de uso da API do Gemini
--
-- O Google não expõe um endpoint de "cota restante" para chaves de API simples
-- (isso só existe para Vertex AI com projeto no Google Cloud). O que dá para
-- fazer é contar, no nosso próprio banco, quantas chamadas reais foram feitas
-- (distinguindo de reaproveitamentos do cache por hash, que não gastam cota).

alter table factory_quotes
  add column extraction_from_cache boolean not null default false;

comment on column factory_quotes.extraction_from_cache is
  'true quando o resultado foi reaproveitado do cache por hash (não chamou a API do Gemini de verdade).';

alter table app_settings
  add column gemini_daily_limit integer;

comment on column app_settings.gemini_daily_limit is
  'Limite diário de chamadas conhecido pelo usuário (consultado manualmente em aistudio.google.com/usage). Usado apenas para exibir uma estimativa de uso no painel — não é validado pelo Google.';
