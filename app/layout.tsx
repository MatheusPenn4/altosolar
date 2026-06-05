import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { COMPANY, FAQ } from "@/lib/constants";
import { Analytics } from "@/components/analytics/Analytics";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default:
      "Alto Solar | Energia Solar em Cuiabá e Mato Grosso — Economize até 95%",
    template: "%s | Alto Solar",
  },
  description:
    "Empresa de energia solar fotovoltaica em Cuiabá e Mato Grosso. +500 sistemas instalados, equipe própria, instalação rápida e financiamento facilitado. Economize até 95% na conta de luz. Solicite seu orçamento gratuito.",
  keywords: [
    "energia solar cuiabá",
    "energia solar mato grosso",
    "placa solar cuiabá",
    "energia fotovoltaica cuiabá",
    "empresa de energia solar cuiabá",
    "instalação solar cuiabá",
    "painel solar mato grosso",
    "energia solar várzea grande",
  ],
  authors: [{ name: COMPANY.name }],
  creator: COMPANY.name,
  alternates: { canonical: "/" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: COMPANY.url,
    siteName: COMPANY.name,
    title: "Alto Solar | Energia Solar em Cuiabá e Mato Grosso",
    description:
      "+500 sistemas instalados. Equipe própria, instalação rápida e financiamento facilitado. Economize até 95% na conta de luz.",
    images: [
      {
        url: "/logo.png",
        width: 351,
        height: 341,
        alt: "Alto Solar — Energia Solar em Cuiabá e Mato Grosso",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alto Solar | Energia Solar em Cuiabá e Mato Grosso",
    description:
      "+500 sistemas instalados. Economize até 95% na conta de luz com a empresa de energia solar mais confiável da região.",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

/** M4 — LocalBusiness completo */
const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Electrician"],
  name: COMPANY.legalName,
  image: `${COMPANY.url}/logo.png`,
  logo: `${COMPANY.url}/logo.png`,
  "@id": COMPANY.url,
  url: COMPANY.url,
  telephone: COMPANY.phoneTel,
  email: COMPANY.email,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY.addressFull,
    addressLocality: "Cuiabá",
    addressRegion: "MT",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: COMPANY.geo.lat,
    longitude: COMPANY.geo.lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "08:00",
      closes: "12:00",
    },
  ],
  sameAs: [
    COMPANY.social.instagram,
    COMPANY.social.facebook,
    COMPANY.social.googleBusiness,
  ],
  areaServed: [
    "Cuiabá",
    "Várzea Grande",
    "Chapada dos Guimarães",
    "Santo Antônio de Leverger",
    "Campo Verde",
    "Tangará da Serra",
    "Mato Grosso",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: COMPANY.rating.count,
  },
  description:
    "Energia solar fotovoltaica em Cuiabá e Mato Grosso com equipe própria e financiamento facilitado.",
};

/** A7 — FAQPage para rich snippets */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
