import { useChartTheme } from '../../chat-widget/ChartThemeContext'

/**
 * 图表类型缩略图：按类型实时绘制 SVG 迷你图，配色/文字色取自图表主题 Context。
 * 替代原静态白底图片：透明背景 + 主题取色，深色/自定义背景下不再出现白块。
 */

const W = 120
const H = 64
const X0 = 8
const X1 = 112
const Y0 = 8
const Y1 = 56

/** 示例序列（仅用于缩略图造型，非真实数据） */
const S1 = [20, 45, 30, 60, 42, 70, 52]
const S2 = [12, 28, 20, 38, 26, 44, 34]
const BARS = [40, 65, 30, 75, 50]
const PIE = [40, 30, 20, 10]

const px = (i: number, n: number) => X0 + (i * (X1 - X0)) / (n - 1)
const py = (v: number, max: number) => Y1 - (v / max) * (Y1 - Y0)

function linePoints(series: number[], max: number): string {
  return series.map((v, i) => `${px(i, series.length)},${py(v, max)}`).join(' ')
}

function areaPath(series: number[], max: number, base?: number[]): string {
  const top = series.map((v, i) => `${px(i, series.length)},${py(base ? base[i] + v : v, max)}`)
  const bottom = series
    .map((_, i) => `${px(i, series.length)},${py(base ? base[i] : 0, max)}`)
    .reverse()
  return `M${top.join(' L')} L${bottom.join(' L')} Z`
}

/** 环形/扇形路径：a0→a1 弧度，r0=0 时为饼图扇区 */
function sectorPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const pt = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  if (r0 <= 0) return `M${cx} ${cy} L${pt(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${pt(r1, a1)} Z`
  return `M${pt(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${pt(r0, a0)} Z`
}

