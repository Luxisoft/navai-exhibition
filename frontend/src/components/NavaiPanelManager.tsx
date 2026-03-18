"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DomainListLoadingSkeleton,
  PanelContentSkeleton,
} from "@/components/AppShellSkeletons";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createNavaiPanelDomain,
  deleteNavaiPanelDomain,
  listNavaiPanelDomains,
  updateNavaiPanelDomain,
  type NavaiPanelDomain,
  type NavaiPanelDomainInput,
  type NavaiPanelFunction,
  type NavaiPanelParameter,
  type NavaiPanelRoute,
} from "@/lib/navai-panel-api";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";

type DomainDraft = {
  id: string | null;
  domain: string;
  label: string;
  description: string;
  routes: NavaiPanelRoute[];
  functions: NavaiPanelFunction[];
  parameters: NavaiPanelParameter[];
};

type DomainDialogDraft = Pick<
  DomainDraft,
  "id" | "domain" | "label" | "description"
>;

type WebsiteDomainFormPatch = Partial<
  Pick<DomainDialogDraft, "domain" | "label" | "description">
>;
type WebsiteDomainFormEventDetail = {
  openDialog?: boolean;
  target?: "new" | "selected";
  patch?: WebsiteDomainFormPatch;
};

type WebsiteRouteFormPatch = Partial<
  Pick<NavaiPanelRoute, "url" | "label" | "description" | "openInNewTab">
>;
type WebsiteRouteFormEventDetail = {
  openDialog?: boolean;
  patch?: WebsiteRouteFormPatch;
};

type WebsiteFunctionFormPatch = Partial<
  Pick<NavaiPanelFunction, "name" | "label" | "description" | "code">
>;
type WebsiteFunctionFormEventDetail = {
  openDialog?: boolean;
  patch?: WebsiteFunctionFormPatch;
};

type WebsiteParameterFormPatch = Partial<
  Pick<NavaiPanelParameter, "key" | "value" | "description">
>;
type WebsiteParameterFormEventDetail = {
  openDialog?: boolean;
  patch?: WebsiteParameterFormPatch;
};

type NavaiPanelManagerSlots = {
  renderDomainListSection: (options?: { mobile?: boolean }) => ReactNode;
  renderEditorSection: () => ReactNode;
};

type NavaiPanelManagerProps = {
  children: (slots: NavaiPanelManagerSlots) => ReactNode;
};

const PANEL_TABS = ["routes", "functions", "parameters"] as const;
const WEBSITE_DOMAIN_FORM_EVENT = "navai:panel-web-domain-form";
const WEBSITE_DOMAIN_SAVE_EVENT = "navai:panel-web-domain-save";
const WEBSITE_EDITOR_SAVE_EVENT = "navai:panel-web-editor-save";
const WEBSITE_ROUTE_FORM_EVENT = "navai:panel-web-route-form";
const WEBSITE_ROUTE_SAVE_EVENT = "navai:panel-web-route-save";
const WEBSITE_FUNCTION_FORM_EVENT = "navai:panel-web-function-form";
const WEBSITE_FUNCTION_SAVE_EVENT = "navai:panel-web-function-save";
const WEBSITE_PARAMETER_FORM_EVENT = "navai:panel-web-parameter-form";
const WEBSITE_PARAMETER_SAVE_EVENT = "navai:panel-web-parameter-save";
const DEFAULT_FUNCTION_CODE = `export async function your_function(payload) {
  return {
    ok: true,
    payload,
  };
}`;
const DEFAULT_PARAMETER_SEEDS = [
  {
    key: "PUBLIC_ORB_AUTOPLAY_DELAY_MS",
    value: "0",
  },
  {
    key: "PUBLIC_ORB_REVEAL_DELAY_MS",
    value: "0",
  },
  {
    key: "PUBLIC_VOICE_PANEL_REVEAL_DELAY_MS",
    value: "0",
  },
  {
    key: "OPENAI_REALTIME_MODEL",
    value: "gpt-realtime-mini",
  },
  {
    key: "OPENAI_REALTIME_VOICE",
    value: "marin",
  },
  {
    key: "OPENAI_REALTIME_INSTRUCTIONS",
    value:
      "Eres NAVAI, un agente de voz en tiempo real para navegacion de interfaces web y moviles, ejecucion de funciones frontend/backend y asistencia accesible manos libres. Tu objetivo es ayudar al usuario a entender y usar la pagina actual con respuestas claras y accionables. Puedes: resumir y explicar el contenido visible, responder preguntas sobre la pagina actual, guiar pasos dentro del sitio, navegar rutas disponibles y ejecutar solo funciones/herramientas autorizadas. Interpreta solicitudes naturales como 'resumeme esta pagina', 'que dice aqui' o 'que informacion hay en esta pantalla' como una peticion de leer el contenido actual y usa las herramientas internas necesarias sin pedir nombres tecnicos al usuario. No puedes: inventar informacion, afirmar acciones no ejecutadas, acceder a datos privados no expuestos, revelar secretos (api keys, tokens, credenciales) ni realizar acciones sensibles sin confirmacion explicita del usuario. Si falta contexto o hay ambiguedad, pide una aclaracion breve antes de actuar. Responde de forma breve, clara y profesional, en el idioma del usuario, priorizando accesibilidad y lenguaje no tecnico cuando sea posible.",
  },
  {
    key: "OPENAI_REALTIME_LANGUAGE",
    value: "Spanish",
  },
  {
    key: "OPENAI_REALTIME_VOICE_ACCENT",
    value: "neutral Latin American Spanish",
  },
  {
    key: "OPENAI_REALTIME_VOICE_TONE",
    value: "friendly and professional",
  },
  {
    key: "OPENAI_REALTIME_CLIENT_SECRET_TTL",
    value: "600",
  },
] as const;

function normalizeDisplayText(value: string) {
  return stripLeadingDecorativeText(value);
}

function formatCountLabel(template: string, selected: number, total: number) {
  return normalizeDisplayText(template)
    .replace("{selected}", String(selected))
    .replace("{total}", String(total));
}

function renderSortableHeader(
  label: string,
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  },
) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto min-w-0 justify-start gap-1 px-0 py-0 text-left whitespace-normal normal-case"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{normalizeDisplayText(label)}</span>
      <ArrowUpDown aria-hidden="true" />
    </Button>
  );
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugifyParameterKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFunctionNameInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

