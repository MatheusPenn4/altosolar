"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  trackWhatsApp,
  trackCall,
  trackFinalCtaView,
} from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * A1 — Bootstrap de analytics.
 * - Carrega GA4 e Meta Pixel (somente se os IDs estiverem definidos).
 * - Delegação global: qualquer link com data-track="whatsapp|call" é
 *   rastreado automaticamente, sem precisar tornar cada seção client.
 * - Observa o CTA final e dispara o evento de scroll.
 */
export function Analytics() {
  useEffect(() => {
    // Delegação de cliques de WhatsApp / Ligar
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(
        "[data-track]",
      ) as HTMLElement | null;
      if (!el) return;
      const type = el.dataset.track;
      const source = el.dataset.trackSource || "desconhecido";
      if (type === "whatsapp") trackWhatsApp(source);
      else if (type === "call") trackCall(source);
    };
    document.addEventListener("click", onClick);

    // Observa o CTA final
    const sentinel = document.getElementById("cta-final");
    let fired = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !fired) {
          fired = true;
          trackFinalCtaView();
        }
      },
      { threshold: 0.4 },
    );
    if (sentinel) io.observe(sentinel);

    return () => {
      document.removeEventListener("click", onClick);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}

      {PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
