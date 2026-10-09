import { useLayoutEffect, useMemo } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

import { useChartTheme } from '../../chat-widget/ChartThemeContext'

/**
 * 图表类型缩略图：用 ECharts SSR 按类型实时渲染迷你真图表 SVG 字符串（轴/数据点/数值均真实渲染，观感对齐大屏缩略图）。
 * 配色/文字色取自图表主题 Context，透明底、背景由外层容器加，深浅主题自适应。
 * 词云无 ECharts 核心实现，降级为 SVG 文字造型。
 */

const W = 220
const H = 110

// SVG 为矢量可无损缩放：固定绘制尺寸，显示宽度交给容器
const STYLE_ID = 'chart-type-thumb-svg-style'
const STYLE_CSS = `.chart-type-thumb-svg > svg { display: block; width: 100%; height: auto; }`

function useInjectThumbStyle() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = STYLE_CSS
    document.head.appendChild(el)
  }, [])
}

/** 示例序列（仅用于缩略图造型，非真实数据） */
const CATS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']
const CATS6 = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']
const S1 = [20, 45, 30, 60, 42, 70, 52, 64]
const S2 = [12, 28, 20, 38, 26, 44, 34, 40]
const BARS = [40, 65, 30, 75, 50, 60]
const BARS2 = [25, 40, 22, 55, 35, 42]
const PIE = [
  { name: 'A', value: 40 },
  { name: 'B', value: 30 },
  { name: 'C', value: 20 },
  { name: 'D', value: 10 },
]

interface ThumbCtx {
  palette: string[]
  text: string
}

/** hex 色 → rgba，用于轴/刻度文字等低透明度元素 */
function rgba(hex: string, alpha: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim())
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

/** 按列百分比归一化（百分比堆叠面积/柱状） */
function toPercents(a: number[], b: number[]): [number[], number[]] {
  const totals = a.map((v, i) => v + b[i])
  return [a.map((v, i) => Math.round((v / totals[i]) * 100)), b.map((v, i) => Math.round((v / totals[i]) * 100))]
}

type XAxisOpt = NonNullable<EChartsOption['xAxis']>
type YAxisOpt = NonNullable<EChartsOption['yAxis']>

const axisSkin = (ctx: ThumbCtx) => ({
  axisLabel: { fontSize: 8, color: rgba(ctx.text, 0.5) },
  axisLine: { lineStyle: { color: rgba(ctx.text, 0.25) } },
  axisTick: { show: false },
})

const hiddenAxis = () => ({
  axisLabel: { show: false },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { show: false },
})

function categoryAxisX(ctx: ThumbCtx, data: string[], boundaryGap: boolean): XAxisOpt {
  return { type: 'category', data, boundaryGap, ...axisSkin(ctx) }
}

function categoryAxisY(ctx: ThumbCtx, data: string[]): YAxisOpt {
  return { type: 'category', data, ...axisSkin(ctx) }
}

function valueAxisX(): XAxisOpt {
  return { type: 'value', ...hiddenAxis() }
}

function valueAxisY(max?: number): YAxisOpt {
  return { type: 'value', max, ...hiddenAxis() }
}

const GRID = { left: 4, right: 8, top: 12, bottom: 2, containLabel: true }

const pointLabel = (ctx: ThumbCtx) => ({ show: true, position: 'top' as const, fontSize: 8, color: rgba(ctx.text, 0.55) })