function cloneRoute(route: NavaiPanelRoute): NavaiPanelRoute {
  return { ...route };
}

function cloneFunction(item: NavaiPanelFunction): NavaiPanelFunction {
  return { ...item };
}

function cloneParameter(parameter: NavaiPanelParameter): NavaiPanelParameter {
  return { ...parameter };
}

function createDefaultParameters() {
  return DEFAULT_PARAMETER_SEEDS.map((parameter) => ({
    id: `parameter-${slugifyParameterKey(parameter.key)}`,
    key: parameter.key,
    value: parameter.value,
    description: "",
  }));
}

function ensureDefaultParameters(parameters: NavaiPanelParameter[]) {
  const cloned = parameters.map(cloneParameter);
  const keys = new Set(cloned.map((parameter) => parameter.key));

  for (const parameter of createDefaultParameters()) {
    if (!keys.has(parameter.key)) {
      cloned.push(parameter);
    }
  }

  return cloned;
}

function createEmptyDraft(): DomainDraft {
  return {
    id: null,
    domain: "",
    label: "",
    description: "",
    routes: [],
    functions: [],
    parameters: createDefaultParameters(),
  };
}

function createEmptyDomainDialogDraft(): DomainDialogDraft {
  return {
    id: null,
    domain: "",
    label: "",
    description: "",
  };
}

function createEmptyRouteDraft(): NavaiPanelRoute {
  return {
    id: createLocalId("route"),
    label: "",
    url: "",
    description: "",
    openInNewTab: false,
  };
}

function createEmptyFunctionDraft(): NavaiPanelFunction {
  return {
    id: createLocalId("function"),
    name: "",
    label: "",
    description: "",
    code: DEFAULT_FUNCTION_CODE,
  };
}

function createEmptyParameterDraft(): NavaiPanelParameter {
  return {
    id: createLocalId("parameter"),
    key: "",
    value: "",
    description: "",
  };
}

function createDraftFromDomain(item: NavaiPanelDomain): DomainDraft {
  return {
    id: item.id,
    domain: item.domain,
    label: item.label,
    description: item.description,
    routes: item.routes.map(cloneRoute),
    functions: item.functions.map(cloneFunction),
    parameters: ensureDefaultParameters(item.parameters),
  };
}

function createDomainDialogDraftFromDomain(
  item: Pick<NavaiPanelDomain, "id" | "domain" | "label" | "description">,
): DomainDialogDraft {
  return {
    id: item.id,
    domain: item.domain,
    label: item.label,
    description: item.description,
  };
}

function replaceDomainItem(
  items: NavaiPanelDomain[],
  nextItem: NavaiPanelDomain,
) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex < 0) {
    return [...items, nextItem].sort((left, right) =>
      left.domain.localeCompare(right.domain),
    );
  }

  const nextItems = [...items];
  nextItems.splice(existingIndex, 1, nextItem);
  return nextItems.sort((left, right) =>
    left.domain.localeCompare(right.domain),
  );
}

function upsertCollectionItem<T extends { id: string }>(
  items: T[],
  nextItem: T,
) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex < 0) {
    return [...items, nextItem];
  }

  const nextItems = [...items];
  nextItems.splice(existingIndex, 1, nextItem);
  return nextItems;
}

function removeCollectionItem<T extends { id: string }>(
  items: T[],
  itemId: string,
) {
  return items.filter((item) => item.id !== itemId);
}

function buildDomainInputFromDraft(draft: DomainDraft): NavaiPanelDomainInput {
  return {
    domain: draft.domain.trim(),
    label: draft.label.trim(),
    description: draft.description.trim(),
    routes: draft.routes.map(cloneRoute),
    functions: draft.functions.map(cloneFunction),
    parameters: ensureDefaultParameters(draft.parameters),
  };
}

