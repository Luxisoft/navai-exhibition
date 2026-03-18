import StatusPageCard from "@/components/StatusPageCard";
import { useI18n } from "@/lib/i18n/provider";

import AppProvidersShell from "./AppProvidersShell";

function NotFoundContent() {
  const { messages } = useI18n();

  return (
    <StatusPageCard
      code="404"
      title={messages.common.notFoundTitle}
      description={messages.common.notFoundDescription}
    />
  );
}

export default function NotFoundPage() {
  return (
    <AppProvidersShell>
      <NotFoundContent />
    </AppProvidersShell>
  );
}
