"use client"

import { useMemo, useState, useEffect } from "react"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveRadar } from "@nivo/radar"
import { ResponsiveLine } from "@nivo/line"
import { ResponsiveBar, type BarDatum } from "@nivo/bar"
import { ResponsiveRadialBar } from "@nivo/radial-bar"
import type {
  A2UIChartPieNode,
  A2UIChartRadarNode,
  A2UIChartLineNode,
  A2UIChartBarNode,
  A2UIChartRadialBarNode,
  A2UIChartWordCloudNode,
} from "@/lib/a2ui"
import type { A2UIComponentProps } from "@/lib/a2ui/registry"

// ============================================================================
// Theme Hook - Resolve CSS Variables at Runtime
// ============================================================================

interface ChartThemeColors {
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  foreground: string
  mutedForeground: string
  muted: string
  border: string
  popover: string
  popoverForeground: string
}

// Fallback colors (used during SSR)
const FALLBACK_COLORS: ChartThemeColors = {
  chart1: "#6366f1",
  chart2: "#22c55e",
  chart3: "#f59e0b",
  chart4: "#ec4899",
  chart5: "#06b6d4",
  foreground: "#1e1b4b",
  mutedForeground: "#6b7280",
  muted: "#f1f0fb",
  border: "#e0e0e0",
  popover: "#ffffff",
  popoverForeground: "#1e1b4b",
}

/**
 * Resolve CSS variable to computed RGB color
 * Uses a temporary element to let the browser convert oklch → rgb
 */
function resolveThemeColor(cssVar: string): string {
  if (typeof window === "undefined") return ""

  const el = document.createElement("div")
  el.style.color = `var(${cssVar})`
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)

  return computed
}

function getThemeColors(): ChartThemeColors {
  return {
    chart1: resolveThemeColor("--chart-1"),
    chart2: resolveThemeColor("--chart-2"),
    chart3: resolveThemeColor("--chart-3"),
    chart4: resolveThemeColor("--chart-4"),
    chart5: resolveThemeColor("--chart-5"),
    foreground: resolveThemeColor("--foreground"),
    mutedForeground: resolveThemeColor("--muted-foreground"),
    muted: resolveThemeColor("--muted"),
    border: resolveThemeColor("--border"),
    popover: resolveThemeColor("--popover"),
    popoverForeground: resolveThemeColor("--popover-foreground"),
  }
}

function useChartTheme(): ChartThemeColors {
  const [colors, setColors] = useState<ChartThemeColors>(FALLBACK_COLORS)

  useEffect(() => {
    const updateColors = () => {
      // Read theme colors from CSS variables (browser converts oklch → rgb)
      setColors(getThemeColors())
    }

    updateColors()

    // Listen for theme changes (class changes on html element)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          updateColors()
          break
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => observer.disconnect()
  }, [])

  return colors
}

function useNivoTheme(colors: ChartThemeColors) {
  return useMemo(() => ({
    background: "transparent",
    text: {
      fontSize: 12,
      fill: colors.foreground,
    },
    axis: {
      ticks: {
        text: {
          fontSize: 11,
          fill: colors.mutedForeground,
        },
      },
      legend: {
        text: {
          fontSize: 12,
          fill: colors.foreground,
        },
      },
    },
    grid: {
      line: {
        stroke: colors.border,
        strokeWidth: 1,
      },
    },
    legends: {
      text: {
        fontSize: 11,
        fill: colors.foreground,
      },
    },
    tooltip: {
      container: {
        background: colors.popover,
        color: colors.popoverForeground,
        fontSize: 12,
        borderRadius: 6,
        boxShadow: "var(--shadow-md)",
      },
    },
  }), [colors])
}

function useChartColors(colors: ChartThemeColors): string[] {
  return useMemo(() => [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
  ], [colors])
}

// ============================================================================
// Chart Container Wrapper
// ============================================================================

interface ChartContainerProps {
  title?: string
  height: number
  children: React.ReactNode
}

function ChartContainer({ title, height, children }: ChartContainerProps) {
  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
      )}
      <div style={{ height }}>{children}</div>
    </div>
  )
}

// ============================================================================
// Pie / Donut Chart
// ============================================================================

interface PieDataItem {
  id: string
  label?: string
  value: number
  color?: string
}

export function A2UIChartPie({ node }: A2UIComponentProps<A2UIChartPieNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as PieDataItem[]
  const height = node.height ?? 300
  const colors = (node.colors as string[]) ?? chartColors

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsivePie
        data={data}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
        innerRadius={node.innerRadius ?? 0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        colors={colors}
        borderWidth={1}
        borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={themeColors.foreground}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
        theme={nivoTheme}
        motionConfig="gentle"
      />
    </ChartContainer>
  )
}

// ============================================================================
// Radar Chart
// ============================================================================