/** 圆弧描边路径（仪表/玉珏） */
function arcStroke(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const pt = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${pt(a0)} A${r} ${r} 0 ${large} 1 ${pt(a1)}`
}

function polygonPoints(values: number[], cx: number, cy: number, r: number): string {
  const n = values.length
  return values
    .map((v, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
      return `${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`
    })
    .join(' ')
}

export interface ChartTypeThumbProps {
  /** 图表类型 value（与 chartTypeCatalog 一致） */
  value: string
  className?: string
}

export default function ChartTypeThumb({ value, className }: ChartTypeThumbProps) {
  const theme = useChartTheme()
  const palette = theme.color.split(',').map((c) => c.trim()).filter(Boolean)
  const c = (i: number) => palette[i % palette.length]
  const axis = theme.textColor

  const body = (() => {
    switch (value) {
      case 'response_line_chart':
        return (
          <>
            <polyline points={linePoints(S1, 80)} fill="none" stroke={c(0)} strokeWidth={2} strokeLinejoin="round" />
            <polyline points={linePoints(S2, 80)} fill="none" stroke={c(1)} strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 3" />
          </>
        )
      case 'response_area_chart':
        return (
          <>
            <path d={areaPath(S1, 90)} fill={c(0)} fillOpacity={0.35} stroke={c(0)} strokeWidth={1.5} />
            <path d={areaPath(S2, 90)} fill={c(1)} fillOpacity={0.35} stroke={c(1)} strokeWidth={1.5} />
          </>
        )
      case 'response_stacked_area_chart':
        return (
          <>
            <path d={areaPath(S1, 120)} fill={c(0)} fillOpacity={0.55} />
            <path d={areaPath(S2, 120, S1)} fill={c(1)} fillOpacity={0.55} />
          </>
        )
      case 'response_percent_area_chart': {
        const total = S1.map((v, i) => v + S2[i])
        const a = S1.map((v, i) => (v / total[i]) * 80)
        const b = S2.map((v, i) => (v / total[i]) * 80)
        return (
          <>
            <path d={areaPath(a, 80)} fill={c(0)} fillOpacity={0.55} />
            <path d={areaPath(b, 80, a)} fill={c(1)} fillOpacity={0.55} />
          </>
        )
      }
      case 'response_pie_chart':
      case 'response_donut_chart': {
        const r0 = value === 'response_donut_chart' ? 12 : 0
        const total = PIE.reduce((s, v) => s + v, 0)
        let a = -Math.PI / 2
        return (
          <>
            {PIE.map((v, i) => {
              const a1 = a + (v / total) * Math.PI * 2
              const d = sectorPath(60, 32, r0, 24, a, a1)
              a = a1
              return <path key={i} d={d} fill={c(i)} fillOpacity={0.85} stroke="none" />
            })}
          </>
        )
      }
      case 'response_bar_chart':
        return (
          <>
            {BARS.map((v, i) => {
              const bw = (X1 - X0) / BARS.length
              return <rect key={i} x={X0 + i * bw + bw * 0.2} y={py(v, 80)} width={bw * 0.6} height={Y1 - py(v, 80)} rx={2} fill={c(i % 2)} fillOpacity={0.85} />
            })}
          </>
        )
      case 'response_many_bar_chart':
        return (
          <>
            {BARS.map((v, i) => {
              const bw = (X1 - X0) / BARS.length
              const v2 = S2[i % S2.length]
              return (
                <g key={i}>
                  <rect x={X0 + i * bw + bw * 0.15} y={py(v, 80)} width={bw * 0.3} height={Y1 - py(v, 80)} rx={1.5} fill={c(0)} fillOpacity={0.85} />
                  <rect x={X0 + i * bw + bw * 0.5} y={py(v2, 80)} width={bw * 0.3} height={Y1 - py(v2, 80)} rx={1.5} fill={c(1)} fillOpacity={0.85} />
                </g>
              )
            })}
          </>
        )
      case 'response_percent_bar_chart':
        return (
          <>
            {BARS.map((_, i) => {
              const bw = (X1 - X0) / BARS.length
              const a = 0.35 + (i % 3) * 0.15
              const h = Y1 - Y0
              return (
                <g key={i}>
                  <rect x={X0 + i * bw + bw * 0.2} y={Y0} width={bw * 0.6} height={h * a} rx={1.5} fill={c(0)} fillOpacity={0.85} />
                  <rect x={X0 + i * bw + bw * 0.2} y={Y0 + h * a} width={bw * 0.6} height={h * (1 - a)} rx={1.5} fill={c(1)} fillOpacity={0.85} />
                </g>
              )
            })}
          </>
        )
      case 'response_horizontal_bar_chart':
        return (
          <>
            {BARS.map((v, i) => (
              <rect key={i} x={X0} y={Y0 + i * 10 + 2} width={(v / 80) * (X1 - X0)} height={7} rx={2} fill={c(i % 3)} fillOpacity={0.85} />
            ))}
          </>
        )
      case 'response_radar_chart':
        return (
          <>
            <polygon points={polygonPoints([1, 1, 1, 1, 1], 60, 32, 24)} fill="none" stroke={axis} strokeOpacity={0.25} />
            <polygon points={polygonPoints([0.55, 0.55, 0.55, 0.55, 0.55], 60, 32, 24)} fill="none" stroke={axis} strokeOpacity={0.2} />
            <polygon points={polygonPoints([0.9, 0.6, 0.8, 0.5, 0.75], 60, 32, 24)} fill={c(0)} fillOpacity={0.4} stroke={c(0)} strokeWidth={1.5} />
          </>
        )
      case 'response_funnel_chart':
        return (
          <>
            {[0, 1, 2].map((i) => {
              const w = 88 - i * 26
              const w2 = 88 - (i + 1) * 26
              const y = Y0 + i * 16
              return <path key={i} d={`M${60 - w / 2} ${y} L${60 + w / 2} ${y} L${60 + w2 / 2} ${y + 14} L${60 - w2 / 2} ${y + 14} Z`} fill={c(i)} fillOpacity={0.85} />
            })}
          </>
        )
      case 'response_gauge_chart':
        return (
          <>
            <path d={arcStroke(60, 40, 22, Math.PI, Math.PI * 2)} fill="none" stroke={axis} strokeOpacity={0.18} strokeWidth={7} strokeLinecap="round" />
            <path d={arcStroke(60, 40, 22, Math.PI, Math.PI * 1.65)} fill="none" stroke={c(0)} strokeWidth={7} strokeLinecap="round" />
          </>
        )
      case 'response_rose_chart': {
        const total = PIE.length
        return (
          <>
            {PIE.map((v, i) => {
              const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / total
              const a1 = a0 + (2 * Math.PI) / total - 0.06
              return <path key={i} d={sectorPath(60, 32, 4, 8 + (v / 40) * 18, a0, a1)} fill={c(i)} fillOpacity={0.85} />
            })}
          </>
        )
      }
      case 'response_radial_bar_chart':
        return (
          <>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <path d={arcStroke(60, 36, 10 + i * 7, Math.PI, Math.PI * 2)} fill="none" stroke={axis} strokeOpacity={0.15} strokeWidth={5} strokeLinecap="round" />
                <path d={arcStroke(60, 36, 10 + i * 7, Math.PI, Math.PI * (1.4 + i * 0.25))} fill="none" stroke={c(i)} strokeWidth={5} strokeLinecap="round" />
              </g>
            ))}
          </>
        )
      case 'response_scatter_chart':
        return (
          <>
            {S1.map((v, i) => (
              <circle key={`a${i}`} cx={px(i, S1.length)} cy={py(v, 80)} r={3} fill={c(0)} fillOpacity={0.8} />
            ))}
            {S2.map((v, i) => (
              <circle key={`b${i}`} cx={px(i, S2.length) + 5} cy={py(v + 8, 80)} r={3} fill={c(1)} fillOpacity={0.8} />
            ))}
          </>
        )
      case 'response_wordcloud_chart':
        return (
          <>
            <text x={20} y={30} fontSize={16} fontWeight={700} fill={c(0)}>
              数据
            </text>
            <text x={58} y={24} fontSize={11} fill={c(1)}>
              趋势
            </text>
            <text x={86} y={34} fontSize={13} fontWeight={600} fill={c(2)}>
              占比
            </text>
            <text x={30} y={48} fontSize={10} fill={c(3)}>
              增长
            </text>
            <text x={66} y={50} fontSize={12} fill={c(4)}>
              分析
            </text>
          </>
        )
      default:
        return <polyline points={linePoints(S1, 80)} fill="none" stroke={c(0)} strokeWidth={2} />
    }
  })()

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={value} style={{ display: 'block', width: '100%', height: 'auto' }}>
      {/* 基线：跟随图表文字色低透明度，深浅背景都可见 */}
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={axis} strokeOpacity={0.25} strokeWidth={1} />
      {body}
    </svg>
  )
}
