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
