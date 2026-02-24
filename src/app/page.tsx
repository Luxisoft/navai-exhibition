import HomeHero from "@/components/HomeHero";
import HomeFooterBar from "@/components/HomeFooterBar";

export default function Home() {
  const hasBackendApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <section className="home-section">
      <HomeHero hasBackendApiKey={hasBackendApiKey} />
      <HomeFooterBar />
    </section>
  );
}
