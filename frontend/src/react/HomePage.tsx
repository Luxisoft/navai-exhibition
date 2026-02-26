import HomeFooterBar from "@/components/HomeFooterBar";
import HomeHero from "@/components/HomeHero";

import AppProvidersShell from "./AppProvidersShell";

type HomePageProps = {
  hasBackendApiKey: boolean;
};

export default function HomePage({ hasBackendApiKey }: HomePageProps) {
  return (
    <AppProvidersShell>
      <section className="home-section">
        <HomeHero hasBackendApiKey={hasBackendApiKey} />
        <HomeFooterBar />
      </section>
    </AppProvidersShell>
  );
}
