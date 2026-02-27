const SITE_URL = "https://navai.luxisoft.com";

export function GET() {
  const robots = [
    "User-agent: Amazonbot",
    "Disallow: /",
    "",
    "User-agent: Applebot-Extended",
    "Disallow: /",
    "",
    "User-agent: Bytespider",
    "Disallow: /",
    "",
    "User-agent: CCBot",
    "Disallow: /",
    "",
    "User-agent: ClaudeBot",
    "Disallow: /",
    "",
    "User-agent: Google-Extended",
    "Disallow: /",
    "",
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    "User-agent: meta-externalagent",
    "Disallow: /",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /navai/",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n");

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
