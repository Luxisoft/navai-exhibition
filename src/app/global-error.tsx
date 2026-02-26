'use client';

import { useEffect } from "react";

import StatusPageCard from "@/components/StatusPageCard";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <StatusPageCard
          code="500"
          title="Error critico"
          description="La aplicacion encontro un problema inesperado."
          actionButton={{ label: "Reintentar", onClick: reset }}
        />
      </body>
    </html>
  );
}
