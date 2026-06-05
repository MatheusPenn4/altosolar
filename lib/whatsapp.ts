import { COMPANY } from "./constants";

/**
 * Gerador central de links do WhatsApp.
 * TODA conversão da página passa por aqui. A mensagem é contextual
 * (varia conforme a seção de origem) para qualificar melhor o lead.
 */
export function whatsappLink(message?: string): string {
  const phone = COMPANY.whatsappNumber; // formato internacional, só dígitos
  const text = encodeURIComponent(message ?? COMPANY.defaultWhatsappMessage);
  return `https://wa.me/${phone}?text=${text}`;
}

export const WA = {
  default: () => whatsappLink(),
  orcamento: () =>
    whatsappLink(
      "Olá, Alto Solar! Quero solicitar um orçamento gratuito de energia solar. Pode me ajudar?",
    ),
  simulacao: (mensal?: number, anos25?: number) =>
    whatsappLink(
      mensal && anos25
        ? `Olá, Alto Solar! Fiz a simulação no site e posso economizar cerca de R$ ${mensal.toLocaleString("pt-BR")}/mês (R$ ${anos25.toLocaleString("pt-BR")} em 25 anos). Quero receber minha simulação detalhada!`
        : "Olá, Alto Solar! Quero simular minha economia com energia solar.",
    ),
  projeto: (tipo: string, cidade: string) =>
    whatsappLink(
      `Olá, Alto Solar! Vi o projeto ${tipo} em ${cidade} e quero um projeto parecido para mim. Pode me passar um orçamento?`,
    ),
};