export function A2UIChartRadar({ node }: A2UIComponentProps<A2UIChartRadarNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as Record<string, unknown>[]
  const keys = node.keys as string[]
  const height = node.height ?? 300

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsiveRadar
        data={data}
        keys={keys}
        indexBy={node.indexBy}
        maxValue={node.maxValue ?? "auto"}
        margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={5}
        gridShape="circular"
        gridLabelOffset={16}
        enableDots={true}
        dotSize={8}
        dotColor={{ theme: "background" }}
        dotBorderWidth={2}
        dotBorderColor={{ from: "color" }}
        colors={chartColors}
        fillOpacity={0.25}
        blendMode="multiply"
        theme={nivoTheme}
        motionConfig="gentle"
      />
    </ChartContainer>
  )
}

// ============================================================================
// Line / Area Chart
// ============================================================================

interface LineSeriesData {
  id: string
  color?: string
  data: Array<{ x: string | number; y: number }>
}

export function A2UIChartLine({ node }: A2UIComponentProps<A2UIChartLineNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as LineSeriesData[]
  const height = node.height ?? 300

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsiveLine
        data={data}
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
        curve={node.curve ?? "catmullRom"}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: node.xLegend,
          legendOffset: 40,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: node.yLegend,
          legendOffset: -50,
          legendPosition: "middle",
        }}
        colors={chartColors}
        pointSize={node.enablePoints !== false ? 8 : 0}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointLabelYOffset={-12}
        enableArea={node.enableArea ?? false}
        areaOpacity={0.15}
        useMesh={true}
        theme={nivoTheme}
        motionConfig="gentle"
        legends={[
          {
            anchor: "top-right",
            direction: "column",
            justify: false,
            translateX: 0,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: "left-to-right",
            itemWidth: 80,
            itemHeight: 20,
            symbolSize: 12,
            symbolShape: "circle",
          },
        ]}
      />
    </ChartContainer>
  )
}

// ============================================================================
// Bar Chart
// ============================================================================

export function A2UIChartBar({ node }: A2UIComponentProps<A2UIChartBarNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as BarDatum[]
  const keys = node.keys as string[]
  const height = node.height ?? 300
  const isHorizontal = node.layout === "horizontal"

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={node.indexBy}
        margin={{
          top: 20,
          right: 20,
          bottom: isHorizontal ? 40 : 60,
          left: isHorizontal ? 120 : 60,
        }}
        padding={0.3}
        layout={isHorizontal ? "horizontal" : "vertical"}
        groupMode={node.groupMode ?? "grouped"}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={chartColors}
        borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: isHorizontal ? 0 : -45,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        theme={nivoTheme}
        motionConfig="gentle"
      />
    </ChartContainer>
  )
}

// ============================================================================
// Radial Bar / Gauge Chart
// ============================================================================

interface RadialBarDataItem {
  id: string
  data: Array<{ x: string; y: number }>
}

export function A2UIChartRadialBar({ node }: A2UIComponentProps<A2UIChartRadialBarNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as RadialBarDataItem[]
  const height = node.height ?? 200

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsiveRadialBar
        data={data}
        maxValue={node.maxValue ?? 100}
        startAngle={node.startAngle ?? 0}
        endAngle={node.endAngle ?? 360}
        innerRadius={0.3}
        padding={0.4}
        cornerRadius={4}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        colors={chartColors}
        tracksColor={themeColors.muted}
        enableRadialGrid={false}
        enableCircularGrid={false}
        radialAxisStart={null}
        circularAxisOuter={null}
        theme={nivoTheme}
        motionConfig="gentle"
      />
    </ChartContainer>
  )
}

// ============================================================================
// Word Cloud (Custom Implementation)
// ============================================================================

interface WordItem {
  text: string
  value: number
}

export function A2UIChartWordCloud({ node }: A2UIComponentProps<A2UIChartWordCloudNode>) {
  const themeColors = useChartTheme()
  const chartColors = useChartColors(themeColors)

  const words = node.words as WordItem[]
  const height = node.height ?? 200
  const colors = (node.colors as string[]) ?? chartColors

  // Sort words by value and get max/min for scaling
  const sortedWords = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.value - a.value)
    const maxValue = Math.max(...sorted.map((w) => w.value))
    const minValue = Math.min(...sorted.map((w) => w.value))
    const range = maxValue - minValue || 1

    return sorted.map((word, index) => ({
      ...word,
      // Scale font size between 12px and 32px
      fontSize: 12 + ((word.value - minValue) / range) * 20,
      color: colors[index % colors.length],
    }))
  }, [words, colors])

  return (
    <ChartContainer title={node.title} height={height}>
      <div
        className="flex flex-wrap items-center justify-center gap-2 p-4"
        style={{ height: "100%" }}
      >
        {sortedWords.slice(0, 30).map((word, index) => (
          <span
            key={`${word.text}-${index}`}
            className="inline-block transition-transform hover:scale-110 cursor-default"
            style={{
              fontSize: word.fontSize,
              color: word.color,
              fontWeight: word.value > sortedWords[0].value * 0.7 ? 600 : 400,
            }}
            title={`${word.text}: ${word.value}`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </ChartContainer>
  )
}

export const ChartComponents = {
  "chart-pie": A2UIChartPie,
  "chart-radar": A2UIChartRadar,
  "chart-line": A2UIChartLine,
  "chart-bar": A2UIChartBar,
  "chart-radial-bar": A2UIChartRadialBar,
  "chart-word-cloud": A2UIChartWordCloud,
}