export default function NavaiPanelManager({
  children,
}: NavaiPanelManagerProps) {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const { canDeleteTableData, canEditTableData } = useNavaiPanelAccess();
  const copy = messages.panelPage;
  const [domains, setDomains] = useState<NavaiPanelDomain[]>([]);
  const [draft, setDraft] = useState<DomainDraft>(() => createEmptyDraft());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const [domainDialogDraft, setDomainDialogDraft] = useState<DomainDialogDraft>(
    () => createEmptyDomainDialogDraft(),
  );
  const [domainDialogError, setDomainDialogError] = useState("");
  const [isDeleteDomainDialogOpen, setIsDeleteDomainDialogOpen] =
    useState(false);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [routeDialogDraft, setRouteDialogDraft] = useState<NavaiPanelRoute>(
    () => createEmptyRouteDraft(),
  );
  const [routeDialogError, setRouteDialogError] = useState("");
  const [isFunctionDialogOpen, setIsFunctionDialogOpen] = useState(false);
  const [functionDialogDraft, setFunctionDialogDraft] =
    useState<NavaiPanelFunction>(() => createEmptyFunctionDraft());
  const [functionDialogError, setFunctionDialogError] = useState("");
  const [isParameterDialogOpen, setIsParameterDialogOpen] = useState(false);
  const [parameterDialogDraft, setParameterDialogDraft] =
    useState<NavaiPanelParameter>(() => createEmptyParameterDraft());
  const [parameterDialogError, setParameterDialogError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedDomain = useMemo(
    () => domains.find((item) => item.id === selectedId) ?? null,
    [domains, selectedId],
  );
  const hasSelectedDomain = Boolean(selectedDomain && draft.id);

  const readIdToken = async () => {
    const idToken = await user?.getIdToken();
    if (!idToken) {
      throw new Error("Authentication required.");
    }

    return idToken;
  };

  const tabLabels = useMemo(
    () => ({
      routes: normalizeDisplayText(copy.routesTabLabel),
      functions: normalizeDisplayText(copy.functionsTabLabel),
      parameters: normalizeDisplayText(copy.parametersTabLabel),
    }),
    [copy.functionsTabLabel, copy.parametersTabLabel, copy.routesTabLabel],
  );

  const applyDraftChange = (updater: (current: DomainDraft) => DomainDraft) => {
    setDraft((current) => updater(current));
    setError("");
    setNotice(normalizeDisplayText(copy.draftUpdatedMessage));
  };

  useEffect(() => {
    let isMounted = true;

    const loadDomains = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await listNavaiPanelDomains(await readIdToken());
        if (!isMounted) {
          return;
        }

        setDomains(response.items);
        if (response.items.length > 0) {
          setSelectedId(response.items[0].id);
          setDraft(createDraftFromDomain(response.items[0]));
        } else {
          setSelectedId(null);
          setDraft(createEmptyDraft());
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : normalizeDisplayText(copy.loadErrorMessage),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDomains();

    return () => {
      isMounted = false;
    };
  }, [copy.loadErrorMessage, user]);

  const handleSelectDomain = (item: NavaiPanelDomain) => {
    setSelectedId(item.id);
    setDraft(createDraftFromDomain(item));
    setError("");
    setNotice("");
  };

  const openCreateDomainDialog = () => {
    if (!canEditTableData) {
      return;
    }

    setDomainDialogDraft(createEmptyDomainDialogDraft());
    setDomainDialogError("");
    setIsDomainDialogOpen(true);
  };

  const openEditDomainDialog = () => {
    if (!selectedDomain || !canEditTableData) {
      return;
    }

    const nextDraft =
      draft.id === selectedDomain.id
        ? {
            id: draft.id,
            domain: draft.domain,
            label: draft.label,
            description: draft.description,
          }
        : createDomainDialogDraftFromDomain(selectedDomain);

    setDomainDialogDraft(nextDraft);
    setDomainDialogError("");
    setIsDomainDialogOpen(true);
  };

  const handleDomainDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSaving) {
      return;
    }

    setIsDomainDialogOpen(nextOpen);
    if (!nextOpen) {
      setDomainDialogError("");
    }
  };

  const updateDomainDialogDraft = <Key extends keyof DomainDialogDraft>(
    key: Key,
    value: DomainDialogDraft[Key],
  ) => {
    setDomainDialogDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setError("");
    setNotice("");
  };

  const buildDomainDialogPayload = (): NavaiPanelDomainInput => {
    if (!domainDialogDraft.id) {
      return {
        domain: domainDialogDraft.domain.trim(),
        label: domainDialogDraft.label.trim(),
        description: domainDialogDraft.description.trim(),
        functions: [],
        routes: [],
        parameters: createDefaultParameters(),
      };
    }

    if (draft.id === domainDialogDraft.id) {
      const currentPayload = buildDomainInputFromDraft(draft);
      return {
        ...currentPayload,
        domain: domainDialogDraft.domain.trim(),
        label: domainDialogDraft.label.trim(),
        description: domainDialogDraft.description.trim(),
      };
    }

    const existingItem = domains.find(
      (item) => item.id === domainDialogDraft.id,
    );
    return {
      domain: domainDialogDraft.domain.trim(),
      label: domainDialogDraft.label.trim(),
      description: domainDialogDraft.description.trim(),
      functions: existingItem?.functions.map(cloneFunction) ?? [],
      routes: existingItem?.routes.map(cloneRoute) ?? [],
      parameters: ensureDefaultParameters(existingItem?.parameters ?? []),
    };
  };

  const handleSaveDomainDialog = async () => {
    if (!canEditTableData) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    setDomainDialogError("");

    try {
      const payload = buildDomainDialogPayload();
      const idToken = await readIdToken();
      const response = domainDialogDraft.id
        ? await updateNavaiPanelDomain(idToken, domainDialogDraft.id, payload)
        : await createNavaiPanelDomain(idToken, payload);
      const nextItem = response.item;

      setDomains((current) => replaceDomainItem(current, nextItem));
      setSelectedId(nextItem.id);
      setDraft(createDraftFromDomain(nextItem));
      setNotice(
        normalizeDisplayText(
          domainDialogDraft.id
            ? copy.saveSuccessMessage
            : copy.createSuccessMessage,
        ),
      );
      setIsDomainDialogOpen(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : normalizeDisplayText(copy.saveErrorMessage);
      setError(message);
      setDomainDialogError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!draft.id || !canEditTableData) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await updateNavaiPanelDomain(
        await readIdToken(),
        draft.id,
        buildDomainInputFromDraft(draft),
      );
      const nextItem = response.item;

      setDomains((current) => replaceDomainItem(current, nextItem));
      setSelectedId(nextItem.id);
      setDraft(createDraftFromDomain(nextItem));
      setNotice(normalizeDisplayText(copy.saveSuccessMessage));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : normalizeDisplayText(copy.saveErrorMessage),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const persistCurrentDraft = async () => {
    await handleSave();
  };

  const handleDelete = async () => {
    if (!draft.id || !canDeleteTableData) {
      return;
    }

    setIsDeleting(true);
    setError("");
    setNotice("");

    try {
      const deletedId = draft.id;
      await deleteNavaiPanelDomain(await readIdToken(), deletedId);
      const nextItems = domains.filter((item) => item.id !== deletedId);
      setDomains(nextItems);

      if (nextItems.length > 0) {
        setSelectedId(nextItems[0].id);
        setDraft(createDraftFromDomain(nextItems[0]));
      } else {
        setSelectedId(null);
        setDraft(createEmptyDraft());
      }

      setNotice(normalizeDisplayText(copy.deleteSuccessMessage));
      setIsDeleteDomainDialogOpen(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : normalizeDisplayText(copy.deleteErrorMessage),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateRouteDialog = () => {
    if (!canEditTableData) {
      return;
    }

    setRouteDialogDraft(createEmptyRouteDraft());
    setRouteDialogError("");
    setIsRouteDialogOpen(true);
  };

  const openEditRouteDialog = (item: NavaiPanelRoute) => {
    if (!canEditTableData) {
      return;
    }

    setRouteDialogDraft(cloneRoute(item));
    setRouteDialogError("");
    setIsRouteDialogOpen(true);
  };

  const handleSaveRouteDialog = () => {
    if (!canEditTableData) {
      return;
    }

    const nextUrl = routeDialogDraft.url.trim();
    if (!nextUrl) {
      setRouteDialogError(normalizeDisplayText(copy.routeUrlRequiredMessage));
      return;
    }

    const nextRoute: NavaiPanelRoute = {
      ...routeDialogDraft,
      url: nextUrl,
      label: routeDialogDraft.label.trim() || nextUrl,
      description: routeDialogDraft.description.trim(),
    };

    applyDraftChange((current) => ({
      ...current,
      routes: upsertCollectionItem(current.routes, nextRoute),
    }));
    setIsRouteDialogOpen(false);
  };

  const handleDeleteRoute = (itemId: string) => {
    if (!canDeleteTableData) {
      return;
    }

    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(
        normalizeDisplayText(copy.routeDeleteConfirmMessage),
      );
      if (!shouldDelete) {
        return;
      }
    }

    applyDraftChange((current) => ({
      ...current,
      routes: removeCollectionItem(current.routes, itemId),
    }));
  };

  const openCreateFunctionDialog = () => {
    if (!canEditTableData) {
      return;
    }

    setFunctionDialogDraft(createEmptyFunctionDraft());
    setFunctionDialogError("");
    setIsFunctionDialogOpen(true);
  };

  const openEditFunctionDialog = (item: NavaiPanelFunction) => {
    if (!canEditTableData) {
      return;
    }

    setFunctionDialogDraft(cloneFunction(item));
    setFunctionDialogError("");
    setIsFunctionDialogOpen(true);
  };

  const handleSaveFunctionDialog = () => {
    if (!canEditTableData) {
      return;
    }

    const nextName = normalizeFunctionNameInput(functionDialogDraft.name);
    if (!nextName) {
      setFunctionDialogError(
        normalizeDisplayText(copy.functionNameRequiredMessage),
      );
      return;
    }

    const nextCode = functionDialogDraft.code.trim();
    if (!nextCode) {
      setFunctionDialogError(
        normalizeDisplayText(copy.functionCodeRequiredMessage),
      );
      return;
    }

    const nextFunction: NavaiPanelFunction = {
      ...functionDialogDraft,
      name: nextName,
      label: functionDialogDraft.label.trim() || nextName,
      description: functionDialogDraft.description.trim(),
      code: nextCode,
    };

    applyDraftChange((current) => ({
      ...current,
      functions: upsertCollectionItem(current.functions, nextFunction),
    }));
    setIsFunctionDialogOpen(false);
  };

  const handleDeleteFunction = (itemId: string) => {
    if (!canDeleteTableData) {
      return;
    }

    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(
        normalizeDisplayText(copy.functionDeleteConfirmMessage),
      );
      if (!shouldDelete) {
        return;
      }
    }

    applyDraftChange((current) => ({
      ...current,
      functions: removeCollectionItem(current.functions, itemId),
    }));
  };

  const openCreateParameterDialog = () => {
    if (!canEditTableData) {
      return;
    }

    setParameterDialogDraft(createEmptyParameterDraft());
    setParameterDialogError("");
    setIsParameterDialogOpen(true);
  };

  const openEditParameterDialog = (item: NavaiPanelParameter) => {
    if (!canEditTableData) {
      return;
    }

    setParameterDialogDraft(cloneParameter(item));
    setParameterDialogError("");
    setIsParameterDialogOpen(true);
  };

  const handleSaveParameterDialog = () => {
    if (!canEditTableData) {
      return;
    }

    const nextKey = parameterDialogDraft.key.trim();
    if (!nextKey) {
      setParameterDialogError(
        normalizeDisplayText(copy.parameterKeyRequiredMessage),
      );
      return;
    }

    const nextParameter: NavaiPanelParameter = {
      ...parameterDialogDraft,
      key: nextKey,
      value: parameterDialogDraft.value.trim(),
      description: parameterDialogDraft.description.trim(),
    };

    applyDraftChange((current) => ({
      ...current,
      parameters: upsertCollectionItem(current.parameters, nextParameter),
    }));
    setIsParameterDialogOpen(false);
  };

  const handleDeleteParameter = (itemId: string) => {
    if (!canDeleteTableData) {
      return;
    }

    if (typeof window !== "undefined") {
      const shouldDelete = window.confirm(
        normalizeDisplayText(copy.parameterDeleteConfirmMessage),
      );
      if (!shouldDelete) {
        return;
      }
    }

    applyDraftChange((current) => ({
      ...current,
      parameters: removeCollectionItem(current.parameters, itemId),
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleDomainFormEvent = (event: Event) => {
      if (!canEditTableData) {
        return;
      }

      const customEvent = event as CustomEvent<WebsiteDomainFormEventDetail>;
      const patch = customEvent.detail?.patch ?? {};
      const target = customEvent.detail?.target ?? "new";

      if (target === "selected") {
        if (!selectedDomain) {
          return;
        }

        const nextDraft =
          draft.id === selectedDomain.id
            ? {
                id: draft.id,
                domain: draft.domain,
                label: draft.label,
                description: draft.description,
              }
            : createDomainDialogDraftFromDomain(selectedDomain);

        setDomainDialogDraft({
          ...nextDraft,
          ...patch,
        });
      } else {
        setDomainDialogDraft({
          ...createEmptyDomainDialogDraft(),
          ...patch,
        });
      }

      setDomainDialogError("");
      setError("");
      setNotice("");
      if (customEvent.detail?.openDialog !== false) {
        setIsDomainDialogOpen(true);
      }
    };

    const handleRouteFormEvent = (event: Event) => {
      if (!selectedDomain || !canEditTableData) {
        return;
      }

      const customEvent = event as CustomEvent<WebsiteRouteFormEventDetail>;
      setRouteDialogDraft({
        ...createEmptyRouteDraft(),
        ...(customEvent.detail?.patch ?? {}),
      });
      setRouteDialogError("");
      setError("");
      setNotice("");
      if (customEvent.detail?.openDialog !== false) {
        setIsRouteDialogOpen(true);
      }
    };

    const handleFunctionFormEvent = (event: Event) => {
      if (!selectedDomain || !canEditTableData) {
        return;
      }

      const customEvent = event as CustomEvent<WebsiteFunctionFormEventDetail>;
      setFunctionDialogDraft({
        ...createEmptyFunctionDraft(),
        ...(customEvent.detail?.patch ?? {}),
      });
      setFunctionDialogError("");
      setError("");
      setNotice("");
      if (customEvent.detail?.openDialog !== false) {
        setIsFunctionDialogOpen(true);
      }
    };

    const handleParameterFormEvent = (event: Event) => {
      if (!selectedDomain || !canEditTableData) {
        return;
      }

      const customEvent = event as CustomEvent<WebsiteParameterFormEventDetail>;
      setParameterDialogDraft({
        ...createEmptyParameterDraft(),
        ...(customEvent.detail?.patch ?? {}),
      });
      setParameterDialogError("");
      setError("");
      setNotice("");
      if (customEvent.detail?.openDialog !== false) {
        setIsParameterDialogOpen(true);
      }
    };

    const handleDomainSaveEvent = () => {
      void handleSaveDomainDialog();
    };

    const handleEditorSaveEvent = () => {
      void persistCurrentDraft();
    };

    const handleRouteSaveEvent = () => {
      handleSaveRouteDialog();
    };

    const handleFunctionSaveEvent = () => {
      handleSaveFunctionDialog();
    };

    const handleParameterSaveEvent = () => {
      handleSaveParameterDialog();
    };

    window.addEventListener(
      WEBSITE_DOMAIN_FORM_EVENT,
      handleDomainFormEvent as EventListener,
    );
    window.addEventListener(WEBSITE_DOMAIN_SAVE_EVENT, handleDomainSaveEvent);
    window.addEventListener(WEBSITE_EDITOR_SAVE_EVENT, handleEditorSaveEvent);
    window.addEventListener(
      WEBSITE_ROUTE_FORM_EVENT,
      handleRouteFormEvent as EventListener,
    );
    window.addEventListener(WEBSITE_ROUTE_SAVE_EVENT, handleRouteSaveEvent);
    window.addEventListener(
      WEBSITE_FUNCTION_FORM_EVENT,
      handleFunctionFormEvent as EventListener,
    );
    window.addEventListener(
      WEBSITE_FUNCTION_SAVE_EVENT,
      handleFunctionSaveEvent,
    );
    window.addEventListener(
      WEBSITE_PARAMETER_FORM_EVENT,
      handleParameterFormEvent as EventListener,
    );
    window.addEventListener(
      WEBSITE_PARAMETER_SAVE_EVENT,
      handleParameterSaveEvent,
    );

    return () => {
      window.removeEventListener(
        WEBSITE_DOMAIN_FORM_EVENT,
        handleDomainFormEvent as EventListener,
      );
      window.removeEventListener(
        WEBSITE_DOMAIN_SAVE_EVENT,
        handleDomainSaveEvent,
      );
      window.removeEventListener(
        WEBSITE_EDITOR_SAVE_EVENT,
        handleEditorSaveEvent,
      );
      window.removeEventListener(
        WEBSITE_ROUTE_FORM_EVENT,
        handleRouteFormEvent as EventListener,
      );
      window.removeEventListener(
        WEBSITE_ROUTE_SAVE_EVENT,
        handleRouteSaveEvent,
      );
      window.removeEventListener(
        WEBSITE_FUNCTION_FORM_EVENT,
        handleFunctionFormEvent as EventListener,
      );
      window.removeEventListener(
        WEBSITE_FUNCTION_SAVE_EVENT,
        handleFunctionSaveEvent,
      );
      window.removeEventListener(
        WEBSITE_PARAMETER_FORM_EVENT,
        handleParameterFormEvent as EventListener,
      );
      window.removeEventListener(
        WEBSITE_PARAMETER_SAVE_EVENT,
        handleParameterSaveEvent,
      );
    };
  }, [
    canEditTableData,
    draft.description,
    draft.domain,
    draft.id,
    draft.label,
    handleSaveDomainDialog,
    persistCurrentDraft,
    selectedDomain,
  ]);

  const routeColumns = useMemo<ColumnDef<NavaiPanelRoute>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) =>
              table.toggleAllPageRowsSelected(event.target.checked)
            }
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
      },
      {
        accessorKey: "url",
        header: ({ column }) =>
          renderSortableHeader(copy.routeUrlFieldLabel, column),
        cell: ({ row }) => (
          <div className="navai-panel-table-stack">
            <span className="navai-panel-table-primary">
              {row.original.url}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "label",
        header: ({ column }) =>
          renderSortableHeader(copy.labelFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.label || row.original.url}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: normalizeDisplayText(copy.descriptionFieldLabel),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.description ||
              normalizeDisplayText(copy.noDescriptionLabel)}
          </span>
        ),
      },
      {
        accessorKey: "openInNewTab",
        header: normalizeDisplayText(copy.routeNewTabFieldLabel),
        cell: ({ row }) =>
          row.original.openInNewTab ? (
            <span className="navai-panel-table-badge">
              {normalizeDisplayText(copy.routeNewTabFieldLabel)}
            </span>
          ) : (
            <span className="navai-panel-table-secondary">-</span>
          ),
      },
      {
        id: "actions",
        header: normalizeDisplayText(copy.actionsColumnLabel),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            {canEditTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => openEditRouteDialog(row.original)}
                aria-label={normalizeDisplayText(copy.editActionLabel)}
                title={normalizeDisplayText(copy.editActionLabel)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            ) : null}
            {canDeleteTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => handleDeleteRoute(row.original.id)}
                aria-label={normalizeDisplayText(copy.deleteActionLabel)}
                title={normalizeDisplayText(copy.deleteActionLabel)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      canDeleteTableData,
      canEditTableData,
      copy.actionsColumnLabel,
      copy.deleteActionLabel,
      copy.descriptionFieldLabel,
      copy.editActionLabel,
      copy.labelFieldLabel,
      copy.noDescriptionLabel,
      copy.routeNewTabFieldLabel,
      copy.routeUrlFieldLabel,
    ],
  );

  const functionColumns = useMemo<ColumnDef<NavaiPanelFunction>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) =>
              table.toggleAllPageRowsSelected(event.target.checked)
            }
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) =>
          renderSortableHeader(copy.functionNameFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "label",
        header: ({ column }) =>
          renderSortableHeader(copy.labelFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.label || row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: normalizeDisplayText(copy.descriptionFieldLabel),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.description ||
              normalizeDisplayText(copy.noDescriptionLabel)}
          </span>
        ),
      },
      {
        id: "actions",
        header: normalizeDisplayText(copy.actionsColumnLabel),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            {canEditTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => openEditFunctionDialog(row.original)}
                aria-label={normalizeDisplayText(copy.editActionLabel)}
                title={normalizeDisplayText(copy.editActionLabel)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            ) : null}
            {canDeleteTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => handleDeleteFunction(row.original.id)}
                aria-label={normalizeDisplayText(copy.deleteActionLabel)}
                title={normalizeDisplayText(copy.deleteActionLabel)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      canDeleteTableData,
      canEditTableData,
      copy.actionsColumnLabel,
      copy.deleteActionLabel,
      copy.descriptionFieldLabel,
      copy.editActionLabel,
      copy.functionNameFieldLabel,
      copy.labelFieldLabel,
      copy.noDescriptionLabel,
    ],
  );

  const parameterColumns = useMemo<ColumnDef<NavaiPanelParameter>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) =>
              table.toggleAllPageRowsSelected(event.target.checked)
            }
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
            aria-label={normalizeDisplayText(copy.actionsColumnLabel)}
          />
        ),
      },
      {
        accessorKey: "key",
        header: ({ column }) =>
          renderSortableHeader(copy.parameterKeyFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">{row.original.key}</span>
        ),
      },
      {
        accessorKey: "value",
        header: ({ column }) =>
          renderSortableHeader(copy.parameterValueFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.value || "0"}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: normalizeDisplayText(copy.descriptionFieldLabel),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.description ||
              normalizeDisplayText(copy.noDescriptionLabel)}
          </span>
        ),
      },
      {
        id: "actions",
        header: normalizeDisplayText(copy.actionsColumnLabel),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            {canEditTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => openEditParameterDialog(row.original)}
                aria-label={normalizeDisplayText(copy.editActionLabel)}
                title={normalizeDisplayText(copy.editActionLabel)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            ) : null}
            {canDeleteTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => handleDeleteParameter(row.original.id)}
                aria-label={normalizeDisplayText(copy.deleteActionLabel)}
                title={normalizeDisplayText(copy.deleteActionLabel)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      canDeleteTableData,
      canEditTableData,
      copy.actionsColumnLabel,
      copy.deleteActionLabel,
      copy.descriptionFieldLabel,
      copy.editActionLabel,
      copy.noDescriptionLabel,
      copy.parameterKeyFieldLabel,
      copy.parameterValueFieldLabel,
    ],
  );

  const renderDomainListContent = () => {
    if (isLoading) {
      return <DomainListLoadingSkeleton />;
    }

    if (domains.length === 0) {
      return null;
    }

    return (
      <div className="navai-panel-domain-list">
        {domains.map((item) => {
          const isActive = item.id === selectedId;
          return (
            <article
              key={item.id}
              className={`navai-panel-domain-item${isActive ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="navai-panel-sidebar-item-title-button"
                onClick={() => handleSelectDomain(item)}
              >
                <span className="navai-panel-domain-label">
                  {item.label || item.domain}
                </span>
              </button>
              <div className="navai-panel-sidebar-item-meta-row">
                <button
                  type="button"
                  className="navai-panel-sidebar-item-description-button"
                  onClick={() => handleSelectDomain(item)}
                  title={item.description || item.domain}
                >
                  <span className="navai-panel-sidebar-item-description">
                    {item.description || item.domain}
                  </span>
                </button>
                {isActive && (canEditTableData || canDeleteTableData) ? (
                  <div className="navai-panel-domain-card-actions">
                    {canEditTableData ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="navai-panel-domain-card-action-button"
                        onClick={openEditDomainDialog}
                        aria-label={normalizeDisplayText(copy.editActionLabel)}
                        title={normalizeDisplayText(copy.editActionLabel)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    ) : null}
                    {canDeleteTableData ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="navai-panel-domain-card-action-button"
                        onClick={() => setIsDeleteDomainDialogOpen(true)}
                        aria-label={normalizeDisplayText(copy.deleteButtonLabel)}
                        title={normalizeDisplayText(copy.deleteButtonLabel)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderDomainListSection = ({
    mobile = false,
  }: { mobile?: boolean } = {}) => (
    <section
      className={`navai-panel-sidebar-section${
        mobile
          ? " navai-panel-sidebar-section--mobile docs-section-block navai-panel-card"
          : ""
      }`}
    >
      <div className="navai-panel-sidebar-header">
        <div className="navai-panel-sidebar-copy">
          <h2>{normalizeDisplayText(copy.domainListTitle)}</h2>
        </div>
        {canEditTableData ? (
          <Button
            type="button"
            variant="secondary"
            onClick={openCreateDomainDialog}
            className="navai-panel-sidebar-create-button"
          >
            <Plus aria-hidden="true" />
            <span>{normalizeDisplayText(copy.createDomainButtonLabel)}</span>
          </Button>
        ) : null}
      </div>

      {renderDomainListContent()}
    </section>
  );

  const renderEditorSection = () => (
    <section
      id="editor"
      className="docs-section-block navai-panel-card navai-panel-card--editor"
    >
      {isLoading ? <PanelContentSkeleton /> : null}
      <header className="navai-panel-dashboard-copy">
        {!isLoading && !hasSelectedDomain ? (
          <h2>{normalizeDisplayText(copy.domainsSectionTitle)}</h2>
        ) : null}
        {!isLoading && !hasSelectedDomain ? (
          <p>{normalizeDisplayText(copy.domainsSectionDescription)}</p>
        ) : null}
      </header>

      {!isLoading && hasSelectedDomain ? (
        <>
          <Tabs defaultValue="routes" className="navai-panel-tabs">
            <div className="navai-panel-editor-header-row">
              <h2 className="navai-panel-editor-title">
                {draft.label.trim() || draft.domain.trim()}
              </h2>
              <TabsList className="navai-panel-tabs-list">
                {PANEL_TABS.map((tabValue) => (
                  <TabsTrigger key={tabValue} value={tabValue}>
                    {tabLabels[tabValue]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="routes" className="navai-panel-tab-panel">
              <DataTable
                columns={routeColumns}
                data={draft.routes}
                emptyMessage={normalizeDisplayText(copy.routesEmptyMessage)}
                filterColumnId="url"
                filterPlaceholder={normalizeDisplayText(
                  copy.tableFilterRoutesPlaceholder,
                )}
                columnsButtonLabel={normalizeDisplayText(
                  copy.tableColumnsButtonLabel,
                )}
                previousPageLabel={normalizeDisplayText(
                  copy.tablePreviousPageLabel,
                )}
                nextPageLabel={normalizeDisplayText(copy.tableNextPageLabel)}
                paginationSummaryTemplate={normalizeDisplayText(
                  copy.tablePaginationSummaryLabel,
                )}
                toolbarActions={
                  canEditTableData ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openCreateRouteDialog}
                    >
                      <Plus aria-hidden="true" />
                      <span>
                        {normalizeDisplayText(copy.createRouteButtonLabel)}
                      </span>
                    </Button>
                  ) : null
                }
              />
            </TabsContent>

            <TabsContent value="functions" className="navai-panel-tab-panel">
              <DataTable
                columns={functionColumns}
                data={draft.functions}
                emptyMessage={normalizeDisplayText(copy.functionsEmptyMessage)}
                filterColumnId="name"
                filterPlaceholder={normalizeDisplayText(
                  copy.tableFilterFunctionsPlaceholder,
                )}
                columnsButtonLabel={normalizeDisplayText(
                  copy.tableColumnsButtonLabel,
                )}
                previousPageLabel={normalizeDisplayText(
                  copy.tablePreviousPageLabel,
                )}
                nextPageLabel={normalizeDisplayText(copy.tableNextPageLabel)}
                paginationSummaryTemplate={normalizeDisplayText(
                  copy.tablePaginationSummaryLabel,
                )}
                toolbarActions={
                  canEditTableData ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openCreateFunctionDialog}
                    >
                      <Plus aria-hidden="true" />
                      <span>
                        {normalizeDisplayText(copy.createFunctionButtonLabel)}
                      </span>
                    </Button>
                  ) : null
                }
              />
            </TabsContent>

            <TabsContent value="parameters" className="navai-panel-tab-panel">
              <DataTable
                columns={parameterColumns}
                data={draft.parameters}
                emptyMessage={normalizeDisplayText(copy.parametersEmptyMessage)}
                filterColumnId="key"
                filterPlaceholder={normalizeDisplayText(
                  copy.tableFilterParametersPlaceholder,
                )}
                columnsButtonLabel={normalizeDisplayText(
                  copy.tableColumnsButtonLabel,
                )}
                previousPageLabel={normalizeDisplayText(
                  copy.tablePreviousPageLabel,
                )}
                nextPageLabel={normalizeDisplayText(copy.tableNextPageLabel)}
                paginationSummaryTemplate={normalizeDisplayText(
                  copy.tablePaginationSummaryLabel,
                )}
                toolbarActions={
                  canEditTableData ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={openCreateParameterDialog}
                    >
                      <Plus aria-hidden="true" />
                      <span>
                        {normalizeDisplayText(copy.createParameterButtonLabel)}
                      </span>
                    </Button>
                  ) : null
                }
              />
            </TabsContent>
          </Tabs>
        </>
      ) : !isLoading ? (
        <div className="navai-panel-empty-state">
          {canEditTableData ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={openCreateDomainDialog}
            >
              <Plus aria-hidden="true" />
              <span>{normalizeDisplayText(copy.createDomainButtonLabel)}</span>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="navai-panel-notices" aria-live="polite">
        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}
      </div>
    </section>
  );

  return (
    <>
      <Dialog
        open={isDomainDialogOpen}
        onOpenChange={handleDomainDialogOpenChange}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {normalizeDisplayText(
                domainDialogDraft.id
                  ? copy.editorSectionTitle
                  : copy.createDomainButtonLabel,
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="navai-panel-tab-panel">
            <div className="navai-panel-form-grid">
              <div className="navai-panel-field">
                <Label htmlFor="navai-domain-dialog-input">
                  {normalizeDisplayText(copy.domainFieldLabel)}
                </Label>
                <Input
                  id="navai-domain-dialog-input"
                  value={domainDialogDraft.domain}
                  onChange={(event) =>
                    updateDomainDialogDraft("domain", event.target.value)
                  }
                  placeholder="example.com"
                />
              </div>
              <div className="navai-panel-field">
                <Label htmlFor="navai-label-dialog-input">
                  {normalizeDisplayText(copy.labelFieldLabel)}
                </Label>
                <Input
                  id="navai-label-dialog-input"
                  value={domainDialogDraft.label}
                  onChange={(event) =>
                    updateDomainDialogDraft("label", event.target.value)
                  }
                  placeholder={normalizeDisplayText(copy.labelFieldPlaceholder)}
                />
              </div>
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-description-dialog-input">
                {normalizeDisplayText(copy.descriptionFieldLabel)}
              </Label>
              <Textarea
                id="navai-description-dialog-input"
                value={domainDialogDraft.description}
                onChange={(event) =>
                  updateDomainDialogDraft("description", event.target.value)
                }
                placeholder={normalizeDisplayText(
                  copy.descriptionFieldPlaceholder,
                )}
                className="min-h-[8rem]"
              />
            </div>

            {domainDialogError ? (
              <p className="navai-panel-error">{domainDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="lg"
              onClick={() => void handleSaveDomainDialog()}
              disabled={isSaving || !canEditTableData}
            >
              {isSaving ? (
                <LoaderCircle
                  className="navai-panel-spinner"
                  aria-hidden="true"
                />
              ) : (
                <Save aria-hidden="true" />
              )}
              <span>{normalizeDisplayText(copy.saveButtonLabel)}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDomainDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!isDeleting) {
            setIsDeleteDomainDialogOpen(nextOpen);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {normalizeDisplayText(copy.deleteButtonLabel)}
            </DialogTitle>
          </DialogHeader>

          <div className="navai-panel-tab-panel">
            <p>{normalizeDisplayText(copy.deleteConfirmMessage)}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDomainDialogOpen(false)}
              disabled={isDeleting}
            >
              <span>{normalizeDisplayText(copy.cancelActionLabel)}</span>
            </Button>
            <Button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || !canDeleteTableData}
            >
              {isDeleting ? (
                <LoaderCircle
                  className="navai-panel-spinner"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              <span>
                {normalizeDisplayText(
                  isDeleting ? copy.deletingLabel : copy.deleteButtonLabel,
                )}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {normalizeDisplayText(
                routeDialogDraft.url
                  ? `${copy.editActionLabel} ${copy.routesTabLabel}`
                  : copy.createRouteButtonLabel,
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="navai-panel-tab-panel">
            <div className="navai-panel-field">
              <Label htmlFor="navai-route-url-input">
                {normalizeDisplayText(copy.routeUrlFieldLabel)}
              </Label>
              <Input
                id="navai-route-url-input"
                value={routeDialogDraft.url}
                onChange={(event) =>
                  setRouteDialogDraft((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(copy.routeUrlPlaceholder)}
              />
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-route-label-input">
                {normalizeDisplayText(copy.labelFieldLabel)}
              </Label>
              <Input
                id="navai-route-label-input"
                value={routeDialogDraft.label}
                onChange={(event) =>
                  setRouteDialogDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(copy.labelFieldPlaceholder)}
              />
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-route-description-input">
                {normalizeDisplayText(copy.descriptionFieldLabel)}
              </Label>
              <Textarea
                id="navai-route-description-input"
                value={routeDialogDraft.description}
                onChange={(event) =>
                  setRouteDialogDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(
                  copy.descriptionFieldPlaceholder,
                )}
                className="min-h-[7rem]"
              />
            </div>

            <label className="navai-panel-checkbox">
              <input
                type="checkbox"
                checked={routeDialogDraft.openInNewTab}
                onChange={(event) =>
                  setRouteDialogDraft((current) => ({
                    ...current,
                    openInNewTab: event.target.checked,
                  }))
                }
              />
              <span>{normalizeDisplayText(copy.routeNewTabFieldLabel)}</span>
            </label>

            {routeDialogError ? (
              <p className="navai-panel-error">{routeDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="lg"
              onClick={handleSaveRouteDialog}
              disabled={!canEditTableData}
            >
              <Save aria-hidden="true" />
              <span>{normalizeDisplayText(copy.saveButtonLabel)}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFunctionDialogOpen}
        onOpenChange={setIsFunctionDialogOpen}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {normalizeDisplayText(
                functionDialogDraft.name
                  ? `${copy.editActionLabel} ${copy.functionsTabLabel}`
                  : copy.createFunctionButtonLabel,
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="navai-panel-tab-panel">
            <div className="navai-panel-form-grid">
              <div className="navai-panel-field">
                <Label htmlFor="navai-function-name-input">
                  {normalizeDisplayText(copy.functionNameFieldLabel)}
                </Label>
                <Input
                  id="navai-function-name-input"
                  value={functionDialogDraft.name}
                  onChange={(event) =>
                    setFunctionDialogDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="open_dashboard"
                />
              </div>
              <div className="navai-panel-field">
                <Label htmlFor="navai-function-label-input">
                  {normalizeDisplayText(copy.labelFieldLabel)}
                </Label>
                <Input
                  id="navai-function-label-input"
                  value={functionDialogDraft.label}
                  onChange={(event) =>
                    setFunctionDialogDraft((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder={normalizeDisplayText(copy.labelFieldPlaceholder)}
                />
              </div>
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-function-description-input">
                {normalizeDisplayText(copy.descriptionFieldLabel)}
              </Label>
              <Textarea
                id="navai-function-description-input"
                value={functionDialogDraft.description}
                onChange={(event) =>
                  setFunctionDialogDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(
                  copy.descriptionFieldPlaceholder,
                )}
                className="min-h-[7rem]"
              />
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-function-code-input">
                {normalizeDisplayText(copy.functionCodeFieldLabel)}
              </Label>
              <Textarea
                id="navai-function-code-input"
                value={functionDialogDraft.code}
                onChange={(event) =>
                  setFunctionDialogDraft((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(copy.functionCodePlaceholder)}
                className="navai-panel-code-input"
              />
            </div>

            {functionDialogError ? (
              <p className="navai-panel-error">{functionDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="lg"
              onClick={handleSaveFunctionDialog}
              disabled={!canEditTableData}
            >
              <Save aria-hidden="true" />
              <span>{normalizeDisplayText(copy.saveButtonLabel)}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isParameterDialogOpen}
        onOpenChange={setIsParameterDialogOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {normalizeDisplayText(
                parameterDialogDraft.key
                  ? `${copy.editActionLabel} ${copy.parametersTabLabel}`
                  : copy.createParameterButtonLabel,
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="navai-panel-tab-panel">
            <div className="navai-panel-field">
              <Label htmlFor="navai-parameter-key-input">
                {normalizeDisplayText(copy.parameterKeyFieldLabel)}
              </Label>
              <Input
                id="navai-parameter-key-input"
                value={parameterDialogDraft.key}
                onChange={(event) =>
                  setParameterDialogDraft((current) => ({
                    ...current,
                    key: event.target.value,
                  }))
                }
                placeholder="PUBLIC_ORB_AUTOPLAY_DELAY_MS"
              />
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-parameter-value-input">
                {normalizeDisplayText(copy.parameterValueFieldLabel)}
              </Label>
              <Input
                id="navai-parameter-value-input"
                value={parameterDialogDraft.value}
                onChange={(event) =>
                  setParameterDialogDraft((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(
                  copy.parameterValuePlaceholder,
                )}
              />
            </div>

            <div className="navai-panel-field">
              <Label htmlFor="navai-parameter-description-input">
                {normalizeDisplayText(copy.descriptionFieldLabel)}
              </Label>
              <Textarea
                id="navai-parameter-description-input"
                value={parameterDialogDraft.description}
                onChange={(event) =>
                  setParameterDialogDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={normalizeDisplayText(
                  copy.descriptionFieldPlaceholder,
                )}
                className="min-h-[7rem]"
              />
            </div>

            {parameterDialogError ? (
              <p className="navai-panel-error">{parameterDialogError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="lg"
              onClick={handleSaveParameterDialog}
              disabled={!canEditTableData}
            >
              <Save aria-hidden="true" />
              <span>{normalizeDisplayText(copy.saveButtonLabel)}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {children({
        renderDomainListSection,
        renderEditorSection,
      })}
    </>
  );
}
