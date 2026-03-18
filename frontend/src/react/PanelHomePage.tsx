'use client';

import { Activity, BarChart3, Gauge, Layers3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import Link from "@/platform/link";

import { ChartPanelSkeleton, PanelSidebarCardsSkeleton } from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";
import { getNavaiPanelDashboardSummary } from "@/lib/navai-panel-api";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";

type DashboardMetricCard = {
  id: "domains" | "evaluations" | "responses" | "tickets";
  label: string;
  value: string;
  icon: typeof Layers3;
  total: number;
  color: string;
};

type DashboardSummaryState = {
  domainsCount: number;
  evaluationsCount: number;
  surveyResponsesCount: number;
  openTicketsCount: number;
};

export default function PanelHomePage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelHomePageInner />
    </AppProvidersShell>
  );
}

function PanelHomePageInner() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const [summary, setSummary] = useState<DashboardSummaryState>({
    domainsCount: 0,
    evaluationsCount: 0,
    surveyResponsesCount: 0,
    openTicketsCount: 0,
  });
  const [activeMetricId, setActiveMetricId] = useState<DashboardMetricCard["id"]>("domains");
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setIsLoadingSummary(true);
      const idToken = await user?.getIdToken();
      if (!idToken) {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
        return;
      }

      try {
        const response = await getNavaiPanelDashboardSummary(idToken);
        if (isMounted) {
          setSummary(response.summary);
        }
      } catch {
        if (isMounted) {
          setSummary({
            domainsCount: 0,
            evaluationsCount: 0,
            surveyResponsesCount: 0,
            openTicketsCount: 0,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const metrics: DashboardMetricCard[] = useMemo(
    () => [
      {
        id: "domains",
        label: messages.panelPage.domainCountLabel,
        value: String(summary.domainsCount),
        total: summary.domainsCount,
        icon: Activity,
        color: "#9ca3af",
      },
      {
        id: "evaluations",
        label: messages.panelPage.evaluationsNavLabel,
        value: String(summary.evaluationsCount),
        total: summary.evaluationsCount,
        icon: Gauge,
        color: "#d4d4d8",
      },
      {
        id: "responses",
        label: messages.panelPage.dashboardSurveyResponsesKpiLabel,
        value: String(summary.surveyResponsesCount),
        total: summary.surveyResponsesCount,
        icon: Layers3,
        color: "#a1a1aa",
      },
      {
        id: "tickets",
        label: messages.panelPage.dashboardOpenTicketsKpiLabel,
        value: String(summary.openTicketsCount),
        total: summary.openTicketsCount,
        icon: BarChart3,
        color: "#71717a",
      },
    ],
    [
      messages.panelPage.dashboardOpenTicketsKpiLabel,
      messages.panelPage.dashboardSurveyResponsesKpiLabel,
      messages.panelPage.domainCountLabel,
      messages.panelPage.evaluationsNavLabel,
      summary.domainsCount,
      summary.evaluationsCount,
      summary.openTicketsCount,
      summary.surveyResponsesCount,
    ]
  );

  const activeMetric = metrics.find((metric) => metric.id === activeMetricId) ?? metrics[0] ?? null;

  return (
    <PanelModuleShellContent
      page="home"
      description={messages.panelPage.dashboardDescription}
      rightSidebarExtra={
        isLoadingSummary ? (
          <PanelSidebarCardsSkeleton />
        ) : (
          <PanelHomePageRightSidebar
            metrics={metrics}
            activeMetricId={activeMetric?.id ?? "domains"}
            onSelectMetric={setActiveMetricId}
          />
        )
      }
    >
      <PanelHomePageContent
        metrics={metrics}
        activeMetric={activeMetric}
        isLoadingSummary={isLoadingSummary}
      />
    </PanelModuleShellContent>
  );
}

function buildTrendData(total: number) {
  if (total <= 0) {
    return [
      { step: "1", total: 0 },
      { step: "2", total: 0 },
      { step: "3", total: 0 },
      { step: "4", total: 0 },
    ];
  }

  return [
    { step: "1", total: Math.max(0, Math.round(total * 0.3)) },
    { step: "2", total: Math.max(0, Math.round(total * 0.55)) },
    { step: "3", total: Math.max(0, Math.round(total * 0.8)) },
    { step: "4", total },
  ];
}

function PanelHomePageRightSidebar({
  metrics,
  activeMetricId,
  onSelectMetric,
}: {
  metrics: DashboardMetricCard[];
  activeMetricId: DashboardMetricCard["id"];
  onSelectMetric: (metricId: DashboardMetricCard["id"]) => void;
}) {
  const { messages } = useI18n();
  return (
    <section className="navai-panel-sidebar-section navai-panel-kpi-sidebar">
      <div className="navai-panel-sidebar-copy">
        <h2>{messages.panelPage.dashboardTitle}</h2>
      </div>

      <div className="navai-panel-kpi-sidebar-list">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isActive = metric.id === activeMetricId;
          return (
            <button
              key={metric.id}
              type="button"
              className={`navai-panel-kpi-sidebar-card${isActive ? " is-active" : ""}`}
              onClick={() => onSelectMetric(metric.id)}
            >
              <div className="navai-panel-kpi-sidebar-head">
                <div className="navai-panel-kpi-icon-wrap">
                  <Icon aria-hidden="true" />
                </div>
                <strong>{metric.value}</strong>
              </div>
              <span>{metric.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PanelHomePageContent({
  metrics,
  activeMetric,
  isLoadingSummary,
}: {
  metrics: DashboardMetricCard[];
  activeMetric: DashboardMetricCard | null;
  isLoadingSummary: boolean;
}) {
  const { messages } = useI18n();
  const comparisonData = metrics.map((metric) => ({
    metric: metric.label,
    total: metric.total,
    fill: metric.color,
  }));
  const activeMetricTrend = activeMetric ? buildTrendData(activeMetric.total) : buildTrendData(0);
  const chartConfig = {
    total: {
      label: activeMetric?.label ?? messages.panelPage.dashboardTitle,
      color: activeMetric?.color ?? "#a1a1aa",
    },
  } satisfies ChartConfig;

  return (
    <article className="navai-panel-layout">
      <section className="docs-section-block navai-panel-card navai-panel-dashboard-hero">
        <div className="navai-panel-dashboard-actions">
          <Button asChild size="lg">
            <Link href="/panel/manage">{messages.panelPage.dashboardGoPanelButtonLabel}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/panel/evaluations">{messages.panelPage.dashboardGoEvaluationsButtonLabel}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/panel/surveys">{messages.panelPage.dashboardGoSurveysButtonLabel}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/panel/support">{messages.panelPage.dashboardGoSupportButtonLabel}</Link>
          </Button>
        </div>
      </section>

      {isLoadingSummary ? (
        <section className="docs-section-block navai-panel-card navai-panel-chart-card">
          <div className="navai-panel-chart-grid-panels" aria-hidden="true">
            <ChartPanelSkeleton />
            <ChartPanelSkeleton />
          </div>
        </section>
      ) : activeMetric ? (
        <section className="docs-section-block navai-panel-card navai-panel-chart-card">
          <div className="navai-panel-chart-copy">
            <h2>{activeMetric.label}</h2>
          </div>

          <div className="navai-panel-chart-grid-panels">
            <ChartContainer config={chartConfig} className="navai-panel-chart-shell navai-panel-chart-shell--compact">
              <BarChart data={activeMetricTrend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" className="navai-panel-chart-grid" />
                <XAxis dataKey="step" tickLine={false} axisLine={false} tickMargin={10} className="navai-panel-chart-axis" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={10} className="navai-panel-chart-axis" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[14, 14, 6, 6]} maxBarSize={56}>
                  {activeMetricTrend.map((entry) => (
                    <Cell key={`${activeMetric.id}-${entry.step}`} fill={activeMetric.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <ChartContainer config={chartConfig} className="navai-panel-chart-shell navai-panel-chart-shell--compact">
              <BarChart data={comparisonData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" className="navai-panel-chart-grid" />
                <XAxis
                  type="number"
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
                  width={128}
                  tickFormatter={(value: string) => value.slice(0, 16)}
                  className="navai-panel-chart-axis"
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[0, 14, 14, 0]} maxBarSize={36}>
                  {comparisonData.map((entry) => (
                    <Cell key={entry.metric} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </section>
      ) : null}
    </article>
  );
}
