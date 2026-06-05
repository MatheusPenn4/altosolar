/**
 * A1 — Camada central de tracking.
 * Todo evento é enviado simultaneamente para GA4 (gtag) e Meta Pixel (fbq).
 * Seguro para SSR (checa window) e não quebra se os scripts ainda não carregaram.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type Params = Record<string, unknown>;

/** Envia um evento para GA4 e Meta Pixel ao mesmo tempo. */
function fire(ga4Event: string, pixelEvent: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", ga4Event, params);
  } catch {
    /* noop */
  }
  try {
    // Eventos padrão do Pixel usam fbq('track', ...); custom usam 'trackCustom'
    const standard = ["Lead", "Contact", "ViewContent", "InitiateCheckout"];
    window.fbq?.(
      standard.includes(pixelEvent) ? "track" : "trackCustom",
      pixelEvent,
      params,
    );
  } catch {
    /* noop */
  }
}

/** Lead genérico — chamado por qualquer macro-conversão. */
export function trackLead(source: string, params: Params = {}) {
  fire("generate_lead", "Lead", { source, ...params });
}

/** Clique em qualquer CTA de WhatsApp. */
export function trackWhatsApp(source: string, params: Params = {}) {
  fire("whatsapp_click", "Contact", { method: "whatsapp", source, ...params });
  trackLead(source, { channel: "whatsapp", ...params });
}

/** Clique em "Ligar Agora". */
export function trackCall(source: string, params: Params = {}) {
  fire("call_click", "Contact", { method: "phone", source, ...params });
  trackLead(source, { channel: "phone", ...params });
}

/** Interação com a calculadora de economia. */
export function trackCalculator(bill: number, monthly: number) {
  fire("calculator_use", "InitiateCheckout", {
    monthly_bill: bill,
    estimated_savings: monthly,
  });
}

/** Scroll até o CTA final. */
export function trackFinalCtaView() {
  fire("view_final_cta", "ViewContent", { section: "final_cta" });
}

/** Clique em um card de projeto. */
export function trackProjectClick(title: string, city: string) {
  fire("project_click", "ViewContent", { project: title, city });
}

/** Interação com depoimentos. */
export function trackTestimonialClick(name: string) {
  fire("testimonial_click", "ViewContent", { testimonial: name });
}
