"use client"

import { useMemo, useState, useEffect } from "react"
import React from "react"
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
  A2UIChartScatterNode,
  A2UIChartHeatmapNode,
  A2UIChartHistogramNode,
  A2UIChartGaugeNode,
  A2UIChartTreemapNode,
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

// ============================================================================
// Scatter Chart
// ============================================================================

interface ScatterDataPoint {
  x: number
  y: number
  id: string
  title?: string
}

export function A2UIChartScatter({ node }: A2UIComponentProps<A2UIChartScatterNode>) {
  const themeColors = useChartTheme()
  const chartColors = useChartColors(themeColors)

  const data = node.data as ScatterDataPoint[]
  const height = node.height ?? 300
  const pointSize = node.pointSize ?? 8
  const padding = { top: 20, right: 20, bottom: 60, left: 60 }
  const width = 600

  const xValues = data.map((d) => d.x)
  const yValues = data.map((d) => d.y)
  const xMin = Math.min(...xValues, 0)
  const xMax = Math.max(...xValues, 1)
  const yMin = Math.min(...yValues, 0)
  const yMax = Math.max(...yValues, 1)

  const scaleX = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * (width - padding.left - padding.right)
  const scaleY = (val: number) => height - padding.bottom - ((val - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom)

  const [hoveredPoint, setHoveredPoint] = useState<ScatterDataPoint | null>(null)

  return (
    <ChartContainer title={node.title} height={height}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[...Array(5).keys()].map((_, i) => {
          const y = padding.top + (i * (height - padding.top - padding.bottom) / 4)
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={themeColors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </g>
          )
        })}

        {/* X axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={themeColors.foreground}
          strokeWidth={1}
        />

        {/* Y axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={themeColors.foreground}
          strokeWidth={1}
        />

        {/* Data points */}
        {data.map((point, i) => (
          <circle
            key={point.id}
            cx={scaleX(point.x)}
            cy={scaleY(point.y)}
            r={hoveredPoint?.id === point.id ? pointSize * 1.5 : pointSize}
            fill={chartColors[i % chartColors.length]}
            opacity={0.8}
            onMouseEnter={() => setHoveredPoint(point)}
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ cursor: "pointer", transition: "all 0.2s" }}
          >
            {hoveredPoint?.id === point.id && (
              <title>{point.title || `Point ${point.id}`}\nX: {point.x.toFixed(3)}\nY: {point.y.toFixed(3)}</title>
            )}
          </circle>
        ))}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill={themeColors.mutedForeground}
          fontSize={12}
        >
          {node.xAxisLabel}
        </text>
        <text
          x={10}
          y={height / 2}
          textAnchor="middle"
          fill={themeColors.mutedForeground}
          fontSize={12}
          transform={`rotate(-90, 10, ${height / 2})`}
        >
          {node.yAxisLabel}
        </text>
      </svg>
    </ChartContainer>
  )
}

// ============================================================================
// Heatmap
// ============================================================================

interface HeatmapDataPoint {
  x: string
  y: string
  value: number
}

