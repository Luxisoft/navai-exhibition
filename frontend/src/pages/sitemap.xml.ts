import { NAVAI_DOCS } from "@/lib/navai-docs";

const SITE_URL = "https://navai.luxisoft.com";

function asUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function GET() {
  const staticRoutes = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/request-implementation", changefreq: "monthly", priority: "0.7" },
  ];

  const docsRoutes = NAVAI_DOCS.filter((doc) => doc.slug !== "playground-stores").map((doc) => ({
    path: `/documentation/${doc.slug}`,
    changefreq: "weekly",
    priority: doc.slug === "home" ? "0.9" : "0.7",
  }));

  const entries = [...staticRoutes, ...docsRoutes]
    .map(
      (item) =>
        `<url><loc>${asUrl(item.path)}</loc><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
