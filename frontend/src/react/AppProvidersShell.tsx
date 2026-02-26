import type { ReactNode } from "react";

import ClientProviders from "@/components/ClientProviders";

type AppProvidersShellProps = {
  children: ReactNode;
};

export default function AppProvidersShell({ children }: AppProvidersShellProps) {
  return (
    <ClientProviders>
      <div className="site-shell">
        <main className="site-main">{children}</main>
      </div>
    </ClientProviders>
  );
}
