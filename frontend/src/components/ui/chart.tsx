"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used inside a ChartContainer.");
  }

  return context;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(function ChartContainer({ id, className, config, children, ...props }, ref) {
  const uniqueId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? uniqueId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn("navai-chart-root", className)}
        style={
          Object.fromEntries(
            Object.entries(config).flatMap(([key, value]) =>
              value.color ? [[`--color-${key}`, value.color]] : [],
            ),
          ) as React.CSSProperties
        }
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  className,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string | number;
    value?: string | number;
    payload?: Record<string, unknown>;
  }>;
  className?: string;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={cn("navai-chart-tooltip", className)}>
      {payload.map((item) => {
        const dataKey = String(item.dataKey ?? "");
        const itemConfig = config[dataKey];
        const payloadLabel =
          item?.payload && typeof item.payload === "object" && "metric" in item.payload
            ? String((item.payload as { metric?: unknown }).metric ?? "")
            : "";
        const label = payloadLabel || item.name || itemConfig?.label || dataKey;
        const color = item.color ?? itemConfig?.color ?? "currentColor";

        return (
          <div key={dataKey} className="navai-chart-tooltip-row">
            <span className="navai-chart-tooltip-label">
              <span className="navai-chart-tooltip-swatch" style={{ backgroundColor: color }} />
              {label}
            </span>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
  className,
}: React.ComponentProps<"div"> & {
  payload?: ReadonlyArray<{
    dataKey?: string | number;
    color?: string;
  }>;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn("navai-chart-legend", className)}>
      {payload.map((item) => {
        const dataKey = String(item.dataKey ?? "");
        const itemConfig = config[dataKey];
        const label = itemConfig?.label ?? dataKey;
        const color = item.color ?? itemConfig?.color ?? "currentColor";

        return (
          <div key={dataKey} className="navai-chart-legend-item">
            <span className="navai-chart-tooltip-swatch" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
