import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Check, Phone } from "lucide-react";

import { CITY_PAGES, COMPANY } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { MobileCTABar } from "@/components/layout/MobileCTABar";
import { Button } from "@/components/ui/Button";
import { GoogleRating } from "@/components/ui/GoogleRating";

import { Trust } from "@/components/sections/Trust";
import { Stats } from "@/components/sections/Stats";
import { Calculator } from "@/components/sections/Calculator";
import { Results } from "@/components/sections/Results";
import { Benefits } from "@/components/sections/Benefits";
import { Projects } from "@/components/sections/Projects";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

// Apenas as cidades definidas são geradas; demais rotas retornam 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_PAGES.map((c) => ({ cidade: c.slug }));
}

function getCity(slug: string) {
  return CITY_PAGES.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidade: string }>;
}): Promise<Metadata> {
  const { cidade } = await params;
  const city = getCity(cidade);
  if (!city) return {};
  const title = `Energia Solar ${city.preposition} ${city.name} | Alto Solar`;
  const description = `Empresa de energia solar fotovoltaica ${city.preposition} ${city.name} - MT. +500 sistemas instalados, equipe própria e financiamento facilitado. Economize até 95% na conta de luz. Orçamento gratuito.`;
  return {
    title,
    description,
    alternates: { canonical: `/${city.slug}` },
    openGraph: { title, description, url: `${COMPANY.url}/${city.slug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ cidade: string }>;
}) {
  const { cidade } = await params;
  const city = getCity(cidade);
  if (!city) notFound();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: COMPANY.url },
      {
        "@type": "ListItem",
        position: 2,
        name: `Energia Solar ${city.preposition} ${city.name}`,
        item: `${COMPANY.url}/${city.slug}`,
      },
    ],
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Instalação de Energia Solar Fotovoltaica",
    provider: { "@type": "LocalBusiness", name: COMPANY.legalName },
    areaServed: { "@type": "City", name: city.name },
    name: `Energia Solar ${city.preposition} ${city.name}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />

      <Header />
      <main className="pb-[76px] lg:pb-0">
        {/* Hero localizado */}
        <section className="relative flex min-h-[88svh] items-center overflow-hidden pt-28">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_15%_0%,rgba(0,175,255,0.18),transparent_45%),radial-gradient(120%_120%_at_95%_20%,rgba(255,165,0,0.14),transparent_45%)]" />
          <div className="container">
            <div className="max-w-3xl">
              <span className="eyebrow">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-cyan" />
                Atendimento {city.preposition} {city.name} - MT
              </span>
              <h1 className="h-display mt-6 text-white">
                Energia Solar {city.preposition}{" "}
                <span className="text-grad-mix">{city.name}</span>
              </h1>
              <p className="lead mt-6 max-w-2xl">
                A Alto Solar instala energia solar fotovoltaica {city.preposition}{" "}
                {city.name} com equipe própria, financiamento facilitado e
                economia de até 95% na sua conta de luz. Já são mais de 500
                sistemas instalados em Mato Grosso.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {["Orçamento Gratuito", "Resposta Rápida", "Sem Compromisso"].map(
                  (p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-sm text-white/90"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-grad-blue text-ink-950">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Button
                  href={WA.orcamento()}
                  variant="amber"
                  size="lg"
                  external
                  track="whatsapp"
                  trackSource={`hero_${city.slug}`}
                >
                  Solicitar Orçamento Gratuito
                </Button>
                <Button
                  href={`tel:${COMPANY.phoneTel}`}
                  variant="outline"
                  size="lg"
                  external
                  withArrow={false}
                  track="call"
                  trackSource={`hero_${city.slug}`}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" /> Ligar Agora
                </Button>
              </div>
              <div className="mt-8">
                <GoogleRating />
              </div>
            </div>
          </div>
        </section>

        <Trust />
        <Stats />
        <Calculator />
        <Results />
        <Benefits />
        <Projects />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppFloat />
      <MobileCTABar />
    </>
  );
}
