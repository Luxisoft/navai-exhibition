import StatusPageCard from "@/components/StatusPageCard";

import AppProvidersShell from "./AppProvidersShell";

export default function NotFoundPage() {
  return (
    <AppProvidersShell>
      <StatusPageCard
        code="404"
        title="Pagina no encontrada"
        description="La ruta que intentaste abrir no existe o fue movida."
      />
    </AppProvidersShell>
  );
}