export function A2UIChartHeatmap({ node }: A2UIComponentProps<A2UIChartHeatmapNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as HeatmapDataPoint[]
  const height = node.height ?? 300

  // Calculate min/max for color scale
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const minValue = Math.min(...data.map((d) => d.value), 0)

  // Create cells for heatmap
  const cells = useMemo(() => {
    const uniqueX = [...new Set(data.map((d) => d.x))]
    const uniqueY = [...new Set(data.map((d) => d.y))]
    return data.map((d) => ({
      ...d,
      opacity: (d.value - minValue) / (maxValue - minValue || 1),
    }))
  }, [data, minValue, maxValue])

  const uniqueX = [...new Set(data.map((d) => d.x))]
  const uniqueY = [...new Set(data.map((d) => d.y))]

  return (
    <ChartContainer title={node.title} height={height}>
      <div className="w-full" style={{ height }}>
        <div className="grid gap-0.5" style={{
          gridTemplateColumns: `auto repeat(${uniqueX.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${uniqueY.length}, 1fr)`,
        }}>
          {/* Header row - X axis labels */}
          <div />
          {uniqueX.map((x) => (
            <div key={x} className="text-xs text-muted-foreground text-center p-1">
              {x}
            </div>
          ))}
          {/* Data rows */}
          {uniqueY.map((y) => (
            <React.Fragment key={y}>
              <div className="text-xs text-muted-foreground p-1 text-right">
                {y}
              </div>
              {uniqueX.map((x) => {
                const cell = cells.find((c) => c.x === x && c.y === y)
                return (
                  <div
                    key={`${x}-${y}`}
                    className="rounded-sm flex items-center justify-center"
                    style={{
                      backgroundColor: cell
                        ? `${chartColors[0]}${Math.round(cell.opacity * 255).toString(16).padStart(2, '0')}`
                        : 'transparent',
                      height: `${height / uniqueY.length}px`,
                      minHeight: '32px',
                    }}
                    title={`${x} × ${y}: ${cell?.value || 0}`}
                  >
                    {cell && (
                      <span className="text-xs font-medium" style={{
                        color: cell.opacity > 0.5 ? 'white' : 'inherit',
                      }}>
                        {cell.value}
                      </span>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-center">
        {node.xAxisLabel} × {node.yAxisLabel}
      </div>
    </ChartContainer>
  )
}

interface HistogramBin extends BarDatum {
  range: string
}

export function A2UIChartHistogram({ node }: A2UIComponentProps<A2UIChartHistogramNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const data = node.data as HistogramBin[]
  const height = node.height ?? 250
  const color = node.color || chartColors[0]

  return (
    <ChartContainer title={node.title} height={height}>
      <ResponsiveBar
        data={data}
        keys={["count"]}
        indexBy="range"
        margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        padding={0.2}
        layout="vertical"
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={[color]}
        borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: node.xAxisLabel,
          legendOffset: 40,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: node.yAxisLabel,
          legendOffset: -50,
          legendPosition: "middle",
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
// Gauge/Dial Chart
// ============================================================================

export function A2UIChartGauge({ node }: A2UIComponentProps<A2UIChartGaugeNode>) {
  const themeColors = useChartTheme()
  const nivoTheme = useNivoTheme(themeColors)
  const chartColors = useChartColors(themeColors)

  const value = node.value ?? 0
  const min = node.min ?? 0
  const max = node.max ?? 100
  const height = node.height ?? 200

  // Determine color based on thresholds or default
  const getColor = (val: number) => {
    if (node.thresholds) {
      for (const threshold of node.thresholds) {
        if (val <= threshold.value) return threshold.color
      }
    }
    // Default color based on value
    const percent = (val - min) / (max - min)
    if (percent < 0.33) return chartColors[2] // Red-ish for low
    if (percent < 0.66) return chartColors[1] // Yellow-ish for medium
    return chartColors[0] // Green-ish for high
  }

  const currentColor = getColor(value)

  return (
    <ChartContainer title={node.title} height={height}>
      <div className="flex flex-col items-center justify-center" style={{ height }}>
        <div className="relative" style={{ width: Math.min(height, 200), height: height * 0.8 }}>
          {/* Background arc */}
          <svg viewBox="0 0 200 120" width="100%" height="100%">
            {/* Background */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={themeColors.muted}
              strokeWidth={20}
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={currentColor}
              strokeWidth={20}
              strokeLinecap="round"
              strokeDasharray={`${((value - min) / (max - min)) * 404} 404`}
            />
            {/* Needle */}
            <g transform={`rotate(${((value - min) / (max - min)) * 180 - 90}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="20"
                stroke={themeColors.foreground}
                strokeWidth={3}
              />
              <circle cx="100" cy="100" r="6" fill={themeColors.foreground} />
            </g>
          </svg>
          {/* Value display */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
            <div className="text-3xl font-bold" style={{ color: currentColor }}>
              {value.toFixed(1)}
              {node.unit && <span className="text-lg ml-1 text-muted-foreground">{node.unit}</span>}
            </div>
            {node.label && (
              <div className="text-sm text-muted-foreground mt-1">
                {node.label}
              </div>
            )}
          </div>
        </div>
        {/* Threshold labels */}
        {node.thresholds && (
          <div className="flex gap-4 mt-2 text-xs">
            {node.thresholds.map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartContainer>
  )
}

// ============================================================================
// Treemap
// ============================================================================

interface TreemapItem {
  id: string
  label: string
  value: number
  color?: string
}

export function A2UIChartTreemap({ node }: A2UIComponentProps<A2UIChartTreemapNode>) {
  const themeColors = useChartTheme()
  const chartColors = useChartColors(themeColors)

  const data = node.data as TreemapItem[]
  const height = node.height ?? 300
  const colors = (node.colors as string[]) ?? chartColors

  // Calculate dimensions for squarified treemap algorithm
  const layout = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    const result: Array<{ item: TreemapItem; x: number; y: number; width: number; height: number; index: number }> = []

    let remaining = [...data]
    let x = 0
    let y = 0
    let rowWidth = 0
    let rowHeight = 0
    let index = 0

    while (remaining.length > 0) {
      // Find remaining item with best aspect ratio
      let bestIdx = 0
      let bestRatio = Infinity

      for (let i = 0; i < Math.min(remaining.length, 5); i++) {
        const testWidth = rowWidth + (remaining[i].value / total)
        const testHeight = testWidth > 1 ? testWidth : remaining[i].value / total
        const ratio = Math.max(testWidth / testHeight, testHeight / testWidth)
        if (ratio < bestRatio) {
          bestRatio = ratio
          bestIdx = i
        }
      }

      const item = remaining[bestIdx]
      const itemWidth = item.value / total
      const itemHeight = itemWidth

      // Start new row if it would exceed width
      if (x + itemWidth > 1) {
        x = 0
        y += rowHeight
        rowHeight = 0
      }

      result.push({
        item,
        x,
        y,
        width: itemWidth,
        height: itemHeight,
        index,
      })

      x += itemWidth
      rowWidth = x
      rowHeight = Math.max(rowHeight, itemHeight)

      remaining.splice(bestIdx, 1)
      index++
    }

    return result
  }, [data])

  return (
    <ChartContainer title={node.title} height={height}>
      <div className="w-full relative" style={{ height, background: themeColors.popover, borderRadius: "8px", overflow: "hidden" }}>
        {layout.map((rect) => (
          <div
            key={rect.item.id}
            className="absolute border border-border flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              backgroundColor: rect.item.color || colors[rect.index % colors.length],
              borderRadius: "4px",
              padding: "4px",
              minHeight: "60px",
            }}
            title={`${rect.item.label}: ${rect.item.value}`}
          >
            <div
              className="text-center font-medium"
              style={{
                color: themeColors.popoverForeground,
                fontSize: Math.min(14, rect.width * 50),
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {rect.item.label}
            </div>
            <div
              className="text-xs"
              style={{
                color: `${themeColors.popoverForeground}99`,
              }}
            >
              {rect.item.value.toLocaleString()}
            </div>
          </div>
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
  "chart-scatter": A2UIChartScatter,
  "chart-heatmap": A2UIChartHeatmap,
  "chart-histogram": A2UIChartHistogram,
  "chart-gauge": A2UIChartGauge,
  "chart-treemap": A2UIChartTreemap,
}
