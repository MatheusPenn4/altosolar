# Alto Solar — Landing Page

Landing page premium de alta conversão para a **Alto Solar** (energia solar fotovoltaica em Cuiabá e Mato Grosso). Foco absoluto em **geração de leads via WhatsApp**.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Lucide · Embla Carousel · React CountUp · React Intersection Observer.

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm start        # servir produção
```

## Personalização (antes de publicar)

Tudo que é conteúdo fica centralizado em **`lib/constants.ts`**:

| O quê | Onde |
|---|---|
| **Número do WhatsApp** (essencial!) | `COMPANY.whatsappNumber` — formato internacional só dígitos, ex.: `556599...` |
| Telefone, e-mail, endereço, redes | `COMPANY` |
| Cidades / mapa | `CITIES` |
| Métricas, benefícios, passos | `STATS`, `BENEFITS`, `STEPS` |
| Projetos (fotos reais) | `PROJECTS` — trocar URLs das imagens |
| Depoimentos, FAQ, parceiros | `TESTIMONIALS`, `FAQ`, `PARTNERS` |
| Taxa/parâmetros da calculadora | `CALC` |

Outros assets:

- **Vídeo do Hero**: `components/sections/Hero.tsx` → trocar `<source src=...>` pelo vídeo oficial (.mp4/.webm). Há `poster` de fallback.
- **Logo**: `components/ui/Logo.tsx` — substituível pelo SVG/PNG oficial.
- **Domínio (SEO/JSON-LD)**: `COMPANY.url`.

## Arquitetura

```
app/        layout (SEO + JSON-LD + fonts) · page · globals.css · robots · sitemap
components/ layout/ (Header, Footer, WhatsAppFloat) · sections/ · ui/
lib/        constants · whatsapp (gerador de links) · utils
```

Toda conversão passa por `lib/whatsapp.ts`, que gera mensagens contextuais por seção.

## Painel administrativo — geração de propostas (template 2.0.0)

Além da landing page, o repositório inclui um painel interno (`/painel`) para cadastro de
clientes, análise de orçamentos de fábrica com IA (Gemini) e criação de propostas comerciais
em PDF de seis páginas. Esta seção documenta especificamente o **gerador de PDF**.

### Arquitetura

O PDF de seis páginas é desenhado por um **renderer em Python** (`reportlab`), não por
`@react-pdf/renderer`/Node. A separação existe porque o template usa fundos vetoriais em alta
resolução, tabelas e gráficos desenhados por código, e o ecossistema Python (`reportlab` +
`Pillow` + `pypdf`) lida com isso de forma mais robusta e testável do que as alternativas em
Node disponíveis para o mesmo nível de controle de layout.

```
app/api/propostas/[id]/gerar-pdf/route.ts   Route Handler Next.js (Node) — orquestra tudo
lib/proposalTemplate/
  tipos.ts                                  contrato TypeScript do JSON exigido pelo gerador
  normalizar.ts                             DB → JSON do template (única fonte de cálculo/formatação)
  constantesInstitucionais.ts               copy fixo da Alto Solar (não vem do cliente)
  chamarGerador.ts                          chamada HTTP para a função Python
api/gerar-proposta-pdf.py                   Vercel Python Function — único ponto de entrada HTTP
api/_proposal_generator/
  generator.py                              renderer (reportlab) + validações estruturais
  layout/proposal-layout-map.json           coordenadas fixas de cada campo (não muda por proposta)
  assets/                                   logo, 6 fundos A4 e fontes embutidas no PDF
  tests/                                    pytest (dados demo, dados realistas, casos de erro)
