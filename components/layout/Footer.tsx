import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { COMPANY, NAV, CITIES } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer
      id="contato"
      className="relative scroll-mt-24 border-t border-hair bg-ink-900"
    >
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Energia solar fotovoltaica com equipe própria, mais de 500
              sistemas instalados e financiamento facilitado em todo o Mato
              Grosso.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={COMPANY.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hair text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={COMPANY.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hair text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Navegação
            </h3>
            <ul className="space-y-3 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="text-muted transition-colors hover:text-white"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Atuação
            </h3>
            <ul className="space-y-3 text-sm">
              {CITIES.map((c) => (
                <li key={c.name} className="text-muted">
                  {c.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Contato
            </h3>
            <ul className="space-y-4 text-sm">
              <li>
                <a
                  href={`tel:+${COMPANY.whatsappNumber}`}
                  className="flex items-center gap-3 text-muted transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 text-brand-cyan" />
                  {COMPANY.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="flex items-center gap-3 text-muted transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 text-brand-cyan" />
                  {COMPANY.email}
                </a>
              </li>
              <li className="flex items-center gap-3 text-muted">
                <MapPin className="h-4 w-4 text-brand-cyan" />
                {COMPANY.address}
              </li>
            </ul>
            <a
              href={WA.orcamento()}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp"
              data-track-source="footer"
              className="mt-6 inline-flex rounded-full bg-grad-blue px-5 py-3 text-sm font-semibold text-ink-950 shadow-glow"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* A3 — dados institucionais para credibilidade */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair pt-8 text-xs text-muted">
          <span>CNPJ: {COMPANY.cnpj}</span>
          <span>{COMPANY.crea}</span>
          <span>Projetos homologados na Energisa MT</span>
          <span>Equipe própria de instalação</span>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-hair pt-8 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {COMPANY.legalName}. Todos os direitos
            reservados.
          </p>
          <p>Energia Solar em Cuiabá e todo o Mato Grosso.</p>
        </div>
      </div>
    </footer>
  );
}
