import { useEffect, useRef, useState } from 'react'

import type { ChartThemeValue } from './ChartThemeContext'

const TWEEN_MS = 320

type Rgb = [number, number, number]

/** 解析 #hex / rgb() / rgba() 为 RGB 三元组，失败返回 null */
function parseRgb(css: string): Rgb | null {
  const s = css.trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    const n = parseInt(h, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(s)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  return null
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
/* 输出 hex 而非 rgb()：调色板约定为逗号分隔串，rgb() 内的逗号会破坏 split(',') */
const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/**
 * 图表主题颜色补间：ECharts setOption 更新动画只补间位置/尺寸等数值，颜色变化直接生效，
 * 主题换色时图表硬切（换类型/数据增长的入场动画却正常，观感即"动画时有时无"）。
 * 这里对调色板与文字色做 rAF 逐帧插值、驱动合并 setOption，形成换色过渡；其余字段取目标值即时生效。
 */
export function useTweenedChartStyle(style: ChartThemeValue): ChartThemeValue {
  const [current, setCurrent] = useState(style)
  const fromRef = useRef(style)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (from.color === style.color && from.textColor === style.textColor) {
      fromRef.current = style
      setCurrent(style)
      return
    }
    const fromColors = from.color.split(',').map(parseRgb).filter((c): c is Rgb => !!c)
    const toColors = style.color.split(',').map(parseRgb).filter((c): c is Rgb => !!c)
    const fromText = parseRgb(from.textColor)
    const toText = parseRgb(style.textColor)
    // 任一侧解析失败放弃补间直接落地，避免卡在半路颜色
    if (!fromColors.length || !toColors.length || !fromText || !toText) {
      fromRef.current = style
      setCurrent(style)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS)
      const e = t * (2 - t)
      const count = Math.max(fromColors.length, toColors.length)
      const colors: string[] = []
      for (let i = 0; i < count; i++) {
        const a = fromColors[Math.min(i, fromColors.length - 1)]
        const b = toColors[Math.min(i, toColors.length - 1)]
        colors.push(toHex(mix(a, b, e)))
      }
      const next: ChartThemeValue = { ...style, color: colors.join(','), textColor: toHex(mix(fromText, toText, e)) }
      fromRef.current = next
      setCurrent(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.color, style.textColor])

  return current
}
