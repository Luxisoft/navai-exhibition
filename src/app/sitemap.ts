import type { MetadataRoute } from "next";
import { NAVAI_DOCS } from "@/lib/navai-docs";

const SITE_URL = "https://navai.luxisoft.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const docsRoutes = NAVAI_DOCS.filter((doc) => doc.slug !== "playground-stores").map((doc) => ({
    url: `${SITE_URL}/documentation/${doc.slug}`,
    changeFrequency: "weekly" as const,
    priority: doc.slug === "home" ? 0.9 : 0.7,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/request-implementation`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/wordpress`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...docsRoutes,
  ];
}
