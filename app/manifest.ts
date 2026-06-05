import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY.name} — Energia Solar em Cuiabá e Mato Grosso`,
    short_name: COMPANY.name,
    description:
      "Energia solar fotovoltaica em Cuiabá e Mato Grosso. Economize até 95% na conta de luz.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/logo.png", sizes: "351x341", type: "image/png" },
      {
        src: "/logo.png",
        sizes: "351x341",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
