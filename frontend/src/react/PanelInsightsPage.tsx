"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Settings2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader as DrawerPanelHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { calculateExperienceCompositeScore } from "@/lib/navai-experience-score";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import {
  NAVAI_EXPERIENCE_REWARD_DELIVERY_METHODS,
  NAVAI_EXPERIENCE_REWARD_PAYMENT_METHODS,
  NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS,
  NAVAI_EXPERIENCE_REWARD_TYPES,
  type NavaiExperienceRewardDeliveryMethod,
  type NavaiExperienceRewardPaymentMethod,
  type NavaiExperienceRewardType,
  createNavaiPanelEvaluation,
  createNavaiPanelEvaluationAgent,
  createNavaiPanelSurvey,
  createNavaiPanelSurveyAgent,
  deleteNavaiPanelEvaluation,
  deleteNavaiPanelEvaluationAgent,
  deleteNavaiPanelSurvey,
  deleteNavaiPanelSurveyAgent,
  gradeNavaiPanelEvaluationResponse,
  gradeNavaiPanelSurveyResponse,
  listNavaiPanelEvaluations,
  listNavaiPanelEvaluationAgents,
  listNavaiPanelEvaluationResponses,
  listNavaiPanelSurveys,
  listNavaiPanelSurveyAgents,
  listNavaiPanelSurveyResponses,
  type NavaiPanelAgent,
  type NavaiPanelAgentSettings,
  type NavaiPanelExperienceAccessMode,
  type NavaiPanelEvaluation,
  type NavaiPanelEvaluationQuestion,
  type NavaiPanelExperienceResponse,
  type NavaiPanelExperienceInput,
  type NavaiPanelExperienceStatus,
  type NavaiPanelSurvey,
  updateNavaiPanelEvaluation,
  updateNavaiPanelEvaluationAgent,
  updateNavaiPanelSurvey,
  updateNavaiPanelSurveyAgent,
} from "@/lib/navai-panel-api";
import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

type Props = { mode: "evaluations" | "surveys" };
type Item = NavaiPanelEvaluation | NavaiPanelSurvey;
type Draft = NavaiPanelExperienceInput & { id: string | null };
type AgentDraft = NavaiPanelAgentSettings & { id: string | null };
type ExperienceDraftPatch = Partial<
  Pick<
    Draft,
    | "name"
    | "status"
    | "description"
    | "welcomeBody"
    | "autoStartConversation"
    | "enableEntryModal"
    | "enableHCaptcha"
    | "accessMode"
    | "allowedEmails"
    | "allowPlusUsers"
    | "allowNonPlusUsers"
    | "startsAt"
    | "endsAt"
    | "delegateAiGrading"
    | "enableRanking"
    | "enableComments"
    | "rewardType"
    | "rewardTitle"
    | "rewardDescription"
    | "rewardDeliveryMethod"
    | "rewardDeliveryDetails"
    | "rewardPaymentMethods"
    | "rewardWinnerCount"
    | "rewardPoints"
    | "rewardUsdAmount"
    | "dailyAttemptLimit"
  >
>;
type ExperienceToolFormEventDetail = {
  openDialog?: boolean;
  patch?: ExperienceDraftPatch;
};
type ExperienceToolQuestionEventDetail = {
  openDialog?: boolean;
  question?: string;
  expectedAnswer?: string;
};
type ResponseGroup = {
  id: string;
  label: string;
  respondentEmail: string;
  respondentUserId: string;
  totalScore: number;
  conversationsCount: number;
  completedCount: number;
  openCount: number;
  abandonedCount: number;
  answeredQuestions: number;
  totalQuestions: number;
  latestActivityAt: string;
  responses: NavaiPanelExperienceResponse[];
};
type TableStatisticsCard = {
  label: string;
  value: string;
};
type TableStatisticsChartDatum = {
  metric: string;
  total: number;
  fill: string;
};
type TableStatisticsChart = {
  id: string;
  kind: "bar" | "pie";
  title: string;
  data: TableStatisticsChartDatum[];
};
type TableStatisticsConfig = {
  tableLabel: string;
  cards: TableStatisticsCard[];
  charts: TableStatisticsChart[];
  hasData: boolean;
};

const EVALUATION_FORM_EVENT = "navai:panel-evaluation-form";
const SURVEY_FORM_EVENT = "navai:panel-survey-form";
const EVALUATION_QUESTION_EVENT = "navai:panel-evaluation-question";
const SURVEY_QUESTION_EVENT = "navai:panel-survey-question";
const EVALUATION_SAVE_EVENT = "navai:panel-evaluation-save";
const SURVEY_SAVE_EVENT = "navai:panel-survey-save";
const TABLE_STATISTICS_COLORS = [
  "#38bdf8",
  "#60a5fa",
  "#818cf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
] as const;

const OPENAI_REALTIME_MODEL_OPTIONS = [
  { value: "gpt-realtime", label: "gpt-realtime" },
  { value: "gpt-realtime-mini", label: "gpt-realtime-mini" },
  { value: "gpt-4o-realtime-preview", label: "gpt-4o-realtime-preview" },
] as const;

const OPENAI_REALTIME_VOICE_OPTIONS = [
  { value: "alloy", label: "alloy" },
  { value: "ash", label: "ash" },
  { value: "ballad", label: "ballad" },
  { value: "cedar", label: "cedar" },
  { value: "coral", label: "coral" },
  { value: "echo", label: "echo" },
  { value: "marin", label: "marin" },
  { value: "sage", label: "sage" },
  { value: "shimmer", label: "shimmer" },
  { value: "verse", label: "verse" },
] as const;

const OPENAI_REALTIME_LANGUAGE_OPTIONS = [
  { value: "es", label: "Español (es)" },
  { value: "en", label: "English (en)" },
  { value: "pt", label: "Português (pt)" },
  { value: "fr", label: "Français (fr)" },
  { value: "hi", label: "Hindi (hi)" },
  { value: "ja", label: "日本語 (ja)" },
  { value: "ko", label: "한국어 (ko)" },
  { value: "ru", label: "Русский (ru)" },
  { value: "zh", label: "中文 (zh)" },
] as const;

const emptyQuestion = (): NavaiPanelEvaluationQuestion => ({
  id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  question: "",
  expectedAnswer: "",
  allowAiGrading: false,
});

const emptyDraft = (): Draft => ({
  id: null,
  domainId: "",
  name: "",
  slug: "",
  description: "",
  status: "Draft",
  accessMode: "public",
  allowedEmails: [],
  allowPlusUsers: true,
  allowNonPlusUsers: true,
  startsAt: "",
  endsAt: "",
  delegateAiGrading: false,
  enableRanking: false,
  enableComments: false,
  rewardType: "money",
  rewardTitle: "",
  rewardDescription: "",
  rewardDeliveryMethod: "manual_coordination",
  rewardDeliveryDetails: "",
  rewardPaymentMethods: [],
  rewardWinnerCount: 1,
  rewardPoints: 0,
  dailyAttemptLimit: 1,
  agentId: "",
  questions: [],
  welcomeTitle: "",
  welcomeBody: "",
  autoStartConversation: false,
  enableEntryModal: true,
  enableHCaptcha: true,
  systemPrompt: "",
});