```

Fluxo de uma geração:

1. O usuário clica em "Gerar PDF" em `/painel/propostas/[id]` (`PropostaAcoes.tsx`).
2. `POST /api/propostas/[id]/gerar-pdf` (Node) lê a proposta, o cliente, o vendedor responsável
   e as configurações da empresa no Supabase.
3. `montarDadosProposta()` (`lib/proposalTemplate/normalizar.ts`) converte tudo para o contrato
   exato exigido pelo template — é a **única** função que decide o que aparece no PDF; nunca
   inclui custo de fábrica, margem, lucro, VPL ou TIR (esses campos simplesmente não têm para
   onde ir no JSON de saída).
4. O Node reserva o próximo número de versão (`proposal_versions`, com constraint `unique
   (proposal_id, version_number)` — evita duplicidade em cliques repetidos ou requisições
   simultâneas) e chama `POST /api/gerar-proposta-pdf` (a função Python), autenticando com um
   segredo compartilhado (`PROPOSAL_PDF_INTERNAL_SECRET`) — necessário porque uma função Python
   na Vercel roda fora do pipeline do Next.js/`middleware.ts`, sem sessão do Supabase.
5. A função Python valida os dados (`validate_package`), desenha as seis páginas em um arquivo
   exclusivo em `/tmp` (nome único por requisição — seguro para chamadas concorrentes), roda uma
   segunda validação sobre o PDF já gerado (`validate_generated_pdf`: 6 páginas, A4, texto
   selecionável, ausência de termos internos/demonstrativos, tamanho máximo) e devolve os bytes
   em base64.
6. O Node recebe o PDF, envia para o bucket privado `propostas-geradas` em
   `{proposalId}/v{versao}.pdf`, grava o hash SHA-256/tamanho/versão do template na linha
   reservada de `proposal_versions` e marca a proposta como `ready`. Se qualquer etapa falhar, a
   linha reservada é removida e o erro é salvo em `proposals.last_generation_error`.
7. Download usa sempre URL assinada (10 min), nunca URL pública; a `SUPABASE_SERVICE_ROLE_KEY`
   nunca sai do lado servidor (nem do Node, nem do Python — a função Python não acessa o
   Supabase, só recebe e devolve JSON/bytes).

### Campos dinâmicos vs. copy fixo

- **Vem do banco/cálculo** (via `normalizar.ts`): dados do cliente, potência, geração,
  consumo, equipamentos, garantias, condições de pagamento, valor comercial final e toda a
  simulação financeira (economia, payback, projeção — já calculados com reajuste tarifário e
  degradação em `lib/domain/simulacao.ts`).
- **Fixo, definido no servidor** (`constantesInstitucionais.ts`): textos institucionais, os 8
  diferenciais da Alto Solar, o fluxo "como funciona", as etapas do projeto e os ícones da
  página 6. O frontend nunca envia esse conteúdo — ele decide apenas os *dados* da proposta.
- **Nunca aparece no PDF**: custo de fábrica, custos adicionais internos, desconto, margem,
  lucro, VPL, TIR ou qualquer observação interna do orçamento do fornecedor.
- **Limitação conhecida**: não há histórico de geração mensal real (só a média estimada), então
  o gráfico "Consumo x Geração" usa uma linha reta para a geração e o histórico real de consumo
  quando disponível (`clients.consumo_ultimos_12_meses`) — nunca inventa variação sazonal.
- O valor de fábrica do orçamento pode ser mantido como valor final ou sobrescrito manualmente
  na Etapa 6 do assistente (`manual_price_override`/`override_reason`, já existente no schema);
  só o valor final aparece no PDF.

### Configuração local

Variáveis de ambiente (ver `.env.example`): além das já existentes do Supabase/Gemini, é
necessário `PROPOSAL_PDF_INTERNAL_SECRET` — gere um valor aleatório (`openssl rand -hex 32`) e
use o **mesmo** valor tanto localmente quanto nas duas variáveis de ambiente da Vercel (a
variável é lida tanto pela rota Node quanto pela função Python).

Para trabalhar no gerador Python isoladamente:

```bash
cd api/_proposal_generator
python -m venv .venv
.venv/Scripts/activate   # Windows — no Linux/macOS: source .venv/bin/activate
pip install -r ../../requirements.txt
pip install pytest       # só para rodar os testes localmente

