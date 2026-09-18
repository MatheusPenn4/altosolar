-- Alto Solar — Painel Administrativo
-- 0007: metadados do novo gerador de PDF (template 2.0.0, renderer Python)

-- Cada versão gerada passa a registrar o hash e tamanho do PDF entregue (para
-- detectar corrupção/duplicidade) e a versão do template usado no render.
alter table proposal_versions
  add column if not exists pdf_sha256 text,
  add column if not exists pdf_size_bytes bigint,
  add column if not exists template_version text;

-- Última falha de geração da proposta (quando houver), para exibir no painel
-- sem precisar vasculhar audit_logs. Nunca deve conter dado confidencial do
-- orçamento do fornecedor — só a mensagem de validação/erro do gerador.
alter table proposals
  add column if not exists last_generation_error text,
  add column if not exists last_generation_error_at timestamptz;