function normalizeExperienceEmailList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/g)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function formatDateTimeLocalInput(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const local = new Date(
    parsed.getTime() - parsed.getTimezoneOffset() * 60_000,
  );
  return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalInput(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function resolveExperienceResponseVideoUrl(
  response: Pick<
    NavaiPanelExperienceResponse,
    "videoDownloadUrl" | "videoStoragePath"
  >,
) {
  const directUrl = response.videoDownloadUrl.trim();
  if (directUrl) {
    return directUrl;
  }

  const storagePath = response.videoStoragePath.trim();
  return storagePath
    ? `https://iframe.videodelivery.net/${storagePath}`
    : "";
}

function createDraftForSelectedAgent(agentId: string): Draft {
  return {
    ...emptyDraft(),
    agentId,
  };
}

function normalize(value: string) {
  return stripLeadingDecorativeText(value);
}

function getRewardTypeLabel(
  messages: ReturnType<typeof useI18n>["messages"],
  value: NavaiExperienceRewardType,
) {
  switch (value) {
    case "object":
      return normalize(messages.panelPage.experienceRewardTypeObjectLabel);
    case "travel":
      return normalize(messages.panelPage.experienceRewardTypeTravelLabel);
    case "voucher":
      return normalize(messages.panelPage.experienceRewardTypeVoucherLabel);
    case "other":
      return normalize(messages.panelPage.experienceRewardTypeOtherLabel);
    case "money":
    default:
      return normalize(messages.panelPage.experienceRewardTypeMoneyLabel);
  }
}

function getRewardDeliveryMethodLabel(
  messages: ReturnType<typeof useI18n>["messages"],
  value: NavaiExperienceRewardDeliveryMethod,
) {
  switch (value) {
    case "bank_transfer":
      return normalize(messages.panelPage.experienceRewardDeliveryBankTransferLabel);
    case "digital_wallet":
      return normalize(messages.panelPage.experienceRewardDeliveryDigitalWalletLabel);
    case "hybrid":
      return normalize(messages.panelPage.experienceRewardDeliveryHybridLabel);
    case "in_person":
      return normalize(messages.panelPage.experienceRewardDeliveryInPersonLabel);
    case "manual_coordination":
    default:
      return normalize(messages.panelPage.experienceRewardDeliveryManualLabel);
  }
}

function header(
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
      <span>{normalize(label)}</span>
      <ArrowUpDown aria-hidden="true" />
    </Button>
  );
}

function buildPublicUrl(publicPath: string) {
  if (typeof window === "undefined") return publicPath;
  return new URL(publicPath, window.location.origin).toString();
}

function withCurrentOption(
  options: ReadonlyArray<{ value: string; label: string }>,
  currentValue: string,
) {
  if (
    !currentValue ||
    options.some((option) => option.value === currentValue)
  ) {
    return options;
  }

  return [{ value: currentValue, label: currentValue }, ...options];
}

function buildAgentSummary(agent: NavaiPanelAgent, fallback: string) {
  const parts = [
    agent.agentModel,
    agent.agentVoice,
    agent.agentLanguage,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : fallback;
}

function formatDateOnly(value: string) {
  if (!value) {
    return "â€”";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    parsed,
  );
}

function formatTimeOnly(value: string) {
  if (!value) {
    return "â€”";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(
    parsed,
  );
}

function formatDateTimeSummary(value: string) {
  if (!value) {
    return "Ã¢â‚¬â€";
  }

  return `${formatDateOnly(value)} Â· ${formatTimeOnly(value)}`;
}

function formatConversationDuration(
  startedAt: string,
  endedAt: string,
  updatedAt: string,
) {
  const startedTime = new Date(startedAt).getTime();
  const finishedTime = new Date(endedAt || updatedAt).getTime();

  if (
    !Number.isFinite(startedTime) ||
    !Number.isFinite(finishedTime) ||
    finishedTime < startedTime
  ) {
    return "â€”";
  }

  const totalSeconds = Math.max(
    0,
    Math.round((finishedTime - startedTime) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function getConversationDurationSeconds(
  startedAt: string,
  endedAt: string,
  updatedAt: string,
) {
  const startedTime = new Date(startedAt).getTime();
  const finishedTime = new Date(endedAt || updatedAt).getTime();

  if (
    !Number.isFinite(startedTime) ||
    !Number.isFinite(finishedTime) ||
    finishedTime < startedTime
  ) {
    return null;
  }

  return Math.max(0, Math.round((finishedTime - startedTime) / 1000));
}

function formatDurationFromSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatPercentageValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

function formatAverageScoreValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0/10";
  }

  return `${value.toFixed(1)}/10`;
}

function createStatisticsDatum(metric: string, total: number, index: number) {
  return {
    metric,
    total,
    fill: TABLE_STATISTICS_COLORS[index % TABLE_STATISTICS_COLORS.length],
  };
}

function hasPositiveChartData(data: TableStatisticsChartDatum[]) {
  return data.some((entry) => entry.total > 0);
}

function StatisticsChartsDrawer({
  statistics,
  buttonLabel,
  emptyChartMessage,
  onClose,
}: {
  statistics: TableStatisticsConfig | null;
  buttonLabel: string;
  emptyChartMessage: string;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(statistics)}
      shouldScaleBackground={false}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DrawerContent className="navai-panel-stats-drawer">
        {statistics ? (
          <div className="navai-panel-stats-drawer-shell">
            <DrawerPanelHeader className="navai-panel-stats-drawer-header">
              <DrawerTitle>{buttonLabel}</DrawerTitle>
              <DrawerDescription>{statistics.tableLabel}</DrawerDescription>
            </DrawerPanelHeader>

            <div className="navai-panel-stats-dialog">
              {statistics.cards.length > 0 ? (
                <div className="navai-panel-stats-summary-grid">
                  {statistics.cards.map((card) => (
                    <section
                      key={`${statistics.tableLabel}-${card.label}`}
                      className="navai-panel-stats-card"
                    >
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </section>
                  ))}
                </div>
              ) : null}

              <div className="navai-panel-chart-grid-panels">
                {statistics.charts.map((chart) => {
                  const chartConfig = {
                    total: {
                      label: chart.title,
                      color: chart.data[0]?.fill ?? TABLE_STATISTICS_COLORS[0],
                    },
                  };

                  return (
                    <section
                      key={chart.id}
                      className="docs-section-block navai-panel-card navai-panel-chart-card"
                    >
                      <div className="navai-panel-chart-copy">
                        <h2>{chart.title}</h2>
                      </div>

                      {hasPositiveChartData(chart.data) ? (
                        <ChartContainer
                          config={chartConfig}
                          className="navai-panel-chart-shell navai-panel-chart-shell--compact"
                        >
                          {chart.kind === "pie" ? (
                            <PieChart>
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent />}
                              />
                              <Pie
                                data={chart.data}
                                dataKey="total"
                                nameKey="metric"
                                innerRadius={56}
                                outerRadius={86}
                                paddingAngle={4}
                                stroke="transparent"
                              >
                                {chart.data.map((entry) => (
                                  <Cell
                                    key={`${chart.id}-${entry.metric}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          ) : (
                            <BarChart
                              data={chart.data}
                              layout="vertical"
                              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                            >
                              <CartesianGrid
                                vertical={false}
                                strokeDasharray="4 4"
                                className="navai-panel-chart-grid"
                              />
                              <XAxis
                                type="number"
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                className="navai-panel-chart-axis"
                              />
                              <YAxis
                                dataKey="metric"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                width={152}
                                tickFormatter={(value: string) =>
                                  value.length > 20
                                    ? `${value.slice(0, 20)}...`
                                    : value
                                }
                                className="navai-panel-chart-axis"
                              />
                              <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent />}
                              />
                              <Bar
                                dataKey="total"
                                radius={[0, 14, 14, 0]}
                                maxBarSize={34}
                              >
                                {chart.data.map((entry) => (
                                  <Cell
                                    key={`${chart.id}-${entry.metric}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          )}
                        </ChartContainer>
                      ) : (
                        <div className="navai-panel-stats-empty">
                          <p>{emptyChartMessage}</p>
                        </div>
                      )}

                      {chart.kind === "pie" ? (
                        <div className="navai-panel-stats-legend">
                          {chart.data
                            .filter((entry) => entry.total > 0)
                            .map((entry) => (
                              <div
                                key={`${chart.id}-${entry.metric}-legend`}
                                className="navai-panel-stats-legend-item"
                              >
                                <span className="navai-panel-stats-legend-label">
                                  <span
                                    className="navai-chart-tooltip-swatch"
                                    style={{ backgroundColor: entry.fill }}
                                  />
                                  {entry.metric}
                                </span>
                                <strong>{entry.total}</strong>
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export default function PanelInsightsPage({ mode }: Props) {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelInsightsPageContent mode={mode} />
    </AppProvidersShell>
  );
}

function PanelInsightsPageContent({ mode }: Props) {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const { canDeleteTableData, canEditTableData } = useNavaiPanelAccess();
  const isEvaluations = mode === "evaluations";
  const title = isEvaluations
    ? messages.panelPage.evaluationsNavLabel
    : messages.panelPage.surveysNavLabel;
  const filterPlaceholder = isEvaluations
    ? messages.panelPage.tableFilterEvaluationsPlaceholder
    : messages.panelPage.tableFilterSurveysPlaceholder;
  const createButtonLabel = isEvaluations
    ? messages.panelPage.createEvaluationButtonLabel
    : messages.panelPage.createSurveyButtonLabel;
  const defaultAgentName = normalize(
    isEvaluations
      ? messages.panelPage.defaultEvaluationAgentName
      : messages.panelPage.defaultSurveyAgentName,
  );

  const [items, setItems] = useState<Item[]>([]);
  const [agents, setAgents] = useState<NavaiPanelAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [agentDraft, setAgentDraft] = useState<AgentDraft>({
    id: null,
    name: defaultAgentName,
    agentModel: "",
    agentVoice: "",
    agentLanguage: "",
    agentVoiceAccent: "",
    agentVoiceTone: "",
  });
  const [questionDraft, setQuestionDraft] =
    useState<NavaiPanelEvaluationQuestion>(emptyQuestion);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<
    "general" | "rewards" | "metadata" | "questions"
  >("general");
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [responsesError, setResponsesError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [isResponseAiGrading, setIsResponseAiGrading] = useState(false);
  const [selectedResponsesItem, setSelectedResponsesItem] =
    useState<Item | null>(null);
  const [selectedResponseGroupId, setSelectedResponseGroupId] = useState("");
  const [experienceResponses, setExperienceResponses] = useState<
    NavaiPanelExperienceResponse[]
  >([]);
  const [selectedResponse, setSelectedResponse] =
    useState<NavaiPanelExperienceResponse | null>(null);
  const [activeStatistics, setActiveStatistics] =
    useState<TableStatisticsConfig | null>(null);
  const agentModelOptions = useMemo(
    () =>
      withCurrentOption(OPENAI_REALTIME_MODEL_OPTIONS, agentDraft.agentModel),
    [agentDraft.agentModel],
  );
  const agentVoiceOptions = useMemo(
    () =>
      withCurrentOption(OPENAI_REALTIME_VOICE_OPTIONS, agentDraft.agentVoice),
    [agentDraft.agentVoice],
  );
  const agentLanguageOptions = useMemo(
    () =>
      withCurrentOption(
        OPENAI_REALTIME_LANGUAGE_OPTIONS,
        agentDraft.agentLanguage,
      ),
    [agentDraft.agentLanguage],
  );
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const filteredItems = useMemo(
    () =>
      selectedAgent
        ? items.filter((item) => item.agentId === selectedAgent.id)
        : [],
    [items, selectedAgent],
  );

  useEffect(() => {
    if (isDialogOpen) {
      setDialogTab("general");
    }
  }, [isDialogOpen]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      const idToken = await user?.getIdToken();
      if (!idToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      try {
        const [itemsResponse, agentsResponse] = await Promise.all([
          isEvaluations
            ? listNavaiPanelEvaluations(idToken)
            : listNavaiPanelSurveys(idToken),
          isEvaluations
            ? listNavaiPanelEvaluationAgents(idToken)
            : listNavaiPanelSurveyAgents(idToken),
        ]);
        if (!isMounted) return;
        setItems(itemsResponse.items);
        setAgents(agentsResponse.items);
        setSelectedAgentId(
          (current) => current || agentsResponse.items[0]?.id || "",
        );
        setError("");
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.experienceLoadErrorMessage,
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [isEvaluations, messages.panelPage.experienceLoadErrorMessage, user]);

  useEffect(() => {
    if (!agents.length) {
      setSelectedAgentId("");
      return;
    }

    if (!agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(agents[0]?.id ?? "");
    }
  }, [agents, selectedAgentId]);

  const saveItem = async () => {
    if (!canEditTableData) {
      throw new Error("Editing table data is not allowed for this role.");
    }

    const idToken = await user?.getIdToken();
    if (!idToken) throw new Error("Authentication required.");
    const payload: NavaiPanelExperienceInput = {
      domainId: "",
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim(),
      status: draft.status,
      accessMode: draft.accessMode,
      allowedEmails: draft.allowedEmails,
      allowPlusUsers: true,
      allowNonPlusUsers: true,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      delegateAiGrading: draft.delegateAiGrading,
      enableRanking: draft.enableRanking,
      enableComments: draft.enableComments,
      rewardType: draft.rewardType,
      rewardTitle: draft.rewardTitle.trim(),
      rewardDescription: draft.rewardDescription.trim(),
      rewardDeliveryMethod: draft.rewardDeliveryMethod,
      rewardDeliveryDetails: draft.rewardDeliveryDetails.trim(),
      rewardPaymentMethods: [...draft.rewardPaymentMethods],
      rewardWinnerCount: Math.max(1, Math.round(draft.rewardWinnerCount || 1)),
      rewardPoints: Math.max(
        0,
        Math.round(Number(draft.rewardPoints ?? draft.rewardUsdAmount ?? 0)),
      ),
      dailyAttemptLimit: Math.max(1, Math.round(draft.dailyAttemptLimit || 1)),
      agentId: draft.agentId.trim(),
      questions: draft.questions.map((item) => ({ ...item })),
      welcomeTitle: draft.name.trim(),
      welcomeBody: draft.welcomeBody.trim(),
      autoStartConversation: draft.autoStartConversation,
      enableEntryModal: draft.enableEntryModal,
      enableHCaptcha: draft.enableHCaptcha,
      systemPrompt: draft.description.trim(),
    };
    return draft.id
      ? (isEvaluations
          ? updateNavaiPanelEvaluation(idToken, draft.id, payload)
          : updateNavaiPanelSurvey(idToken, draft.id, payload)
        ).then((response) => response.item)
      : (isEvaluations
          ? createNavaiPanelEvaluation(idToken, payload)
          : createNavaiPanelSurvey(idToken, payload)
        ).then((response) => response.item);
  };

  const persistDraftAndClose = async () => {
    const item = await saveItem();
    setItems((current) => {
      const index = current.findIndex(
        (currentItem) => currentItem.id === item.id,
      );
      if (index < 0) return [item, ...current];
      const next = [...current];
      next.splice(index, 1, item);
      return next;
    });
    setIsDialogOpen(false);
    setDialogError("");
    return item;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const expectedFormEvent = isEvaluations
      ? EVALUATION_FORM_EVENT
      : SURVEY_FORM_EVENT;
    const expectedQuestionEvent = isEvaluations
      ? EVALUATION_QUESTION_EVENT
      : SURVEY_QUESTION_EVENT;
    const expectedSaveEvent = isEvaluations
      ? EVALUATION_SAVE_EVENT
      : SURVEY_SAVE_EVENT;

    const handleToolFormEvent = (event: Event) => {
      if (!canEditTableData) {
        return;
      }

      const customEvent = event as CustomEvent<ExperienceToolFormEventDetail>;
      if (!selectedAgent) {
        return;
      }

      setDraft((current) => {
        const baseDraft =
          current.id || current.agentId === selectedAgent.id
            ? current
            : createDraftForSelectedAgent(selectedAgent.id);
        const patch = customEvent.detail?.patch ?? {};

        return {
          ...baseDraft,
          ...patch,
          accessMode:
            patch.accessMode === "private"
              ? "private"
              : patch.accessMode === "public"
                ? "public"
                : baseDraft.accessMode,
          allowedEmails: Array.isArray(patch.allowedEmails)
            ? patch.allowedEmails
            : baseDraft.allowedEmails,
          allowPlusUsers:
            typeof patch.allowPlusUsers === "boolean"
              ? patch.allowPlusUsers
              : baseDraft.allowPlusUsers,
          allowNonPlusUsers:
            typeof patch.allowNonPlusUsers === "boolean"
              ? patch.allowNonPlusUsers
              : baseDraft.allowNonPlusUsers,
          enableEntryModal:
            typeof patch.enableEntryModal === "boolean"
              ? patch.enableEntryModal
              : baseDraft.enableEntryModal,
          enableHCaptcha:
            typeof patch.enableHCaptcha === "boolean"
              ? patch.enableHCaptcha
              : baseDraft.enableHCaptcha,
          enableRanking:
            typeof patch.enableRanking === "boolean"
              ? patch.enableRanking
              : baseDraft.enableRanking,
          enableComments:
            typeof patch.enableComments === "boolean"
              ? patch.enableComments
              : baseDraft.enableComments,
          rewardType:
            patch.rewardType === "money" ||
            patch.rewardType === "object" ||
            patch.rewardType === "travel" ||
            patch.rewardType === "voucher" ||
            patch.rewardType === "other"
              ? patch.rewardType
              : baseDraft.rewardType,
          rewardTitle:
            typeof patch.rewardTitle === "string"
              ? patch.rewardTitle
              : baseDraft.rewardTitle,
          rewardDescription:
            typeof patch.rewardDescription === "string"
              ? patch.rewardDescription
              : baseDraft.rewardDescription,
          rewardDeliveryMethod:
            patch.rewardDeliveryMethod === "manual_coordination" ||
            patch.rewardDeliveryMethod === "bank_transfer" ||
            patch.rewardDeliveryMethod === "digital_wallet" ||
            patch.rewardDeliveryMethod === "hybrid" ||
            patch.rewardDeliveryMethod === "in_person"
              ? patch.rewardDeliveryMethod
              : baseDraft.rewardDeliveryMethod,
          rewardDeliveryDetails:
            typeof patch.rewardDeliveryDetails === "string"
              ? patch.rewardDeliveryDetails
              : baseDraft.rewardDeliveryDetails,
          rewardPaymentMethods: Array.isArray(patch.rewardPaymentMethods)
            ? [...patch.rewardPaymentMethods]
            : baseDraft.rewardPaymentMethods,
          rewardWinnerCount:
            typeof patch.rewardWinnerCount === "number" &&
            Number.isFinite(patch.rewardWinnerCount)
              ? Math.max(1, Math.round(patch.rewardWinnerCount))
              : baseDraft.rewardWinnerCount,
          rewardPoints:
            typeof patch.rewardPoints === "number" && Number.isFinite(patch.rewardPoints)
              ? Math.max(0, Math.round(patch.rewardPoints))
              : typeof patch.rewardUsdAmount === "number" &&
                  Number.isFinite(patch.rewardUsdAmount)
                ? Math.max(0, Math.round(patch.rewardUsdAmount))
                : Math.max(
                    0,
                    Math.round(
                      Number(baseDraft.rewardPoints ?? baseDraft.rewardUsdAmount ?? 0)
                    )
                  ),
          dailyAttemptLimit:
            typeof patch.dailyAttemptLimit === "number" &&
            Number.isFinite(patch.dailyAttemptLimit)
              ? Math.max(1, Math.round(patch.dailyAttemptLimit))
              : baseDraft.dailyAttemptLimit,
          agentId: selectedAgent.id,
        };
      });
      setDialogError("");
      if (customEvent.detail?.openDialog !== false) {
        setIsDialogOpen(true);
      }
    };

    const handleToolQuestionEvent = (event: Event) => {
      if (!canEditTableData) {
        return;
      }

      const customEvent =
        event as CustomEvent<ExperienceToolQuestionEventDetail>;
      const question =
        typeof customEvent.detail?.question === "string"
          ? customEvent.detail.question.trim()
          : "";

      if (!selectedAgent || !question) {
        return;
      }

      setDraft((current) => {
        const baseDraft =
          current.id || current.agentId === selectedAgent.id
            ? current
            : createDraftForSelectedAgent(selectedAgent.id);

        const nextQuestion: NavaiPanelEvaluationQuestion = {
          ...emptyQuestion(),
          question,
          expectedAnswer: isEvaluations
            ? typeof customEvent.detail?.expectedAnswer === "string"
              ? customEvent.detail.expectedAnswer.trim()
              : ""
            : "",
          allowAiGrading: false,
        };

        return {
          ...baseDraft,
          agentId: selectedAgent.id,
          questions: [...baseDraft.questions, nextQuestion],
        };
      });
      setDialogError("");
      if (customEvent.detail?.openDialog !== false) {
        setIsDialogOpen(true);
      }
    };

    const handleToolSaveEvent = () => {
      void persistDraftAndClose().catch((saveError: unknown) => {
        setDialogError(
          saveError instanceof Error
            ? saveError.message
            : messages.panelPage.saveErrorMessage,
        );
      });
    };

    window.addEventListener(
      expectedFormEvent,
      handleToolFormEvent as EventListener,
    );
    window.addEventListener(
      expectedQuestionEvent,
      handleToolQuestionEvent as EventListener,
    );
    window.addEventListener(expectedSaveEvent, handleToolSaveEvent);

    return () => {
      window.removeEventListener(
        expectedFormEvent,
        handleToolFormEvent as EventListener,
      );
      window.removeEventListener(
        expectedQuestionEvent,
        handleToolQuestionEvent as EventListener,
      );
      window.removeEventListener(expectedSaveEvent, handleToolSaveEvent);
    };
  }, [
    canEditTableData,
    isEvaluations,
    messages.panelPage.saveErrorMessage,
    persistDraftAndClose,
    selectedAgent,
  ]);

  const saveAgent = async () => {
    if (!canEditTableData) {
      throw new Error("Editing table data is not allowed for this role.");
    }

    const idToken = await user?.getIdToken();
    if (!idToken) throw new Error("Authentication required.");
    const payload: NavaiPanelAgentSettings = {
      name: agentDraft.name.trim(),
      agentModel: agentDraft.agentModel.trim(),
      agentVoice: agentDraft.agentVoice.trim(),
      agentLanguage: agentDraft.agentLanguage.trim(),
      agentVoiceAccent: "",
      agentVoiceTone: "",
    };
    return agentDraft.id
      ? (isEvaluations
          ? updateNavaiPanelEvaluationAgent(idToken, agentDraft.id, payload)
          : updateNavaiPanelSurveyAgent(idToken, agentDraft.id, payload)
        ).then((response) => response.item)
      : (isEvaluations
          ? createNavaiPanelEvaluationAgent(idToken, payload)
          : createNavaiPanelSurveyAgent(idToken, payload)
        ).then((response) => response.item);
  };

  const openResponsesView = async (item: Item) => {
    const idToken = await user?.getIdToken();
    if (!idToken) {
      return;
    }

    setSelectedResponsesItem(item);
    setSelectedResponseGroupId("");
    setExperienceResponses([]);
    setSelectedResponse(null);
    setResponsesError("");
    setIsResponsesLoading(true);

    try {
      const response = isEvaluations
        ? await listNavaiPanelEvaluationResponses(idToken, item.id)
        : await listNavaiPanelSurveyResponses(idToken, item.id);
      setExperienceResponses(response.items);
    } catch (loadError) {
      setResponsesError(
        loadError instanceof Error
          ? loadError.message
          : messages.panelPage.experienceResponsesLoadErrorMessage,
      );
    } finally {
      setIsResponsesLoading(false);
    }
  };

  const closeResponsesView = () => {
    setSelectedResponsesItem(null);
    setSelectedResponseGroupId("");
    setSelectedResponse(null);
    setExperienceResponses([]);
    setResponsesError("");
    setIsResponsesLoading(false);
  };

  const handleResponsesBack = () => {
    if (selectedResponse) {
      setSelectedResponse(null);
      return;
    }

    if (selectedResponseGroupId) {
      setSelectedResponseGroupId("");
      return;
    }

    closeResponsesView();
  };

  const replaceExperienceResponse = (item: NavaiPanelExperienceResponse) => {
    setExperienceResponses((current) =>
      current.map((response) => (response.id === item.id ? item : response)),
    );
    setSelectedResponse(item);
  };

  const gradeSelectedResponse = async () => {
    if (!selectedResponsesItem || !selectedResponse) {
      return;
    }

    setResponsesError("");
    setIsResponseAiGrading(true);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication required.");
      }

      const response = isEvaluations
        ? await gradeNavaiPanelEvaluationResponse(
            idToken,
            selectedResponsesItem.id,
            selectedResponse.id,
          )
        : await gradeNavaiPanelSurveyResponse(
            idToken,
            selectedResponsesItem.id,
            selectedResponse.id,
          );

      replaceExperienceResponse(response.item);
    } catch (gradingError) {
      setResponsesError(
        gradingError instanceof Error
          ? gradingError.message
          : messages.panelPage.experienceResponseAiGradingErrorMessage,
      );
    } finally {
      setIsResponseAiGrading(false);
    }
  };

  const responseGroups = useMemo<ResponseGroup[]>(() => {
    const groups = new Map<string, ResponseGroup>();
    const anonymousLabel = normalize(
      messages.panelPage.experienceResponsesAnonymousUserLabel,
    );

    for (const response of experienceResponses) {
      const respondentEmail = response.respondentEmail.trim();
      const respondentUserId = response.respondentUserId.trim();
      const groupId =
        respondentEmail.toLowerCase() ||
        respondentUserId.toLowerCase() ||
        "__anonymous__";
      const label = respondentEmail || respondentUserId || anonymousLabel;
      const latestActivityAt =
        response.endedAt || response.updatedAt || response.startedAt;
      const existing = groups.get(groupId);

      if (!existing) {
        groups.set(groupId, {
          id: groupId,
          label,
          respondentEmail,
          respondentUserId,
          totalScore: 0,
          conversationsCount: 1,
          completedCount: response.status === "Completed" ? 1 : 0,
          openCount: response.status === "Open" ? 1 : 0,
          abandonedCount: response.status === "Abandoned" ? 1 : 0,
          answeredQuestions: response.answeredQuestions,
          totalQuestions: response.totalQuestions,
          latestActivityAt,
          responses: [response],
        });
        continue;
      }

      existing.conversationsCount += 1;
      existing.completedCount += response.status === "Completed" ? 1 : 0;
      existing.openCount += response.status === "Open" ? 1 : 0;
      existing.abandonedCount += response.status === "Abandoned" ? 1 : 0;
      existing.answeredQuestions += response.answeredQuestions;
      existing.totalQuestions += response.totalQuestions;
      existing.responses.push(response);

      if (
        new Date(latestActivityAt).getTime() >
        new Date(existing.latestActivityAt).getTime()
      ) {
        existing.latestActivityAt = latestActivityAt;
      }
    }

    return Array.from(groups.values())
      .map((group) => {
        const responses = [...group.responses].sort(
          (left, right) =>
            new Date(
              right.endedAt || right.updatedAt || right.startedAt,
            ).getTime() -
            new Date(
              left.endedAt || left.updatedAt || left.startedAt,
            ).getTime(),
        );
        const score = calculateExperienceCompositeScore(responses);

        return {
          ...group,
          totalScore: score.totalScore,
          responses,
        };
      })
      .sort(
        (left, right) =>
          right.totalScore - left.totalScore ||
          right.completedCount - left.completedCount ||
          right.answeredQuestions - left.answeredQuestions ||
          new Date(right.latestActivityAt).getTime() -
            new Date(left.latestActivityAt).getTime(),
      );
  }, [
    experienceResponses,
    messages.panelPage.experienceResponsesAnonymousUserLabel,
  ]);

  const selectedResponseGroup = useMemo(
    () =>
      responseGroups.find((group) => group.id === selectedResponseGroupId) ??
      null,
    [responseGroups, selectedResponseGroupId],
  );
  const statisticsButtonLabel = normalize(
    messages.panelPage.tableStatisticsButtonLabel,
  );
  const statisticsChartEmptyMessage = normalize(
    messages.panelPage.tableStatisticsChartEmptyMessage,
  );
  const experienceStatistics = useMemo<TableStatisticsConfig>(() => {
    const totalQuestions = filteredItems.reduce(
      (total, item) => total + item.questions.length,
      0,
    );
    const totalConversations = filteredItems.reduce(
      (total, item) => total + item.conversations,
      0,
    );
    const activeCount = filteredItems.filter(
      (item) => item.status === "Active",
    ).length;
    const chartUsesConversations = totalConversations > 0;

    return {
      tableLabel: normalize(title),
      hasData: filteredItems.length > 0,
      cards: [
        { label: normalize(title), value: String(filteredItems.length) },
        {
          label: normalize(messages.panelPage.workspaceStatusActiveLabel),
          value: String(activeCount),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesConversationsColumnLabel,
          ),
          value: String(totalConversations),
        },
        {
          label: normalize(
            isEvaluations
              ? messages.panelPage.evaluationQuestionsSectionLabel
              : messages.panelPage.surveyQuestionsSectionLabel,
          ),
          value: String(totalQuestions),
        },
      ],
      charts: [
        {
          id: `${mode}-experience-status`,
          kind: "pie",
          title: normalize(messages.panelPage.experienceStatusFieldLabel),
          data: [
            createStatisticsDatum(
              normalize(messages.panelPage.workspaceStatusDraftLabel),
              filteredItems.filter((item) => item.status === "Draft").length,
              0,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.workspaceStatusActiveLabel),
              filteredItems.filter((item) => item.status === "Active").length,
              1,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.workspaceStatusCompletedLabel),
              filteredItems.filter((item) => item.status === "Completed").length,
              2,
            ),
          ],
        },
        {
          id: `${mode}-experience-volume`,
          kind: "bar",
          title: normalize(
            chartUsesConversations
              ? messages.panelPage.experienceResponsesConversationsColumnLabel
              : isEvaluations
                ? messages.panelPage.evaluationQuestionsSectionLabel
                : messages.panelPage.surveyQuestionsSectionLabel,
          ),
          data: [...filteredItems]
            .sort((left, right) =>
              chartUsesConversations
                ? right.conversations - left.conversations
                : right.questions.length - left.questions.length,
            )
            .slice(0, 6)
            .map((item, index) =>
              createStatisticsDatum(
                normalize(item.name || item.slug || `#${index + 1}`),
                chartUsesConversations
                  ? item.conversations
                  : item.questions.length,
                index,
              ),
            ),
        },
      ],
    };
  }, [filteredItems, isEvaluations, messages, mode, title]);
  const questionStatistics = useMemo<TableStatisticsConfig>(() => {
    const aiEnabledCount = draft.questions.filter(
      (item) => item.allowAiGrading,
    ).length;
    const manualCount = draft.questions.length - aiEnabledCount;
    const answeredTemplateCount = draft.questions.filter((item) =>
      item.expectedAnswer.trim(),
    ).length;

    return {
      tableLabel: normalize(
        isEvaluations
          ? messages.panelPage.evaluationQuestionsSectionLabel
          : messages.panelPage.surveyQuestionsSectionLabel,
      ),
      hasData: draft.questions.length > 0,
      cards: [
        {
          label: normalize(
            isEvaluations
              ? messages.panelPage.evaluationQuestionsSectionLabel
              : messages.panelPage.surveyQuestionsSectionLabel,
          ),
          value: String(draft.questions.length),
        },
        {
          label: normalize(messages.panelPage.evaluationAiGradingEnabledLabel),
          value: String(aiEnabledCount),
        },
        {
          label: normalize(messages.panelPage.evaluationAiGradingDisabledLabel),
          value: String(manualCount),
        },
        ...(isEvaluations
          ? [
              {
                label: normalize(
                  messages.panelPage.evaluationExpectedAnswerColumnLabel,
                ),
                value: String(answeredTemplateCount),
              },
            ]
          : []),
      ],
      charts: [
        {
          id: `${mode}-question-grading`,
          kind: "pie",
          title: normalize(messages.panelPage.evaluationAiGradingColumnLabel),
          data: [
            createStatisticsDatum(
              normalize(messages.panelPage.evaluationAiGradingEnabledLabel),
              aiEnabledCount,
              0,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.evaluationAiGradingDisabledLabel),
              manualCount,
              1,
            ),
          ],
        },
        {
          id: `${mode}-question-length`,
          kind: "bar",
          title: normalize(
            isEvaluations
              ? messages.panelPage.evaluationQuestionColumnLabel
              : messages.panelPage.surveyQuestionColumnLabel,
          ),
          data: [...draft.questions]
            .sort(
              (left, right) => right.question.length - left.question.length,
            )
            .slice(0, 6)
            .map((item, index) =>
              createStatisticsDatum(
                normalize(item.question || `#${index + 1}`),
                item.question.trim().length,
                index,
              ),
            ),
        },
      ],
    };
  }, [draft.questions, isEvaluations, messages, mode]);
  const responseGroupStatistics = useMemo<TableStatisticsConfig>(() => {
    const totalConversations = responseGroups.reduce(
      (total, group) => total + group.conversationsCount,
      0,
    );
    const totalCompleted = responseGroups.reduce(
      (total, group) => total + group.completedCount,
      0,
    );
    const totalOpen = responseGroups.reduce(
      (total, group) => total + group.openCount,
      0,
    );
    const totalAbandoned = responseGroups.reduce(
      (total, group) => total + group.abandonedCount,
      0,
    );
    const totalAnswered = responseGroups.reduce(
      (total, group) => total + group.answeredQuestions,
      0,
    );
    const totalQuestions = responseGroups.reduce(
      (total, group) => total + group.totalQuestions,
      0,
    );

    return {
      tableLabel: normalize(
        selectedResponsesItem?.name ||
          messages.panelPage.experienceResponsesDialogTitle,
      ),
      hasData: responseGroups.length > 0,
      cards: [
        {
          label: normalize(messages.panelPage.experienceResponsesUserColumnLabel),
          value: String(responseGroups.length),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesConversationsColumnLabel,
          ),
          value: String(totalConversations),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesCompletedColumnLabel,
          ),
          value: formatPercentageValue(
            totalConversations > 0
              ? (totalCompleted / totalConversations) * 100
              : 0,
          ),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesAnsweredColumnLabel,
          ),
          value: formatPercentageValue(
            totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0,
          ),
        },
      ],
      charts: [
        {
          id: `${mode}-response-groups-status`,
          kind: "pie",
          title: normalize(messages.panelPage.experienceResponsesStatusColumnLabel),
          data: [
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesCompletedColumnLabel),
              totalCompleted,
              0,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesOpenColumnLabel),
              totalOpen,
              1,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesAbandonedColumnLabel),
              totalAbandoned,
              2,
            ),
          ],
        },
        {
          id: `${mode}-response-groups-volume`,
          kind: "bar",
          title: normalize(
            messages.panelPage.experienceResponsesConversationsColumnLabel,
          ),
          data: [...responseGroups]
            .sort(
              (left, right) =>
                right.conversationsCount - left.conversationsCount,
            )
            .slice(0, 6)
            .map((group, index) =>
              createStatisticsDatum(
                normalize(group.label || `#${index + 1}`),
                group.conversationsCount,
                index,
              ),
            ),
        },
      ],
    };
  }, [messages, mode, responseGroups, selectedResponsesItem?.name]);
  const selectedGroupResponses = selectedResponseGroup?.responses ?? [];
  const responseStatistics = useMemo<TableStatisticsConfig>(() => {
    const completedCount = selectedGroupResponses.filter(
      (response) => response.status === "Completed",
    ).length;
    const openCount = selectedGroupResponses.filter(
      (response) => response.status === "Open",
    ).length;
    const abandonedCount = selectedGroupResponses.filter(
      (response) => response.status === "Abandoned",
    ).length;
    const videosCount = selectedGroupResponses.filter(
      (response) =>
        Boolean(response.videoDownloadUrl) || Boolean(response.videoStoragePath),
    ).length;
    const durations = selectedGroupResponses
      .map((response) =>
        getConversationDurationSeconds(
          response.startedAt,
          response.endedAt,
          response.updatedAt,
        ),
      )
      .filter((value): value is number => value !== null);
    const averageDurationSeconds =
      durations.length > 0
        ? Math.round(
            durations.reduce((total, value) => total + value, 0) /
              durations.length,
          )
        : 0;

    return {
      tableLabel: normalize(
        selectedResponseGroup?.label ||
          messages.panelPage.experienceResponsesUserColumnLabel,
      ),
      hasData: selectedGroupResponses.length > 0,
      cards: [
        {
          label: normalize(
            messages.panelPage.experienceResponsesConversationsColumnLabel,
          ),
          value: String(selectedGroupResponses.length),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesCompletedColumnLabel,
          ),
          value: String(completedCount),
        },
        {
          label: normalize(
            messages.panelPage.experienceResponsesDurationColumnLabel,
          ),
          value: formatDurationFromSeconds(averageDurationSeconds),
        },
        {
          label: normalize(messages.panelPage.experienceResponseVideoSectionLabel),
          value: String(videosCount),
        },
      ],
      charts: [
        {
          id: `${mode}-responses-status`,
          kind: "pie",
          title: normalize(messages.panelPage.experienceResponsesStatusColumnLabel),
          data: [
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesCompletedColumnLabel),
              completedCount,
              0,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesOpenColumnLabel),
              openCount,
              1,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponsesAbandonedColumnLabel),
              abandonedCount,
              2,
            ),
          ],
        },
        {
          id: `${mode}-responses-answered`,
          kind: "bar",
          title: normalize(
            messages.panelPage.experienceResponsesAnsweredColumnLabel,
          ),
          data: selectedGroupResponses.slice(0, 6).map((response, index) =>
            createStatisticsDatum(
              normalize(
                `${formatDateOnly(response.startedAt)} ${formatTimeOnly(
                  response.startedAt,
                )}`,
              ),
              response.totalQuestions > 0
                ? Math.round(
                    (response.answeredQuestions / response.totalQuestions) *
                      100,
                  )
                : 0,
              index,
            ),
          ),
        },
      ],
    };
  }, [messages, mode, selectedGroupResponses, selectedResponseGroup?.label]);
  const responseAnswerStatistics = useMemo<TableStatisticsConfig>(() => {
    const answers = selectedResponse?.answers ?? [];
    const gradedAnswers = answers.filter((answer) => answer.aiScore >= 1);
    const pendingAnswers = answers.length - gradedAnswers.length;
    const averageScore =
      gradedAnswers.length > 0
        ? gradedAnswers.reduce((total, answer) => total + answer.aiScore, 0) /
          gradedAnswers.length
        : 0;

    return {
      tableLabel: normalize(
        messages.panelPage.experienceResponseAnswersSectionLabel,
      ),
      hasData: answers.length > 0,
      cards: [
        {
          label: normalize(messages.panelPage.experienceResponseAnswerColumnLabel),
          value: String(answers.length),
        },
        {
          label: normalize(messages.panelPage.experienceResponseAiScoreColumnLabel),
          value: formatAverageScoreValue(averageScore),
        },
        {
          label: normalize(messages.panelPage.experienceResponseAiNotGradedLabel),
          value: String(pendingAnswers),
        },
      ],
      charts: [
        {
          id: `${mode}-response-answers-score`,
          kind: "bar",
          title: normalize(messages.panelPage.experienceResponseAiScoreColumnLabel),
          data: gradedAnswers.map((answer, index) =>
            createStatisticsDatum(
              normalize(answer.questionText || `#${index + 1}`),
              answer.aiScore,
              index,
            ),
          ),
        },
        {
          id: `${mode}-response-answers-status`,
          kind: "pie",
          title: normalize(messages.panelPage.experienceResponseAiScoreColumnLabel),
          data: [
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponseAiScoreColumnLabel),
              gradedAnswers.length,
              0,
            ),
            createStatisticsDatum(
              normalize(messages.panelPage.experienceResponseAiNotGradedLabel),
              pendingAnswers,
              1,
            ),
          ],
        },
      ],
    };
  }, [messages, mode, selectedResponse?.answers]);
  const renderStatisticsButton = (statistics: TableStatisticsConfig) => (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setActiveStatistics(statistics);
      }}
      disabled={!statistics.hasData}
    >
      <BarChart3 aria-hidden="true" />
      <span>{statisticsButtonLabel}</span>
    </Button>
  );

  const columns = useMemo<ColumnDef<Item>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) =>
          header(messages.panelPage.labelFieldLabel, column),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "agentName",
        header: normalize(messages.panelPage.agentSidebarTitle),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.agentName ||
              normalize(messages.panelPage.noAgentOptionLabel)}
          </span>
        ),
      },
      {
        accessorKey: "publicPath",
        header: normalize(messages.panelPage.experiencePublicLinkColumnLabel),
        cell: ({ row }) => {
          const url = buildPublicUrl(row.original.publicPath);
          return (
            <div className="navai-panel-table-actions">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                aria-label={normalize(messages.common.copyAction)}
                title={normalize(messages.common.copyAction)}
                onClick={() => {
                  void navigator.clipboard.writeText(url);
                }}
              >
                <Copy aria-hidden="true" />
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="navai-panel-table-action-button inline-flex h-10 w-10 items-center justify-center"
                aria-label={normalize(
                  messages.panelPage.experiencePublicLinkPreviewLabel,
                )}
                title={normalize(
                  messages.panelPage.experiencePublicLinkPreviewLabel,
                )}
              >
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: normalize(messages.panelPage.actionsColumnLabel),
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="navai-panel-table-action-button"
              aria-label={normalize(
                messages.panelPage.experienceResponsesButtonLabel,
              )}
              title={normalize(
                messages.panelPage.experienceResponsesButtonLabel,
              )}
              onClick={() => {
                void openResponsesView(row.original);
              }}
            >
              <FileText aria-hidden="true" />
            </Button>
            {canEditTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                onClick={() => {
                  setDraft({
                    ...emptyDraft(),
                    id: row.original.id,
                    name: row.original.name,
                    slug: row.original.slug,
                    description: row.original.description,
                    status: row.original.status,
                    accessMode: row.original.accessMode,
                    allowedEmails: [...row.original.allowedEmails],
                    allowPlusUsers: row.original.allowPlusUsers,
                    allowNonPlusUsers: row.original.allowNonPlusUsers,
                    startsAt: row.original.startsAt,
                    endsAt: row.original.endsAt,
                    delegateAiGrading: row.original.delegateAiGrading,
                    enableRanking: row.original.enableRanking,
                    enableComments: row.original.enableComments,
                    rewardType: row.original.rewardType,
                    rewardTitle: row.original.rewardTitle,
                    rewardDescription: row.original.rewardDescription,
                    rewardDeliveryMethod: row.original.rewardDeliveryMethod,
                    rewardDeliveryDetails: row.original.rewardDeliveryDetails,
                    rewardPaymentMethods: [...row.original.rewardPaymentMethods],
                    rewardWinnerCount: row.original.rewardWinnerCount,
                    rewardPoints:
                      row.original.rewardPoints ?? row.original.rewardUsdAmount ?? 0,
                    dailyAttemptLimit: row.original.dailyAttemptLimit,
                    agentId: row.original.agentId,
                    questions: row.original.questions.map((item) => ({
                      ...item,
                    })),
                    welcomeTitle: row.original.welcomeTitle,
                    welcomeBody:
                      row.original.welcomeBody || row.original.description,
                    autoStartConversation: row.original.autoStartConversation,
                    enableEntryModal: row.original.enableEntryModal,
                    enableHCaptcha: row.original.enableHCaptcha,
                    systemPrompt: row.original.description,
                  });
                  setSelectedAgentId(row.original.agentId);
                  setDialogError("");
                  setIsDialogOpen(true);
                }}
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
                onClick={() => {
                  if (
                    !window.confirm(
                      normalize(
                        messages.panelPage.experienceDeleteConfirmMessage,
                      ),
                    )
                  )
                    return;
                  void (async () => {
                    const idToken = await user?.getIdToken();
                    if (!idToken) return;
                    if (isEvaluations) {
                      await deleteNavaiPanelEvaluation(
                        idToken,
                        row.original.id,
                      );
                    } else {
                      await deleteNavaiPanelSurvey(idToken, row.original.id);
                    }
                    setItems((current) =>
                      current.filter((item) => item.id !== row.original.id),
                    );
                  })();
                }}
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
      isEvaluations,
      messages,
      openResponsesView,
      user,
    ],
  );

  const questionColumns = useMemo<ColumnDef<NavaiPanelEvaluationQuestion>[]>(
    () => [
      {
        accessorKey: "question",
        header: ({ column }) =>
          header(
            isEvaluations
              ? messages.panelPage.evaluationQuestionColumnLabel
              : messages.panelPage.surveyQuestionColumnLabel,
            column,
          ),
      },
      {
        accessorKey: "allowAiGrading",
        header: normalize(messages.panelPage.evaluationAiGradingColumnLabel),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {normalize(
              row.original.allowAiGrading
                ? messages.panelPage.evaluationAiGradingEnabledLabel
                : messages.panelPage.evaluationAiGradingDisabledLabel,
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: normalize(messages.panelPage.actionsColumnLabel),
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            {canEditTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setQuestionDraft({ ...row.original });
                  setIsQuestionDialogOpen(true);
                }}
              >
                <Pencil aria-hidden="true" />
              </Button>
            ) : null}
            {canDeleteTableData ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    questions: current.questions.filter(
                      (item) => item.id !== row.original.id,
                    ),
                  }));
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDeleteTableData, canEditTableData, isEvaluations, messages],
  );

  const responseGroupColumns = useMemo<ColumnDef<ResponseGroup>[]>(
    () => [
      {
        accessorKey: "label",
        header: normalize(
          messages.panelPage.experienceResponsesUserColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.label}
          </span>
        ),
      },
      {
        accessorKey: "totalScore",
        header: normalize(messages.panelPage.publicExperienceRankingScoreLabel),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.totalScore}
          </span>
        ),
      },
      {
        accessorKey: "conversationsCount",
        header: normalize(
          messages.panelPage.experienceResponsesConversationsColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.conversationsCount}
          </span>
        ),
      },
      {
        accessorKey: "completedCount",
        header: normalize(
          messages.panelPage.experienceResponsesCompletedColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.completedCount}
          </span>
        ),
      },
      {
        accessorKey: "openCount",
        header: normalize(
          messages.panelPage.experienceResponsesOpenColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.openCount}
          </span>
        ),
      },
      {
        accessorKey: "abandonedCount",
        header: normalize(
          messages.panelPage.experienceResponsesAbandonedColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.abandonedCount}
          </span>
        ),
      },
      {
        accessorKey: "latestActivityAt",
        header: normalize(
          messages.panelPage.experienceResponsesLastActivityColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {formatDateTimeSummary(row.original.latestActivityAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: normalize(messages.panelPage.actionsColumnLabel),
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setSelectedResponseGroupId(row.original.id);
              setSelectedResponse(null);
            }}
          >
            <FileText aria-hidden="true" />
            <span>
              {normalize(
                messages.panelPage.experienceResponsesViewUserButtonLabel,
              )}
            </span>
          </Button>
        ),
      },
    ],
    [messages],
  );

  const responseColumns = useMemo<ColumnDef<NavaiPanelExperienceResponse>[]>(
    () => [
      {
        id: "user",
        accessorFn: (row) =>
          row.respondentEmail || row.respondentUserId || row.id,
        header: normalize(
          messages.panelPage.experienceResponsesUserColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-primary">
            {row.original.respondentEmail || row.original.respondentUserId}
          </span>
        ),
      },
      {
        id: "date",
        accessorFn: (row) => row.startedAt,
        header: normalize(
          messages.panelPage.experienceResponsesDateColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {formatDateOnly(row.original.startedAt)}
          </span>
        ),
      },
      {
        id: "startedAt",
        accessorFn: (row) => row.startedAt,
        header: normalize(
          messages.panelPage.experienceResponsesStartedAtColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {formatTimeOnly(row.original.startedAt)}
          </span>
        ),
      },
      {
        id: "endedAt",
        accessorFn: (row) => row.endedAt || "",
        header: normalize(
          messages.panelPage.experienceResponsesEndedAtColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.endedAt
              ? formatTimeOnly(row.original.endedAt)
              : "â€”"}
          </span>
        ),
      },
      {
        id: "duration",
        accessorFn: (row) =>
          getConversationDurationSeconds(
            row.startedAt,
            row.endedAt,
            row.updatedAt,
          ) ?? -1,
        header: normalize(
          messages.panelPage.experienceResponsesDurationColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {formatConversationDuration(
              row.original.startedAt,
              row.original.endedAt,
              row.original.updatedAt,
            )}
          </span>
        ),
      },
      {
        id: "answered",
        accessorFn: (row) =>
          row.totalQuestions > 0
            ? row.answeredQuestions / row.totalQuestions
            : row.answeredQuestions,
        header: normalize(
          messages.panelPage.experienceResponsesAnsweredColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {`${row.original.answeredQuestions}/${row.original.totalQuestions}`}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: normalize(
          messages.panelPage.experienceResponsesStatusColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: normalize(messages.panelPage.actionsColumnLabel),
        cell: ({ row }) => {
          const videoUrl = resolveExperienceResponseVideoUrl(row.original);
          const videoButtonLabel = normalize(
            messages.panelPage.experienceResponseVideoButtonLabel,
          );

          return (
            <div className="navai-panel-table-actions">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                aria-label={normalize(
                  messages.panelPage.experienceResponseDetailsButtonLabel,
                )}
                title={normalize(
                  messages.panelPage.experienceResponseDetailsButtonLabel,
                )}
                onClick={() => {
                  setSelectedResponse(row.original);
                }}
              >
                <FileText aria-hidden="true" />
              </Button>
              {videoUrl ? (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="navai-panel-table-action-button"
                >
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={videoButtonLabel}
                    title={videoButtonLabel}
                  >
                    <Play aria-hidden="true" />
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="navai-panel-table-action-button"
                  aria-label={videoButtonLabel}
                  title={videoButtonLabel}
                  disabled
                >
                  <Play aria-hidden="true" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [messages],
  );

  const responseAnswerColumns = useMemo<
    ColumnDef<NavaiPanelExperienceResponse["answers"][number]>[]
  >(
    () => [
      {
        accessorKey: "questionText",
        header: normalize(
          isEvaluations
            ? messages.panelPage.evaluationQuestionColumnLabel
            : messages.panelPage.surveyQuestionColumnLabel,
        ),
      },
      {
        accessorKey: "answerText",
        header: normalize(
          messages.panelPage.experienceResponseAnswerColumnLabel,
        ),
      },
      {
        accessorKey: "aiScore",
        header: normalize(
          messages.panelPage.experienceResponseAiScoreColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.aiScore >= 1
              ? `${row.original.aiScore}/10`
              : normalize(
                  messages.panelPage.experienceResponseAiNotGradedLabel,
                )}
          </span>
        ),
      },
      {
        accessorKey: "aiFeedback",
        header: normalize(
          messages.panelPage.experienceResponseAiFeedbackColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {row.original.aiFeedback ||
              normalize(messages.panelPage.experienceResponseAiNotGradedLabel)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: normalize(
          messages.panelPage.experienceResponseUpdatedAtColumnLabel,
        ),
        cell: ({ row }) => (
          <span className="navai-panel-table-secondary">
            {formatTimeOnly(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [isEvaluations, messages],
  );

  const agentSidebar = isLoading ? (
    <PanelSidebarCardsSkeleton />
  ) : (
    <section className="navai-panel-sidebar-section">
      <div className="navai-panel-sidebar-header">
        <div className="navai-panel-sidebar-copy">
          <h2>{normalize(messages.panelPage.agentSidebarTitle)}</h2>
        </div>
        {canEditTableData ? (
          <Button
            type="button"
            variant="secondary"
            className="navai-panel-sidebar-create-button"
            onClick={() => {
              setAgentDraft({
                id: null,
                name: defaultAgentName,
                agentModel: "",
                agentVoice: "",
                agentLanguage: "",
                agentVoiceAccent: "",
                agentVoiceTone: "",
              });
              setAgentError("");
              setIsAgentDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            <span>{normalize(messages.panelPage.createAgentButtonLabel)}</span>
          </Button>
        ) : null}
      </div>

      <div className="navai-support-ticket-items">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className={`navai-support-ticket-item${agent.id === selectedAgent?.id ? " is-active" : ""}`}
          >
            <button
              type="button"
              className="navai-panel-sidebar-item-title-button"
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <strong className="navai-panel-sidebar-item-title">
                {agent.name}
              </strong>
            </button>
            <div className="navai-panel-sidebar-item-meta-row">
              <button
                type="button"
                className="navai-panel-sidebar-item-description-button"
                onClick={() => setSelectedAgentId(agent.id)}
                title={buildAgentSummary(
                  agent,
                  normalize(messages.panelPage.noDescriptionLabel),
                )}
              >
                <span className="navai-panel-sidebar-item-description">
                  {buildAgentSummary(
                    agent,
                    normalize(messages.panelPage.noDescriptionLabel),
                  )}
                </span>
              </button>
              {agent.id === selectedAgent?.id &&
              (canEditTableData || canDeleteTableData) ? (
                <div className="navai-panel-domain-card-actions">
                  {canEditTableData ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="navai-panel-domain-card-action-button"
                      onClick={() => {
                        setAgentDraft({
                          id: agent.id,
                          name: agent.name,
                          agentModel: agent.agentModel,
                          agentVoice: agent.agentVoice,
                          agentLanguage: agent.agentLanguage,
                          agentVoiceAccent: agent.agentVoiceAccent,
                          agentVoiceTone: agent.agentVoiceTone,
                        });
                        setAgentError("");
                        setIsAgentDialogOpen(true);
                      }}
                      aria-label={normalize(
                        messages.panelPage.editAgentButtonLabel,
                      )}
                      title={normalize(messages.panelPage.editAgentButtonLabel)}
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
                      onClick={() => {
                        if (
                          !window.confirm(
                            normalize(
                              messages.panelPage.agentDeleteConfirmMessage,
                            ),
                          )
                        )
                          return;
                        void (async () => {
                          const idToken = await user?.getIdToken();
                          if (!idToken) return;
                          if (isEvaluations) {
                            await deleteNavaiPanelEvaluationAgent(
                              idToken,
                              agent.id,
                            );
                          } else {
                            await deleteNavaiPanelSurveyAgent(
                              idToken,
                              agent.id,
                            );
                          }
                          setAgents((current) =>
                            current.filter((item) => item.id !== agent.id),
                          );
                          setItems((current) =>
                            current.map((item) =>
                              item.agentId === agent.id
                                ? {
                                    ...item,
                                    agentId: "",
                                    agentName: "",
                                    agentModel: "",
                                    agentVoice: "",
                                    agentLanguage: "",
                                    agentVoiceAccent: "",
                                    agentVoiceTone: "",
                                  }
                                : item,
                            ),
                          );
                          setSelectedAgentId("");
                        })();
                      }}
                      aria-label={normalize(
                        messages.panelPage.deleteActionLabel,
                      )}
                      title={normalize(messages.panelPage.deleteActionLabel)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const responsesBreadcrumb = selectedResponsesItem ? (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="inline-flex w-full max-w-full gap-2 px-4 py-2">
        <BreadcrumbItem className="max-w-[12rem]">
          <BreadcrumbLink asChild={true}>
            <button
              type="button"
              className="truncate text-left"
              onClick={closeResponsesView}
            >
              {normalize(title)}
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="text-muted-foreground/70" />
        <BreadcrumbItem className="max-w-[16rem]">
          {selectedResponseGroup || selectedResponse ? (
            <BreadcrumbLink asChild={true}>
              <button
                type="button"
                className="truncate text-left"
                onClick={() => {
                  setSelectedResponseGroupId("");
                  setSelectedResponse(null);
                }}
              >
                {selectedResponsesItem.name}
              </button>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{selectedResponsesItem.name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {selectedResponseGroup ? (
          <BreadcrumbSeparator className="text-muted-foreground/70" />
        ) : null}
        {selectedResponseGroup ? (
          <BreadcrumbItem className="max-w-[18rem]">
            {selectedResponse ? (
              <BreadcrumbLink asChild={true}>
                <button
                  type="button"
                  className="truncate text-left"
                  onClick={() => setSelectedResponse(null)}
                >
                  {selectedResponseGroup.label}
                </button>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{selectedResponseGroup.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ) : null}
        {selectedResponse ? (
          <BreadcrumbSeparator className="text-muted-foreground/70" />
        ) : null}
        {selectedResponse ? (
          <BreadcrumbItem className="max-w-[18rem]">
            <BreadcrumbPage>
              {normalize(
                messages.panelPage.experienceResponseDetailsDialogTitle,
              )}
            </BreadcrumbPage>
          </BreadcrumbItem>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  ) : null;

  const renderResponsesHeader = (
    heading: string,
    description: string,
  ) => (
    <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
      <Button
        type="button"
        variant="outline"
        className="w-fit shrink-0 gap-2"
        onClick={handleResponsesBack}
      >
        <ArrowLeft aria-hidden="true" />
        <span>{normalize(messages.panelPage.backButtonLabel)}</span>
      </Button>
      <div className="min-w-0 space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  const renderResponsesTableSection = (table: ReactNode) => (
    <div className="space-y-3">
      {responsesBreadcrumb}
      {table}
    </div>
  );

  const responsesPanel = selectedResponsesItem ? (
    <div className="space-y-6">
      {responsesError ? (
        <p className="navai-panel-error">{responsesError}</p>
      ) : null}

      {isResponsesLoading ? (
        <PanelContentSkeleton />
      ) : selectedResponse ? (
        <div className="space-y-6">
          {renderResponsesHeader(
            normalize(messages.panelPage.experienceResponseDetailsDialogTitle),
            selectedResponseGroup?.label ||
              selectedResponse.respondentEmail ||
              selectedResponse.respondentUserId,
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesUserColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {selectedResponse.respondentEmail ||
                  selectedResponse.respondentUserId}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesDateColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatDateOnly(selectedResponse.startedAt)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesStartedAtColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatTimeOnly(selectedResponse.startedAt)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesEndedAtColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {selectedResponse.endedAt
                  ? formatTimeOnly(selectedResponse.endedAt)
                  : "—"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesDurationColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {formatConversationDuration(
                  selectedResponse.startedAt,
                  selectedResponse.endedAt,
                  selectedResponse.updatedAt,
                )}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesAnsweredColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {`${selectedResponse.answeredQuestions}/${selectedResponse.totalQuestions}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponsesStatusColumnLabel,
                )}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {selectedResponse.status}
              </p>
            </div>
          </div>

          {renderResponsesTableSection(
            <DataTable
              columns={responseAnswerColumns}
              data={selectedResponse.answers}
              emptyMessage={normalize(
                messages.panelPage.experienceResponseAnswersEmptyMessage,
              )}
              filterColumnId="questionText"
              filterPlaceholder={normalize(
                isEvaluations
                  ? messages.panelPage.tableFilterEvaluationQuestionsPlaceholder
                  : messages.panelPage.tableFilterSurveyQuestionsPlaceholder,
              )}
              columnsButtonLabel={normalize(
                messages.panelPage.tableColumnsButtonLabel,
              )}
              toolbarActions={
                <>
                  {canEditTableData ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void gradeSelectedResponse()}
                      disabled={
                        isResponseAiGrading ||
                        selectedResponse.answers.length === 0
                      }
                    >
                      <Sparkles aria-hidden="true" />
                      <span>
                        {normalize(
                          messages.panelPage
                            .experienceResponseAiGradeButtonLabel,
                        )}
                      </span>
                    </Button>
                  ) : null}
                  {renderStatisticsButton(responseAnswerStatistics)}
                </>
              }
              previousPageLabel={normalize(
                messages.panelPage.tablePreviousPageLabel,
              )}
              nextPageLabel={normalize(messages.panelPage.tableNextPageLabel)}
              paginationSummaryTemplate={normalize(
                messages.panelPage.tablePaginationSummaryLabel,
              )}
            />,
          )}

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {normalize(
                messages.panelPage.experienceResponseVideoSectionLabel,
              )}
            </h3>
            {selectedResponse.videoStoragePath || selectedResponse.videoDownloadUrl ? (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-background/35">
                <iframe
                  src={resolveExperienceResponseVideoUrl(selectedResponse)}
                  title={normalize(messages.panelPage.experienceResponseVideoSectionLabel)}
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full border-0"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponseVideoEmptyMessage,
                )}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {normalize(
                messages.panelPage.experienceResponseAudioSectionLabel,
              )}
            </h3>
            {selectedResponse.audioDownloadUrl ? (
              <audio
                controls
                src={selectedResponse.audioDownloadUrl}
                className="w-full rounded-xl border border-border/70 bg-background/35 p-3"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {normalize(
                  messages.panelPage.experienceResponseAudioEmptyMessage,
                )}
              </p>
            )}
          </div>
        </div>
      ) : selectedResponseGroup ? (
        <div className="space-y-4">
          {renderResponsesHeader(
            selectedResponseGroup.label,
            selectedResponsesItem.name,
          )}
          {renderResponsesTableSection(
            <DataTable
              columns={responseColumns}
              data={selectedResponseGroup.responses}
              emptyMessage={normalize(
                messages.panelPage.experienceResponsesEmptyMessage,
              )}
              filterColumnId="status"
              filterPlaceholder={normalize(
                messages.panelPage.experienceResponsesFilterPlaceholder,
              )}
              columnsButtonLabel={normalize(
                messages.panelPage.tableColumnsButtonLabel,
              )}
              previousPageLabel={normalize(
                messages.panelPage.tablePreviousPageLabel,
              )}
              nextPageLabel={normalize(messages.panelPage.tableNextPageLabel)}
              paginationSummaryTemplate={normalize(
                messages.panelPage.tablePaginationSummaryLabel,
              )}
              toolbarActions={renderStatisticsButton(responseStatistics)}
            />,
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {renderResponsesHeader(
            normalize(messages.panelPage.experienceResponsesDialogTitle),
            selectedResponsesItem.name,
          )}
          {renderResponsesTableSection(
            <DataTable
              columns={responseGroupColumns}
              data={responseGroups}
              emptyMessage={normalize(
                messages.panelPage.experienceResponsesEmptyMessage,
              )}
              filterColumnId="label"
              filterPlaceholder={normalize(
                messages.panelPage.experienceResponsesFilterPlaceholder,
              )}
              columnsButtonLabel={normalize(
                messages.panelPage.tableColumnsButtonLabel,
              )}
              previousPageLabel={normalize(
                messages.panelPage.tablePreviousPageLabel,
              )}
              nextPageLabel={normalize(messages.panelPage.tableNextPageLabel)}
              paginationSummaryTemplate={normalize(
                messages.panelPage.tablePaginationSummaryLabel,
              )}
              toolbarActions={renderStatisticsButton(responseGroupStatistics)}
            />,
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <PanelModuleShellContent
      page={mode}
      description={normalize(
        messages.panelPage.publicExperienceSectionDescription,
      )}
      rightSidebarExtra={agentSidebar}
    >
      <article className="navai-panel-layout">
        <section className="docs-section-block navai-panel-card">
          {error ? <p className="navai-panel-error">{error}</p> : null}

          {isLoading ? (
            <PanelContentSkeleton />
          ) : responsesPanel ? (
            responsesPanel
          ) : selectedAgent ? (
            <DataTable
              columns={columns}
              data={filteredItems}
              emptyMessage={normalize(
                isEvaluations
                  ? messages.panelPage.emptyEvaluationsMessage
                  : messages.panelPage.emptySurveysMessage,
              )}
              filterColumnId="name"
              filterPlaceholder={normalize(filterPlaceholder)}
              columnsButtonLabel={normalize(
                messages.panelPage.tableColumnsButtonLabel,
              )}
              previousPageLabel={normalize(
                messages.panelPage.tablePreviousPageLabel,
              )}
              nextPageLabel={normalize(messages.panelPage.tableNextPageLabel)}
              paginationSummaryTemplate={normalize(
                messages.panelPage.tablePaginationSummaryLabel,
              )}
              toolbarActions={
                <>
                  {canEditTableData ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={normalize(
                          messages.panelPage.agentSettingsButtonLabel,
                        )}
                        title={normalize(
                          messages.panelPage.agentSettingsButtonLabel,
                        )}
                        onClick={() => {
                          setAgentDraft({
                            id: selectedAgent.id,
                            name: selectedAgent.name,
                            agentModel: selectedAgent.agentModel,
                            agentVoice: selectedAgent.agentVoice,
                            agentLanguage: selectedAgent.agentLanguage,
                            agentVoiceAccent: selectedAgent.agentVoiceAccent,
                            agentVoiceTone: selectedAgent.agentVoiceTone,
                          });
                          setAgentError("");
                          setIsAgentDialogOpen(true);
                        }}
                      >
                        <Settings2 aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setDraft(createDraftForSelectedAgent(selectedAgent.id));
                          setDialogError("");
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus aria-hidden="true" />
                        <span>{normalize(createButtonLabel)}</span>
                      </Button>
                    </>
                  ) : null}
                  {renderStatisticsButton(experienceStatistics)}
                </>
              }
            />
          ) : (
            <div className="navai-panel-empty-state">
              {canEditTableData ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    setAgentDraft({
                      id: null,
                      name: defaultAgentName,
                      agentModel: "",
                      agentVoice: "",
                      agentLanguage: "",
                      agentVoiceAccent: "",
                      agentVoiceTone: "",
                    });
                    setAgentError("");
                    setIsAgentDialogOpen(true);
                  }}
                >
                  <Plus aria-hidden="true" />
                  <span>
                    {normalize(messages.panelPage.createAgentButtonLabel)}
                  </span>
                </Button>
              ) : null}
            </div>
          )}
        </section>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{normalize(title)}</DialogTitle>
            </DialogHeader>
            <Tabs
              value={dialogTab}
              onValueChange={(value) =>
                setDialogTab(value as "general" | "rewards" | "metadata" | "questions")
              }
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <TabsList className="navai-panel-tabs-list">
                <TabsTrigger value="general">
                  {normalize(messages.panelPage.generalTabLabel)}
                </TabsTrigger>
                <TabsTrigger value="rewards">
                  {normalize(messages.panelPage.experienceRewardsTabLabel)}
                </TabsTrigger>
                <TabsTrigger value="metadata">
                  {normalize(messages.panelPage.metadataTabLabel)}
                </TabsTrigger>
                <TabsTrigger value="questions">
                  {normalize(
                    isEvaluations
                      ? messages.panelPage.evaluationQuestionsSectionLabel
                      : messages.panelPage.surveyQuestionsSectionLabel,
                  )}
                </TabsTrigger>
              </TabsList>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-3 pb-4">
                <TabsContent value="general" className="mt-0">
                  <div className="navai-panel-tab-panel">
                    <div
                      className="navai-panel-modal-separator"
                      aria-hidden="true"
                    />

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.autoStartConversation}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              autoStartConversation: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceAutoStartConversationFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.delegateAiGrading}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              delegateAiGrading: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceDelegateAiGradingFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.enableRanking}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              enableRanking: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceEnableRankingFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.enableComments}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              enableComments: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceEnableCommentsFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.enableEntryModal}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              enableEntryModal: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceEnableEntryModalFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-field">
                      <label className="navai-panel-checkbox-field">
                        <input
                          type="checkbox"
                          checked={draft.enableHCaptcha}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              enableHCaptcha: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          {normalize(
                            messages.panelPage
                              .experienceEnableHCaptchaFieldLabel,
                          )}
                        </span>
                      </label>
                    </div>

                    <div className="navai-panel-form-grid">
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-access-mode-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceAccessModeFieldLabel,
                          )}
                        </Label>
                        <select
                          id={`experience-access-mode-${mode}`}
                          className="navai-panel-select"
                          value={draft.accessMode}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              accessMode: event.target
                                .value as NavaiPanelExperienceAccessMode,
                            }))
                          }
                        >
                          <option value="public">
                            {normalize(
                              messages.panelPage
                                .experienceAccessModePublicLabel,
                            )}
                          </option>
                          <option value="private">
                            {normalize(
                              messages.panelPage
                                .experienceAccessModePrivateLabel,
                            )}
                          </option>
                        </select>
                      </div>
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-starts-at-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceStartsAtFieldLabel,
                          )}
                        </Label>
                        <Input
                          id={`experience-starts-at-${mode}`}
                          type="datetime-local"
                          value={formatDateTimeLocalInput(draft.startsAt)}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              startsAt: parseDateTimeLocalInput(
                                event.target.value,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-ends-at-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceEndsAtFieldLabel,
                          )}
                        </Label>
                        <Input
                          id={`experience-ends-at-${mode}`}
                          type="datetime-local"
                          value={formatDateTimeLocalInput(draft.endsAt)}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              endsAt: parseDateTimeLocalInput(
                                event.target.value,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-daily-attempt-limit-${mode}`}>
                          {normalize(messages.panelPage.dailyAttemptLimitFieldLabel)}
                        </Label>
                        <Input
                          id={`experience-daily-attempt-limit-${mode}`}
                          type="number"
                          min={1}
                          step={1}
                          value={String(Math.max(1, draft.dailyAttemptLimit || 1))}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              dailyAttemptLimit: Math.max(
                                1,
                                Number.parseInt(event.target.value || "1", 10) || 1,
                              ),
                            }))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {normalize(messages.panelPage.dailyAttemptLimitHelpText)}
                          </p>
                      </div>
                    </div>

                    {draft.accessMode === "private" ? (
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-allowed-emails-${mode}`}>
                          {normalize(
                            messages.panelPage
                              .experienceAllowedEmailsFieldLabel,
                          )}
                        </Label>
                        <Textarea
                          id={`experience-allowed-emails-${mode}`}
                          value={draft.allowedEmails.join("\n")}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              allowedEmails: normalizeExperienceEmailList(
                                event.target.value,
                              ),
                            }))
                          }
                          className="min-h-[7rem]"
                        />
                        <p className="text-sm text-muted-foreground">
                          {normalize(
                            messages.panelPage.experienceAllowedEmailsHelpText,
                          )}
                        </p>
                      </div>
                    ) : null}

                    <div className="navai-panel-field">
                      <Label htmlFor={`experience-instructions-${mode}`}>
                        {normalize(
                          messages.panelPage.experienceWelcomeBodyFieldLabel,
                        )}
                      </Label>
                      <Textarea
                        id={`experience-instructions-${mode}`}
                        value={draft.welcomeBody}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            welcomeBody: event.target.value,
                          }))
                        }
                        className="min-h-[7rem]"
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="rewards" className="mt-0">
                  <div className="navai-panel-tab-panel">
                    <div className="navai-panel-form-grid">
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-reward-type-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardTypeFieldLabel)}
                        </Label>
                        <select
                          id={`experience-reward-type-${mode}`}
                          className="navai-panel-select"
                          value={draft.rewardType}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardType: event.target.value as NavaiExperienceRewardType,
                            }))
                          }
                        >
                          {NAVAI_EXPERIENCE_REWARD_TYPES.map((rewardType) => (
                            <option key={rewardType} value={rewardType}>
                              {getRewardTypeLabel(messages, rewardType)}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-muted-foreground">
                          {normalize(messages.panelPage.experienceRewardTypeHelpText)}
                        </p>
                      </div>

                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-reward-winner-count-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardWinnerCountFieldLabel)}
                        </Label>
                        <Input
                          id={`experience-reward-winner-count-${mode}`}
                          type="number"
                          min={1}
                          step={1}
                          value={String(Math.max(1, draft.rewardWinnerCount || 1))}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardWinnerCount: Math.max(
                                1,
                                Number.parseInt(event.target.value || "1", 10) || 1,
                              ),
                            }))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {normalize(messages.panelPage.experienceRewardWinnerCountHelpText)}
                        </p>
                      </div>

                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-reward-points-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardUsdFieldLabel)}
                        </Label>
                        <Input
                          id={`experience-reward-points-${mode}`}
                          type="number"
                          min={0}
                          step={1}
                          value={String(
                            Math.max(
                              0,
                              Math.round(
                                Number(draft.rewardPoints ?? draft.rewardUsdAmount ?? 0)
                              ),
                            ),
                          )}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardPoints: Math.max(
                                0,
                                Math.round(
                                  Number.parseFloat(event.target.value || "0") || 0,
                                ),
                              ),
                            }))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {normalize(messages.panelPage.experienceRewardUsdHelpText)}
                        </p>
                      </div>

                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-reward-delivery-method-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardDeliveryMethodFieldLabel)}
                        </Label>
                        <select
                          id={`experience-reward-delivery-method-${mode}`}
                          className="navai-panel-select"
                          value={draft.rewardDeliveryMethod}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardDeliveryMethod:
                                event.target.value as NavaiExperienceRewardDeliveryMethod,
                            }))
                          }
                        >
                          {NAVAI_EXPERIENCE_REWARD_DELIVERY_METHODS.map((deliveryMethod) => (
                            <option key={deliveryMethod} value={deliveryMethod}>
                              {getRewardDeliveryMethodLabel(messages, deliveryMethod)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="navai-panel-field md:col-span-2">
                        <Label htmlFor={`experience-reward-title-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardTitleFieldLabel)}
                        </Label>
                        <Input
                          id={`experience-reward-title-${mode}`}
                          value={draft.rewardTitle}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardTitle: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="navai-panel-field md:col-span-2">
                        <Label htmlFor={`experience-reward-description-${mode}`}>
                          {normalize(messages.panelPage.experienceRewardDescriptionFieldLabel)}
                        </Label>
                        <Textarea
                          id={`experience-reward-description-${mode}`}
                          value={draft.rewardDescription}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardDescription: event.target.value,
                            }))
                          }
                          className="min-h-[7rem]"
                        />
                      </div>

                      <div className="navai-panel-field md:col-span-2">
                        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <div className="space-y-1">
                            <Label>
                              {normalize(
                                messages.panelPage.experienceRewardPaymentMethodsFieldLabel,
                              )}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {normalize(
                                messages.panelPage.experienceRewardPaymentMethodsHelpText,
                              )}
                            </p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {NAVAI_EXPERIENCE_REWARD_PAYMENT_METHODS.map((paymentMethod) => (
                              <label
                                key={paymentMethod}
                                className="navai-panel-checkbox-field"
                              >
                                <input
                                  type="checkbox"
                                  checked={draft.rewardPaymentMethods.includes(
                                    paymentMethod as NavaiExperienceRewardPaymentMethod,
                                  )}
                                  onChange={(event) =>
                                    setDraft((current) => ({
                                      ...current,
                                      rewardPaymentMethods: event.target.checked
                                        ? Array.from(
                                            new Set([
                                              ...current.rewardPaymentMethods,
                                              paymentMethod as NavaiExperienceRewardPaymentMethod,
                                            ]),
                                          )
                                        : current.rewardPaymentMethods.filter(
                                            (currentMethod) =>
                                              currentMethod !== paymentMethod,
                                          ),
                                    }))
                                  }
                                />
                                <span>
                                  {
                                    NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS[
                                      paymentMethod as NavaiExperienceRewardPaymentMethod
                                    ]
                                  }
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="navai-panel-field md:col-span-2">
                        <Label htmlFor={`experience-reward-delivery-details-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceRewardDeliveryDetailsFieldLabel,
                          )}
                        </Label>
                        <Textarea
                          id={`experience-reward-delivery-details-${mode}`}
                          value={draft.rewardDeliveryDetails}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rewardDeliveryDetails: event.target.value,
                            }))
                          }
                          className="min-h-[7rem]"
                        />
                        <p className="text-sm text-muted-foreground">
                          {normalize(
                            messages.panelPage.experienceRewardDeliveryDetailsHelpText,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="metadata" className="mt-0">
                  <div className="navai-panel-tab-panel">
                    <div className="navai-panel-form-grid">
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-name-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceNameFieldLabel,
                          )}
                        </Label>
                        <Input
                          id={`experience-name-${mode}`}
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="navai-panel-field">
                        <Label htmlFor={`experience-status-${mode}`}>
                          {normalize(
                            messages.panelPage.experienceStatusFieldLabel,
                          )}
                        </Label>
                        <select
                          id={`experience-status-${mode}`}
                          className="navai-panel-select"
                          value={draft.status}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              status: event.target
                                .value as NavaiPanelExperienceStatus,
                            }))
                          }
                        >
                          <option value="Draft">
                            {normalize(
                              messages.panelPage.workspaceStatusDraftLabel,
                            )}
                          </option>
                          <option value="Active">
                            {normalize(
                              messages.panelPage.workspaceStatusActiveLabel,
                            )}
                          </option>
                          <option value="Completed">
                            {normalize(
                              messages.panelPage.workspaceStatusCompletedLabel,
                            )}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="navai-panel-field">
                      <Label htmlFor={`experience-description-${mode}`}>
                        {normalize(messages.panelPage.descriptionFieldLabel)}
                      </Label>
                      <Textarea
                        id={`experience-description-${mode}`}
                        value={draft.description}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="min-h-[7rem]"
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="questions" className="mt-0">
                  <div className="navai-panel-tab-panel">
                    <div className="navai-panel-field">
                      <Label>
                        {normalize(
                          isEvaluations
                            ? messages.panelPage.evaluationQuestionsSectionLabel
                            : messages.panelPage.surveyQuestionsSectionLabel,
                        )}
                      </Label>
                      <DataTable
                        columns={questionColumns}
                        data={draft.questions}
                        emptyMessage={normalize(
                          isEvaluations
                            ? messages.panelPage.evaluationQuestionsEmptyMessage
                            : messages.panelPage.surveyQuestionsEmptyMessage,
                        )}
                        filterColumnId="question"
                        filterPlaceholder={normalize(
                          isEvaluations
                            ? messages.panelPage
                                .tableFilterEvaluationQuestionsPlaceholder
                            : messages.panelPage
                                .tableFilterSurveyQuestionsPlaceholder,
                        )}
                        columnsButtonLabel={normalize(
                          messages.panelPage.tableColumnsButtonLabel,
                        )}
                        previousPageLabel={normalize(
                          messages.panelPage.tablePreviousPageLabel,
                        )}
                        nextPageLabel={normalize(
                          messages.panelPage.tableNextPageLabel,
                        )}
                        paginationSummaryTemplate={normalize(
                          messages.panelPage.tablePaginationSummaryLabel,
                        )}
                        className="mt-3"
                        toolbarActions={
                          <>
                            {canEditTableData ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setQuestionDraft(emptyQuestion());
                                  setIsQuestionDialogOpen(true);
                                }}
                              >
                                <Plus aria-hidden="true" />
                                <span>
                                  {normalize(
                                    messages.panelPage.createQuestionButtonLabel,
                                  )}
                                </span>
                              </Button>
                            ) : null}
                            {renderStatisticsButton(questionStatistics)}
                          </>
                        }
                        renderFooter={({
                          paginationSummary,
                          canPreviousPage,
                          canNextPage,
                          previousPage,
                          nextPage,
                        }) => (
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {paginationSummary ? (
                              <span className="navai-data-table-pagination-summary text-xs text-muted-foreground/80">
                                {paginationSummary}
                              </span>
                            ) : null}
                            <div className="navai-panel-modal-footer-pagination">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={previousPage}
                                disabled={!canPreviousPage}
                              >
                                <ChevronLeft aria-hidden="true" />
                                {normalize(
                                  messages.panelPage.tablePreviousPageLabel,
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={nextPage}
                                disabled={!canNextPage}
                              >
                                {normalize(
                                  messages.panelPage.tableNextPageLabel,
                                )}
                                <ChevronRight aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            {dialogError ? (
              <p className="navai-panel-error">{dialogError}</p>
            ) : null}
            <DialogFooter className="border-t border-border/40 pt-4 pb-1 sm:justify-end">
              <Button
                type="button"
                size="lg"
                onClick={() =>
                  void persistDraftAndClose().catch((saveError: unknown) =>
                    setDialogError(
                      saveError instanceof Error
                        ? saveError.message
                        : messages.panelPage.saveErrorMessage,
                    ),
                  )
                }
                disabled={!canEditTableData}
              >
                <span>{normalize(messages.panelPage.saveButtonLabel)}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {normalize(messages.panelPage.agentSettingsDialogTitle)}
              </DialogTitle>
            </DialogHeader>
            <div className="navai-panel-tab-panel">
              <div className="navai-panel-form-grid">
                <div className="navai-panel-field">
                  <Label htmlFor={`agent-name-${mode}`}>
                    {normalize(messages.panelPage.agentNameFieldLabel)}
                  </Label>
                  <Input
                    id={`agent-name-${mode}`}
                    value={agentDraft.name}
                    onChange={(event) =>
                      setAgentDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="navai-panel-field">
                  <Label htmlFor={`agent-model-${mode}`}>
                    {normalize(
                      messages.panelPage.experienceAgentModelFieldLabel,
                    )}
                  </Label>
                  <select
                    id={`agent-model-${mode}`}
                    className="navai-panel-select"
                    value={agentDraft.agentModel}
                    onChange={(event) =>
                      setAgentDraft((current) => ({
                        ...current,
                        agentModel: event.target.value,
                      }))
                    }
                  >
                    <option value=""></option>
                    {agentModelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="navai-panel-field">
                  <Label htmlFor={`agent-voice-${mode}`}>
                    {normalize(
                      messages.panelPage.experienceAgentVoiceFieldLabel,
                    )}
                  </Label>
                  <select
                    id={`agent-voice-${mode}`}
                    className="navai-panel-select"
                    value={agentDraft.agentVoice}
                    onChange={(event) =>
                      setAgentDraft((current) => ({
                        ...current,
                        agentVoice: event.target.value,
                      }))
                    }
                  >
                    <option value=""></option>
                    {agentVoiceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="navai-panel-field">
                  <Label htmlFor={`agent-language-${mode}`}>
                    {normalize(
                      messages.panelPage.experienceAgentLanguageFieldLabel,
                    )}
                  </Label>
                  <select
                    id={`agent-language-${mode}`}
                    className="navai-panel-select"
                    value={agentDraft.agentLanguage}
                    onChange={(event) =>
                      setAgentDraft((current) => ({
                        ...current,
                        agentLanguage: event.target.value,
                      }))
                    }
                  >
                    <option value=""></option>
                    {agentLanguageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {agentError ? (
                <p className="navai-panel-error">{agentError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="lg"
                onClick={() =>
                  void saveAgent()
                    .then((agent) => {
                      setAgents((current) => {
                        const index = current.findIndex(
                          (currentItem) => currentItem.id === agent.id,
                        );
                        if (index < 0) return [agent, ...current];
                        const next = [...current];
                        next.splice(index, 1, agent);
                        return next;
                      });
                      setSelectedAgentId(agent.id);
                      setAgentError("");
                      setIsAgentDialogOpen(false);
                    })
                    .catch((saveError: unknown) =>
                      setAgentError(
                        saveError instanceof Error
                          ? saveError.message
                          : messages.panelPage.saveErrorMessage,
                      ),
                    )
                }
                disabled={!canEditTableData}
              >
                <span>{normalize(messages.panelPage.saveButtonLabel)}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isQuestionDialogOpen}
          onOpenChange={setIsQuestionDialogOpen}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {normalize(messages.panelPage.createQuestionButtonLabel)}
              </DialogTitle>
            </DialogHeader>
            <div className="navai-panel-tab-panel">
              <div className="navai-panel-field">
                <Label htmlFor={`question-text-${mode}`}>
                  {normalize(messages.panelPage.evaluationQuestionFieldLabel)}
                </Label>
                <Textarea
                  id={`question-text-${mode}`}
                  value={questionDraft.question}
                  onChange={(event) =>
                    setQuestionDraft((current) => ({
                      ...current,
                      question: event.target.value,
                    }))
                  }
                  className="min-h-[7rem]"
                />
              </div>
              {isEvaluations ? (
                <div className="navai-panel-field">
                  <Label htmlFor={`question-answer-${mode}`}>
                    {normalize(
                      messages.panelPage.evaluationExpectedAnswerFieldLabel,
                    )}
                  </Label>
                  <Textarea
                    id={`question-answer-${mode}`}
                    value={questionDraft.expectedAnswer}
                    onChange={(event) =>
                      setQuestionDraft((current) => ({
                        ...current,
                        expectedAnswer: event.target.value,
                      }))
                    }
                    className="min-h-[7rem]"
                  />
                </div>
              ) : null}
              <div className="navai-panel-field">
                <label className="navai-panel-checkbox-field">
                  <input
                    type="checkbox"
                    checked={questionDraft.allowAiGrading}
                    onChange={(event) =>
                      setQuestionDraft((current) => ({
                        ...current,
                        allowAiGrading: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    {normalize(
                      messages.panelPage.evaluationAiGradingFieldLabel,
                    )}
                  </span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  if (!questionDraft.question.trim()) return;
                  setDraft((current) => ({
                    ...current,
                    questions: (() => {
                      const index = current.questions.findIndex(
                        (item) => item.id === questionDraft.id,
                      );
                      const nextQuestion = {
                        ...questionDraft,
                        question: questionDraft.question.trim(),
                        expectedAnswer: isEvaluations
                          ? questionDraft.expectedAnswer.trim()
                          : "",
                        allowAiGrading: questionDraft.allowAiGrading,
                      };
                      if (index < 0)
                        return [...current.questions, nextQuestion];
                      const next = [...current.questions];
                      next.splice(index, 1, nextQuestion);
                      return next;
                    })(),
                  }));
                  setIsQuestionDialogOpen(false);
                }}
                disabled={!canEditTableData}
              >
                <span>{normalize(messages.panelPage.saveButtonLabel)}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <StatisticsChartsDrawer
          statistics={activeStatistics}
          buttonLabel={statisticsButtonLabel}
          emptyChartMessage={statisticsChartEmptyMessage}
          onClose={() => setActiveStatistics(null)}
        />
      </article>
    </PanelModuleShellContent>
  );
}