python generator.py --validate --data tests/fixtures/realistic-data.json
python generator.py --data tests/fixtures/demo-data.json --output /tmp/proposta.pdf
pytest tests/
```

O modo demonstrativo (`meta.demo_mode: true` no JSON) só existe para testes locais — a rota de
produção nunca o ativa, e a validação do PDF rejeita qualquer proposta real que contenha textos
como "MODELO DEMONSTRATIVO" ou dados do exemplo.

### Migrations e Supabase Storage

Migrations em `supabase/migrations/*.sql`, aplicadas manualmente via SQL Editor do Supabase (na
ordem numérica). A `0007_proposta_template_v2.sql` adiciona `pdf_sha256`, `pdf_size_bytes` e
`template_version` em `proposal_versions`, além de `last_generation_error(_at)` em `proposals`.

O bucket **`propostas-geradas`** (privado, criado em `0003_storage.sql`) guarda os PDFs em
`{proposalId}/v{versao}.pdf`. RLS segue o mesmo modelo do restante do painel (qualquer usuário
autenticado com `profiles.ativo = true`).

### Testes

```bash
npm run test                                    # Vitest — inclui lib/proposalTemplate
cd api/_proposal_generator && pytest tests/     # geração, validação, overflow, concorrência
```

Os testes Python cobrem: geração com dados de demonstração e com dados realistas (menos itens
de equipamento, menos formas de pagamento, sem aviso demonstrativo), campo obrigatório ausente,
texto longo demais (overflow controlado), termos internos proibidos (margem/VPL/TIR), aviso
demonstrativo fora do modo demo e geração concorrente (via `ThreadPoolExecutor`, garantindo que
cada chamada usa arquivo/diretório temporário exclusivo). Os testes TypeScript cobrem o
normalizador: nunca vaza dado interno, usa o valor comercial final, calcula `validity_days` sem
data fixa, mantém `module_quantity × module_power_w` consistente com a potência instalada e
amostra a projeção financeira preservando o valor do período analisado.

### Deploy na Vercel

- `vercel.json` configura a função Python (`api/gerar-proposta-pdf.py`) com 30s de timeout e
  `includeFiles` apontando para `api/_proposal_generator/**` (assets, layout e o próprio
  `generator.py`). **Não** defina `runtime` no `vercel.json` para Python — é um runtime
  suportado oficialmente e detectado automaticamente (versão padrão 3.12); um valor como
  `"python3.12"` no campo `runtime` só é válido para *community runtimes* (formato
  `pacote-npm@versão`) e quebra o build com "Function Runtimes must have a valid version".
  `memory` também não deve ir no `vercel.json` — com Fluid compute habilitado (padrão em contas
  novas), a memória da função é configurada em Project Settings → Functions, não no arquivo.
  O diretório `api/_proposal_generator/` começa com `_`, então a Vercel nunca o trata como uma
  função própria — só como código/assets auxiliares importados por `gerar-proposta-pdf.py`.
- `requirements.txt` na raiz do repositório é lido automaticamente pela Vercel para instalar as
  dependências Python (`reportlab`, `Pillow`, `pypdf`, `tzdata`).
- Configure em Project Settings → Environment Variables: todas as variáveis já existentes, mais
  `PROPOSAL_PDF_INTERNAL_SECRET` (mesmo valor usado pela rota Node — não precisa de uma variável
  separada por função, é a mesma env var lida dos dois lados).
- A landing page e o restante do painel continuam sendo servidos normalmente pelo builder do
  Next.js; a função Python é um serviço adicional e independente na mesma implantação.

### Atualizando o template no futuro

O layout (posições, tamanhos de fonte) fica inteiramente em
`api/_proposal_generator/layout/proposal-layout-map.json`, em pixels de um PNG de referência de
2480×3508 (A4 a 300 DPI). Para ajustar o design:

1. Edite os PNGs de fundo em `api/_proposal_generator/assets/backgrounds/` (mesma resolução) e/ou
   o mapa de layout.
2. Rode `python generator.py --validate --data tests/fixtures/realistic-data.json` — a validação
   aponta imediatamente coordenadas fora da página, fontes abaixo do mínimo ou campos de layout
   ausentes.
3. Gere um PDF de teste e inspecione visualmente (útil converter as páginas em imagem com
   `pymupdf`, já que o pacote não depende de `poppler`).
4. Se mudar a estrutura de dados (novos campos), atualize em conjunto: `generator.py`
   (`validate_package`, funções `draw_*`), `lib/proposalTemplate/tipos.ts` e
   `lib/proposalTemplate/normalizar.ts` — e suba `meta.template_version`.

### Diagnóstico de erros comuns

| Sintoma | Causa provável |
|---|---|
| `401` da função Python | `PROPOSAL_PDF_INTERNAL_SECRET` ausente ou diferente entre Node e a função Python na Vercel |
| Erro de validação citando um campo específico | dado obrigatório ausente/vazio — a mensagem já informa o caminho exato (ex.: `project.installed_power_kwp`) |
| `LayoutOverflowError` | texto real maior do que o espaço reservado no layout — normalmente um campo com conteúdo muito mais longo que o do template original |
| PDF rejeitado por conter termo interno | algum texto livre (observações, nome de item) contém palavras como "margem"/"lucro"/"VPL"/"TIR" — revise o texto de origem |
| `Cannot find module` relacionado a assets Python na Vercel | verifique se `vercel.json` ainda tem o `includeFiles` apontando para `api/_proposal_generator/**` |
