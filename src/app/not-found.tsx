import StatusPageCard from "@/components/StatusPageCard";

export default function NotFoundPage() {
  return (
    <StatusPageCard
      code="404"
      title="Pagina no encontrada"
      description="La ruta que intentaste abrir no existe o fue movida."
    />
  );
}
