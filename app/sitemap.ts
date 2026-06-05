import type { MetadataRoute } from "next";
import { COMPANY, CITY_PAGES } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: COMPANY.url,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...CITY_PAGES.map((c) => ({
      url: `${COMPANY.url}/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
