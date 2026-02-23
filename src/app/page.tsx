import HomeHero from "@/components/HomeHero";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function Home() {
  const hasBackendApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <section className="home-section">
      <HomeHero hasBackendApiKey={hasBackendApiKey} />

      <div className="home-footer-bar">
        <a
          className="home-byline"
          href="https://luxisoft.com/en/"
          target="_blank"
          rel="noopener noreferrer"
        >
          By LUXISOFT
        </a>
        <div className="home-footer-controls">
          <LanguageSwitcher compact selectId="home-lang-select" />
          <ThemeSwitcher />
        </div>
      </div>
    </section>
  );
}
