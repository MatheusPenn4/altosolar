import { FAQ as FAQ_ITEMS } from "@/lib/constants";
import { WA } from "@/lib/whatsapp";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/ui/Reveal";

export function FAQ() {
  return (
    <Section id="faq" className="bg-ink-900/40">
      <div className="container">
        <SectionHeader
          eyebrow="Dúvidas Frequentes"
          title="Tudo o que Você Precisa Saber"
          subtitle="Respostas claras para as perguntas mais comuns sobre energia solar."
        />

        <Accordion items={FAQ_ITEMS} />

        <Reveal className="mt-10 text-center">
          <p className="text-sm text-muted">
            Ainda tem dúvidas?{" "}
            <a
              href={WA.default()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-cyan underline-offset-4 hover:underline"
            >
              Fale com um especialista no WhatsApp
            </a>
            .
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