function buildOption(value: string, ctx: ThumbCtx): EChartsOption {
  const base: EChartsOption = { animation: false, color: ctx.palette }
  switch (value) {
    case 'response_area_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS, false),
        yAxis: valueAxisY(),
        series: [
          {
            type: 'line',
            data: S1,
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { width: 1.5 },
            areaStyle: { opacity: 0.35 },
            label: pointLabel(ctx),
          },
        ],
      }
    case 'response_stacked_area_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS, false),
        yAxis: valueAxisY(),
        series: [
          { type: 'line', data: S1, stack: 'total', smooth: true, symbol: 'circle', symbolSize: 3, areaStyle: { opacity: 0.55 } },
          { type: 'line', data: S2, stack: 'total', smooth: true, symbol: 'circle', symbolSize: 3, areaStyle: { opacity: 0.55 } },
        ],
      }
    case 'response_percent_area_chart': {
      const [p1, p2] = toPercents(S1, S2)
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS, false),
        yAxis: valueAxisY(100),
        series: [
          { type: 'line', data: p1, stack: 'total', smooth: true, symbol: 'circle', symbolSize: 3, areaStyle: { opacity: 0.55 } },
          { type: 'line', data: p2, stack: 'total', smooth: true, symbol: 'circle', symbolSize: 3, areaStyle: { opacity: 0.55 } },
        ],
      }
    }
    case 'response_pie_chart':
      return {
        ...base,
        series: [{ type: 'pie', radius: '72%', center: ['50%', '50%'], data: PIE, label: { show: false }, labelLine: { show: false } }],
      }
    case 'response_donut_chart':
      return {
        ...base,
        series: [{ type: 'pie', radius: ['42%', '72%'], center: ['50%', '50%'], data: PIE, label: { show: false }, labelLine: { show: false } }],
      }
    case 'response_rose_chart':
      return {
        ...base,
        series: [
          { type: 'pie', roseType: 'radius', radius: ['12%', '72%'], center: ['50%', '50%'], data: PIE, label: { show: false }, labelLine: { show: false } },
        ],
      }
    case 'response_bar_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS6, true),
        yAxis: valueAxisY(),
        series: [{ type: 'bar', data: BARS, barWidth: '55%', itemStyle: { borderRadius: [2, 2, 0, 0] }, label: pointLabel(ctx) }],
      }
    case 'response_many_bar_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS6, true),
        yAxis: valueAxisY(),
        series: [
          { type: 'bar', data: BARS, barWidth: '30%', itemStyle: { borderRadius: [2, 2, 0, 0] } },
          { type: 'bar', data: BARS2, barWidth: '30%', itemStyle: { borderRadius: [2, 2, 0, 0] } },
        ],
      }
    case 'response_percent_bar_chart': {
      const [p1, p2] = toPercents(BARS, BARS2)
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS6, true),
        yAxis: valueAxisY(100),
        series: [
          { type: 'bar', data: p1, stack: 'total', barWidth: '55%' },
          { type: 'bar', data: p2, stack: 'total', barWidth: '55%' },
        ],
      }
    }
    case 'response_horizontal_bar_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: valueAxisX(),
        yAxis: categoryAxisY(ctx, ['A', 'B', 'C', 'D', 'E']),
        series: [{ type: 'bar', data: [40, 65, 30, 75, 50], barWidth: 7, colorBy: 'data', itemStyle: { borderRadius: [0, 3, 3, 0] } }],
      }
    case 'response_radar_chart':
      return {
        ...base,
        radar: {
          indicator: [{ name: '', max: 100 }, { name: '', max: 100 }, { name: '', max: 100 }, { name: '', max: 100 }, { name: '', max: 100 }],
          radius: '68%',
          center: ['50%', '52%'],
          axisName: { show: false },
          splitLine: { lineStyle: { color: rgba(ctx.text, 0.2) } },
          axisLine: { lineStyle: { color: rgba(ctx.text, 0.2) } },
          splitArea: { show: false },
        },
        series: [
          {
            type: 'radar',
            data: [{ value: [90, 60, 80, 50, 75], areaStyle: { opacity: 0.4 }, lineStyle: { width: 1.5 }, symbol: 'circle', symbolSize: 3 }],
          },
        ],
      }
    case 'response_funnel_chart':
      return {
        ...base,
        series: [
          {
            type: 'funnel',
            width: '76%',
            top: 8,
            bottom: 8,
            gap: 3,
            label: { show: false },
            labelLine: { show: false },
            data: [{ value: 100 }, { value: 62 }, { value: 34 }],
          },
        ],
      }
    case 'response_gauge_chart':
      return {
        ...base,
        series: [
          {
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            center: ['50%', '80%'],
            radius: '92%',
            progress: { show: true, width: 7 },
            axisLine: { lineStyle: { width: 7, color: [[1, rgba(ctx.text, 0.18)]] } },
            pointer: { show: false },
            anchor: { show: false },
            axisLabel: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            detail: { show: false },
            title: { show: false },
            data: [{ value: 66 }],
          },
        ],
      }
    case 'response_radial_bar_chart':
      return {
        ...base,
        angleAxis: { max: 100, show: false },
        radiusAxis: { type: 'category', data: ['A', 'B', 'C'], show: false },
        polar: { radius: ['24%', '92%'], center: ['50%', '54%'] },
        series: [{ type: 'bar', coordinateSystem: 'polar', data: [80, 60, 40], barWidth: '55%', roundCap: true, colorBy: 'data' }],
      }
    case 'response_scatter_chart':
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS, true),
        yAxis: valueAxisY(),
        series: [
          { type: 'scatter', data: S1, symbolSize: 5 },
          { type: 'scatter', data: S2, symbolSize: 5 },
        ],
      }
    case 'response_line_chart':
    default:
      return {
        ...base,
        grid: GRID,
        xAxis: categoryAxisX(ctx, CATS, false),
        yAxis: valueAxisY(),
        series: [
          { type: 'line', data: S1, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2 } },
          { type: 'line', data: S2, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, type: 'dashed' } },
        ],
      }
  }
}

/** 词云降级造型：ECharts 核心无词云图 */
function wordcloudSvg(palette: string[]): string {
  const c = (i: number) => palette[i % palette.length]
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<text x="36" y="56" font-size="30" font-weight="700" fill="${c(0)}">数据</text>
<text x="110" y="44" font-size="20" fill="${c(1)}">趋势</text>
<text x="160" y="62" font-size="24" font-weight="600" fill="${c(2)}">占比</text>
<text x="56" y="88" font-size="18" fill="${c(3)}">增长</text>
<text x="122" y="92" font-size="21" fill="${c(4)}">分析</text>
</svg>`
}

function renderThumbSvg(value: string, ctx: ThumbCtx): string {
  if (value === 'response_wordcloud_chart') return wordcloudSvg(ctx.palette)
  // SSR 模式无需 DOM：同步出 SVG 字符串后立即销毁，避免缩略图持有真实实例
  const chart = echarts.init(null, undefined, { renderer: 'svg', ssr: true, width: W, height: H })
  chart.setOption(buildOption(value, ctx))
  const svg = chart.renderToSVGString()
  chart.dispose()
  return svg
}

export interface ChartTypeThumbProps {
  /** 图表类型 value（与 chartTypeCatalog 一致） */
  value: string
  className?: string
}

export default function ChartTypeThumb({ value, className }: ChartTypeThumbProps) {
  useInjectThumbStyle()
  const theme = useChartTheme()
  const palette = useMemo(() => theme.color.split(',').map((s) => s.trim()).filter(Boolean), [theme.color])
  const svg = useMemo(() => renderThumbSvg(value, { palette, text: theme.textColor }), [value, palette, theme.textColor])
  return (
    <div
      className={`chart-type-thumb-svg${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={value}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
