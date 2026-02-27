import HomeFooterBar from "@/components/HomeFooterBar";
import HomeHero from "@/components/HomeHero";

import AppProvidersShell from "./AppProvidersShell";

export default function HomePage() {
  return (
    <AppProvidersShell>
      <section className="home-section">
        <HomeHero />
        <HomeFooterBar />
      </section>
    </AppProvidersShell>
  );
}
