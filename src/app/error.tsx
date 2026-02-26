'use client';

import { useEffect } from "react";

import StatusPageCard from "@/components/StatusPageCard";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPageCard
      code="500"
      title="Ocurrio un error"
      description="Se produjo un problema inesperado al cargar esta vista."
      actionButton={{ label: "Reintentar", onClick: reset }}
    />
  );
}
