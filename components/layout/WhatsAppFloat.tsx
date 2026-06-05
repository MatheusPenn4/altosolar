"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WA } from "@/lib/whatsapp";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.04c-.24.68-1.42 1.31-1.96 1.36-.5.05-1.13.07-1.83-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.04.89 2.18.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.19.68-.79.86-1.07.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.27.13.45.2.51.31.07.11.07.63-.17 1.31Z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href={WA.simulacao()}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          data-track="whatsapp"
          data-track-source="float"
          className="group fixed bottom-7 right-7 z-50 hidden items-center gap-3 rounded-full bg-[#25D366] py-3 pl-3 pr-4 font-semibold text-ink-950 shadow-[0_8px_30px_rgba(37,211,102,0.5)] lg:flex"
          aria-label="Fale conosco no WhatsApp"
        >
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-40" />
          <WhatsAppIcon className="h-7 w-7" />
          <span className="hidden text-sm sm:inline">Simule sua Economia</span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
