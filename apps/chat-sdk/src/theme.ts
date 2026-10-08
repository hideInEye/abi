import type { CSSProperties } from 'react'

/**
 * 悬浮窗预设主题：整体风格三选一，由分享方在 ABI 平台选定后随分享配置下发。
 * - blue：品牌蓝系（品牌蓝标题栏 + 浅蓝画布，与白色系的素白观感明确区分）
 * - light：干净白色系（白底标题栏、近白画布，弱化蓝感）
 * - dark：黑色系（整套配色反转，字色提亮、背景压深、阴影加深）
 *
 * 只覆盖随风格变化的配色变量；结构类（圆角 --r-*、字体 --font/--mono、缓动 --ease）
 * 与语义色（--danger/--success/--warn）三套通用，不在此覆盖。
 * 图表调色板另作第二步（ECharts 颜色写死在各图表组件，需单独收敛）。
 */
export type ThemeId = 'blue' | 'light' | 'dark'

export const THEME_IDS: ThemeId[] = ['blue', 'light', 'dark']

export const DEFAULT_THEME: ThemeId = 'blue'

/** 归一化外部传入的风格标识，非法值回退默认蓝色系 */
export function normalizeThemeId(raw: unknown): ThemeId {
  return raw === 'light' || raw === 'dark' || raw === 'blue' ? raw : DEFAULT_THEME
}

/** 白色系覆盖：背景转近白浅灰、玻璃更实、边框转中性黑；字色与主色沿用默认（默认本就是浅色系深字） */
const LIGHT_VARS: Record<string, string> = {
  // 全局玻璃/背景（对话与 markdown 正文区读取）
  '--bg-1': '#ffffff',
  '--bg-2': '#f6f7fb',
  '--bg-3': '#eef1f7',
  '--glass': 'rgba(255, 255, 255, 0.86)',
  '--glass-strong': 'rgba(255, 255, 255, 0.96)',
  '--glass-border': 'rgba(20, 28, 48, 0.06)',
  '--border': 'rgba(20, 28, 48, 0.09)',
  '--border-2': 'rgba(20, 28, 48, 0.05)',
  // 悬浮窗外壳（chat-widget/index.css 读取 --cw-*）
  '--cw-surface': '#ffffff',
  '--cw-border': '#eceef2',
  '--cw-border-2': '#e5e7eb',
  '--cw-header-bg': '#ffffff',
  '--cw-header-border': '#eceef2',
  '--cw-body-bg': '#f7f8fa',
  '--cw-input-bg': '#f3f4f6',
  '--cw-infobar-bg': '#f7f8fa',
  '--cw-text': '#1f2733',
  '--cw-text-2': '#6b7688',
  '--cw-text-muted': '#9aa4b2',
  // AI 消息卡底（widget 普通模式白卡容器读取）
  '--cw-card-bg': '#ffffff',
  // 页面模式外壳渐变与数据块面（图表底衬/表格卡/SQL 与代码块）：三套预设各自成套，避免内容块不随风格变化
  '--cw-page-bg': 'linear-gradient(160deg, #f2f4fa 0%, #eef1f7 60%, #e9edf5 100%)',
  '--cw-chart-wrap-bg': '#f2f3f5',
  '--cw-block-bg': '#fafbfd',
  '--cw-block-head-bg': '#f5f8fc',
  '--cw-block-border': 'rgba(130, 140, 200, 0.10)',
  '--cw-block-text': '#3d4454',
  '--cw-block-muted': '#6b7280',
  '--cw-block-zebra': 'rgba(248, 250, 255, 0.5)',
  '--cw-block-hover': 'rgba(91, 124, 247, 0.04)',
}

/** 蓝色系覆盖：白底 + 单一品牌蓝点缀——画布低饱和冷蓝、染条统一品牌蓝低透、气泡实底品牌蓝锚定标题栏 */
const BLUE_VARS: Record<string, string> = {
  ...LIGHT_VARS,
  // 品牌蓝标题栏：白字白图标，hover 用白色半透底
  '--cw-header-bg': 'linear-gradient(90deg, #5b7cf7 0%, #6c88f8 100%)',
  '--cw-header-border': 'rgba(255, 255, 255, 0.22)',
  '--cw-header-text': '#ffffff',
  '--cw-header-icon': '#ffffff',
  '--cw-header-icon-hover-bg': 'rgba(255, 255, 255, 0.18)',
  '--cw-card-bg': '#ffffff',
  // 画布降饱和冷蓝：衬白卡不抢眼，与白色系的中性灰底仍有明确区分
  '--cw-body-bg': '#eef2fa',
  '--cw-infobar-bg': 'rgba(91, 124, 247, 0.06)',
  '--cw-input-bg': '#f7f9fe',
  '--cw-border': '#d8e2f4',
  '--cw-border-2': '#dfe7f5',
  '--bg-2': '#eef2fa',
  '--bg-3': '#e7edf8',
  // 染条/块面统一品牌蓝单色低透（不掺紫），白底为主、蓝只做点缀，避免多色块拼贴
  '--cw-section-head': 'rgba(91, 124, 247, 0.06)',
  '--cw-think-head-bg': 'linear-gradient(135deg, rgba(91, 124, 247, 0.07) 0%, rgba(91, 124, 247, 0.03) 100%)',
  '--cw-think-head-bg-hover': 'linear-gradient(135deg, rgba(91, 124, 247, 0.11) 0%, rgba(91, 124, 247, 0.06) 100%)',
  '--cw-think-border': 'rgba(91, 124, 247, 0.14)',
  '--cw-page-bg': 'linear-gradient(165deg, #f0f4fb 0%, #ebf0f9 55%, #e6ecf7 100%)',
  '--cw-chart-wrap-bg': '#f5f8fd',
  '--cw-block-bg': '#ffffff',
  '--cw-block-head-bg': '#f1f5fc',
  '--cw-block-border': 'rgba(91, 124, 247, 0.14)',
  '--cw-block-zebra': 'rgba(91, 124, 247, 0.035)',
  '--cw-block-hover': 'rgba(91, 124, 247, 0.06)',
  '--cw-md-th-bg': '#f1f5fc',
  '--cw-md-table-bg': '#ffffff',
  // 消息正文冷蓝墨色：蓝色系下对话内容也有明确风格变化（白色系为中性黑、黑色系为提亮色）
  '--cw-md-text': '#2c3a57',
  '--cw-md-head': '#1d2b4f',
  '--cw-md-td': '#3d4c6b',
  // 用户气泡实底品牌蓝 + 白字：与标题栏同色锚定，替代浅蓝底深字的浑浊观感
  '--cw-bubble-bg': 'linear-gradient(135deg, #5b7cf7 0%, #7d99ff 100%)',
  '--cw-bubble-border': 'transparent',
  '--cw-bubble-text': '#ffffff',
}

/** 黑色系覆盖：整套反转——背景压深、玻璃改深色半透明、字色提亮、主色提亮、边框转浅色低透明、阴影加深 */
const DARK_VARS: Record<string, string> = {
  // 全局玻璃/背景（对话与 markdown 正文区读取）
  '--bg-1': '#1a1d29',
  '--bg-2': '#15171f',
  '--bg-3': '#1e2033',
  '--glass': 'rgba(40, 44, 58, 0.60)',
  '--glass-strong': 'rgba(48, 52, 68, 0.82)',
  '--glass-border': 'rgba(255, 255, 255, 0.08)',
  '--ink': '#e8ecf5',
  '--ink-2': '#b0bdd0',
  '--ink-3': '#8494ad',
  '--ink-4': '#5a6580',
  '--accent': '#7b96ff',
  '--accent-2': '#a78bfa',
  '--accent-soft': 'rgba(123, 150, 255, 0.14)',
  '--accent-glow': 'rgba(123, 150, 255, 0.28)',
  '--purple-soft': 'rgba(167, 139, 250, 0.14)',
  '--accent-orange-soft': 'rgba(245, 158, 11, 0.16)',
  '--accent-green-soft': 'rgba(16, 185, 129, 0.16)',
  '--border': 'rgba(255, 255, 255, 0.10)',
  '--border-2': 'rgba(255, 255, 255, 0.05)',
  '--shadow-s': '0 1px 2px rgba(0, 0, 0, 0.30)',
  '--shadow-m': '0 4px 16px rgba(0, 0, 0, 0.40)',
  '--shadow-l': '0 8px 32px rgba(0, 0, 0, 0.50)',
  // 悬浮窗外壳（chat-widget/index.css 读取 --cw-*）
  '--cw-surface': '#1f2230',
  '--cw-border': 'rgba(255, 255, 255, 0.10)',
  '--cw-border-2': 'rgba(255, 255, 255, 0.08)',
  '--cw-header-bg': 'rgba(40, 44, 58, 0.72)',
  '--cw-header-border': 'rgba(255, 255, 255, 0.10)',
  '--cw-body-bg': '#15171f',
  '--cw-input-bg': 'rgba(255, 255, 255, 0.06)',
  '--cw-infobar-bg': 'rgba(255, 255, 255, 0.05)',
  '--cw-text': '#e8ecf5',
  '--cw-text-2': '#a6b2c8',
  '--cw-text-muted': '#8494ad',
  '--cw-card-bg': 'rgba(48, 52, 68, 0.82)',
  // 复用对话组件内写死的白色半透明/渐变（thinking 卡片、底部渐隐罩、section-header）
  '--cw-think-bg': 'rgba(36, 40, 56, 0.85)',
  '--cw-think-fade': 'rgba(31, 34, 48, 0.95)',
  '--cw-section-head': 'rgba(255, 255, 255, 0.04)',
  // 复用 markdown 正文（index.module.css .markdown-content 读取 --cw-md-* 系列）
  '--cw-md-text': '#dbe2f0',
  '--cw-md-head': '#f0f3fa',
  '--cw-md-td': '#c2cbdb',
  '--cw-md-th-bg': 'rgba(255, 255, 255, 0.05)',
  '--cw-md-table-bg': 'rgba(255, 255, 255, 0.03)',
  // 数据块面（图表底衬/表格卡/SQL 与代码块）：深底上用低透白叠层，与玻璃质感一致且不残留浅底色
  '--cw-page-bg': 'linear-gradient(160deg, #101218 0%, #15171f 60%, #1a1d29 100%)',
  '--cw-chart-wrap-bg': 'rgba(255, 255, 255, 0.04)',
  '--cw-block-bg': 'rgba(255, 255, 255, 0.04)',
  '--cw-block-head-bg': 'rgba(255, 255, 255, 0.07)',
  '--cw-block-border': 'rgba(255, 255, 255, 0.10)',
  '--cw-block-text': '#d5dcea',
  '--cw-block-muted': '#8b98b0',
  '--cw-block-zebra': 'rgba(255, 255, 255, 0.03)',
  '--cw-block-hover': 'rgba(255, 255, 255, 0.06)',
  // 探索模式：步骤结果卡/技能横带/空态框原为白色半透明叠层，深底上会糊成灰块，改低透白
  '--cw-step-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(91, 124, 247, 0.03) 100%)',
  '--cw-skill-band-bg': 'rgba(255, 255, 255, 0.04)',
  '--cw-empty-bg': 'rgba(255, 255, 255, 0.03)',
  // 停止按钮：浅粉底在深底上刺眼，改低透红
  '--cw-stop-bg': 'rgba(255, 77, 79, 0.14)',
  '--cw-stop-bg-hover': 'rgba(255, 77, 79, 0.24)',
  '--cw-stop-border': 'rgba(255, 77, 79, 0.4)',
  '--cw-stop-color': '#ff7875',
  // 状态标签文字：浅色系的深绿/深红在深底上对比不足，提亮
  '--cw-tag-green': '#34d399',
  '--cw-tag-red': '#ff7875',
}

const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  blue: BLUE_VARS,
  light: LIGHT_VARS,
  dark: DARK_VARS,
}

/**
 * 解析主题为可直接挂到根节点的 inline style（CSS 自定义属性覆盖）。
 * 内联优先级高于 :where(.abi-cw-root) 默认，天然覆盖且仅作用于悬浮窗子树，不污染宿主。
 * 三套预设各有变量表（blue = 白色系中性底 + 品牌蓝覆盖）。
 */
export function resolveThemeStyle(themeId: ThemeId): CSSProperties {
  return THEME_VARS[themeId] as CSSProperties
}

/* ────────────────────────────────────────────────────────────────
 * 自定义主题配置（基础版）：在预设之上，按背景/标题栏/字体/图表四维覆盖。
 * 预设变量表负责未被建模的变量（--glass、--ink、--accent、--border、--shadow、
 * --cw-md- 与 --cw-think- 系列等），ThemeConfig 只覆盖建模到的少数变量，二者叠加应用。
 * 未自定义时 override 为空 → 纯预设基准。
 * ──────────────────────────────────────────────────────────────── */

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

export interface ThemeBackgroundConfig {
  type: 'solid' | 'gradient'
  color: string
  color2: string
  /** 渐变角度（deg），仅 gradient 生效 */
  angle: number
}

export interface ThemeTitleBarConfig {
  bg: string
  text: string
}

export interface ThemeFontConfig {
  family: string
  /** 基准字号 px；应用时换算为 --cw-font-scale（size/14）整体缩放正文 */
  size: number
  color: string
  weight: number
}

export interface ThemeChartConfig {
  /** 系列配色板（ECharts color 数组） */
  palette: string[]
  textColor: string
  fontFamily: string
  fontSize: number
}

export interface ThemeMessageConfig {
  /** AI 消息卡片背景色 */
  cardBg: string
  /** AI 消息文字色（正文/标题/表格单元/数据块文字） */
  textColor: string
  /** 用户气泡色 */
  bubbleColor: string
}

export interface ThemeConfig {
  background: ThemeBackgroundConfig
  titleBar: ThemeTitleBarConfig
  font: ThemeFontConfig
  chart: ThemeChartConfig
  message: ThemeMessageConfig
}

/** 默认系列配色（与 chartOption DEFAULT_CHART_STYLE.color 一致） */
export const DEFAULT_CHART_PALETTE = ['#2FA4FF', '#7ACBFF', '#A67AFF', '#F7A45C', '#6E6E6E', '#50C878']

const DEFAULT_FONT_FAMILY = "'Helvetica Neue', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

/** 缺省配置 = blue 预设的可视默认值（与 BLUE_VARS 同源，保证定制面板基准与实际观感一致） */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  background: { type: 'solid', color: '#eef2fa', color2: '#e7edf8', angle: 135 },
  titleBar: { bg: '#5b7cf7', text: '#ffffff' },
  font: { family: DEFAULT_FONT_FAMILY, size: 14, color: '#1f2733', weight: 400 },
  chart: { palette: [...DEFAULT_CHART_PALETTE], textColor: '#333333', fontFamily: 'Arial', fontSize: 12 },
  message: { cardBg: '#ffffff', textColor: '#2c3a57', bubbleColor: '#5b7cf7' },
}

/** 各预设对应的四维基准值（供定制面板初始化表单；应用仍走预设变量表 + override 叠加） */
const PRESET_CONFIG: Record<ThemeId, ThemeConfig> = {
  blue: DEFAULT_THEME_CONFIG,
  light: {
    background: { type: 'solid', color: '#f7f8fa', color2: '#eef1f7', angle: 135 },
    titleBar: { bg: '#ffffff', text: '#1f2733' },
    font: { family: DEFAULT_FONT_FAMILY, size: 14, color: '#1f2733', weight: 400 },
    chart: { palette: [...DEFAULT_CHART_PALETTE], textColor: '#333333', fontFamily: 'Arial', fontSize: 12 },
    message: { cardBg: '#ffffff', textColor: '#262626', bubbleColor: '#e6edfb' },
  },
  dark: {
    background: { type: 'solid', color: '#15171f', color2: '#1e2033', angle: 135 },
    titleBar: { bg: 'rgba(40, 44, 58, 0.72)', text: '#e8ecf5' },
    font: { family: DEFAULT_FONT_FAMILY, size: 14, color: '#e8ecf5', weight: 400 },
    chart: { palette: [...DEFAULT_CHART_PALETTE], textColor: '#e8ecf5', fontFamily: 'Arial', fontSize: 12 },
    message: { cardBg: 'rgba(48, 52, 68, 0.82)', textColor: '#dbe2f0', bubbleColor: 'rgba(91, 124, 247, 0.25)' },
  },
}

/** 预设 → 完整配置（深拷贝，避免调用方改动污染常量表） */
export function presetToThemeConfig(themeId: ThemeId): ThemeConfig {
  const src = PRESET_CONFIG[themeId] ?? DEFAULT_THEME_CONFIG
  return {
    background: { ...src.background },
    titleBar: { ...src.titleBar },
    font: { ...src.font },
    chart: { ...src.chart, palette: [...src.chart.palette] },
    message: { ...src.message },
  }
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * 校验/兜底解析后端下发或 localStorage 读回的配置，剔除非法字段。
 * 返回 partial（仅含合法且有值的字段）；无任何有效字段时返回 undefined。
 */
export function normalizeThemeConfig(raw: unknown): DeepPartial<ThemeConfig> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, any>
  const out: DeepPartial<ThemeConfig> = {}

  if (r.background && typeof r.background === 'object') {
    const b: DeepPartial<ThemeBackgroundConfig> = {}
    if (r.background.type === 'solid' || r.background.type === 'gradient') b.type = r.background.type
    if (isNonEmptyString(r.background.color)) b.color = r.background.color
    if (isNonEmptyString(r.background.color2)) b.color2 = r.background.color2
    if (typeof r.background.angle === 'number' && Number.isFinite(r.background.angle)) b.angle = r.background.angle
    if (Object.keys(b).length) out.background = b
  }
  if (r.titleBar && typeof r.titleBar === 'object') {
    const t: DeepPartial<ThemeTitleBarConfig> = {}
    if (isNonEmptyString(r.titleBar.bg)) t.bg = r.titleBar.bg
    if (isNonEmptyString(r.titleBar.text)) t.text = r.titleBar.text
    if (Object.keys(t).length) out.titleBar = t
  }
  if (r.font && typeof r.font === 'object') {
    const f: DeepPartial<ThemeFontConfig> = {}
    if (isNonEmptyString(r.font.family)) f.family = r.font.family
    if (typeof r.font.size === 'number' && Number.isFinite(r.font.size)) f.size = r.font.size
    if (isNonEmptyString(r.font.color)) f.color = r.font.color
    if (typeof r.font.weight === 'number' && Number.isFinite(r.font.weight)) f.weight = r.font.weight
    if (Object.keys(f).length) out.font = f
  }
  if (r.chart && typeof r.chart === 'object') {
    const c: DeepPartial<ThemeChartConfig> = {}
    if (Array.isArray(r.chart.palette)) {
      const palette = r.chart.palette.filter(isNonEmptyString)
      if (palette.length) c.palette = palette
    }
    if (isNonEmptyString(r.chart.textColor)) c.textColor = r.chart.textColor
    if (isNonEmptyString(r.chart.fontFamily)) c.fontFamily = r.chart.fontFamily
    if (typeof r.chart.fontSize === 'number' && Number.isFinite(r.chart.fontSize)) c.fontSize = r.chart.fontSize
    if (Object.keys(c).length) out.chart = c
  }
  if (r.message && typeof r.message === 'object') {
    const m: DeepPartial<ThemeMessageConfig> = {}
    if (isNonEmptyString(r.message.cardBg)) m.cardBg = r.message.cardBg
    if (isNonEmptyString(r.message.textColor)) m.textColor = r.message.textColor
    if (isNonEmptyString(r.message.bubbleColor)) m.bubbleColor = r.message.bubbleColor
    if (Object.keys(m).length) out.message = m
  }

  return Object.keys(out).length ? out : undefined
}

/** 深合并若干 partial override（后者覆盖前者），返回 partial；用于 api 配置 + 本地自定义叠加 */
export function mergeThemeOverride(...parts: Array<DeepPartial<ThemeConfig> | null | undefined>): DeepPartial<ThemeConfig> {
  const out: DeepPartial<ThemeConfig> = {}
  for (const p of parts) {
    if (!p) continue
    if (p.background) out.background = { ...(out.background || {}), ...p.background }
    if (p.titleBar) out.titleBar = { ...(out.titleBar || {}), ...p.titleBar }
    if (p.font) out.font = { ...(out.font || {}), ...p.font }
    if (p.chart) {
      const { palette, ...rest } = p.chart
      out.chart = { ...(out.chart || {}), ...rest }
      if (Array.isArray(palette)) out.chart.palette = [...palette]
    }
    if (p.message) out.message = { ...(out.message || {}), ...p.message }
  }
  return out
}

/** 以预设为基准叠加 override，得到完整配置（供定制面板表单回填与保存快照） */
export function resolveFullConfig(themeId: ThemeId, override?: DeepPartial<ThemeConfig> | null): ThemeConfig {
  return mergeThemeOverride(presetToThemeConfig(themeId), override) as ThemeConfig
}

/**
 * 配置 → 可挂根节点的 inline style（CSS 自定义属性覆盖），仅产出有值字段对应变量。
 * 与 resolveThemeStyle(预设) 叠加使用：预设负责全量变量，这里只覆盖建模到的四维。
 */
export function themeConfigToStyle(cfg?: DeepPartial<ThemeConfig> | null): CSSProperties {
  if (!cfg) return {}
  const style: Record<string, string> = {}

  const bg = cfg.background
  if (bg) {
    if (bg.type === 'gradient' && bg.color && bg.color2) {
      style['--cw-body-bg-image'] = `linear-gradient(${bg.angle ?? 135}deg, ${bg.color}, ${bg.color2})`
      style['--cw-body-bg'] = bg.color
    } else if (bg.color) {
      style['--cw-body-bg'] = bg.color
      style['--cw-body-bg-image'] = 'none'
    }
  }

  const tb = cfg.titleBar
  if (tb?.bg) style['--cw-header-bg'] = tb.bg
  if (tb?.text) {
    style['--cw-header-text'] = tb.text
    // 操作图标跟随标题栏文字色，避免自定义深色底后残留灰图标
    style['--cw-header-icon'] = tb.text
  }

  const f = cfg.font
  if (f?.family) style['--cw-font-family'] = f.family
  if (f?.color) {
    style['--cw-text'] = f.color
    // 消息正文/标题/表格单元/数据块文字同步自定义字体色（预设 --cw-md-*/--cw-block-text 优先级更高，需一并覆盖）
    style['--cw-md-text'] = f.color
    style['--cw-md-head'] = f.color
    style['--cw-md-td'] = f.color
    style['--cw-block-text'] = f.color
  }
  if (typeof f?.weight === 'number') style['--cw-font-weight'] = String(f.weight)
  // 字号换算为缩放因子（基准 14px），CSS 侧以 calc(Npx * var(--cw-font-scale)) 整体缩放正文
  if (typeof f?.size === 'number' && f.size > 0) style['--cw-font-scale'] = String(f.size / 14)

  // 对话消息三维：卡片底/文字色/气泡色，直接作用于 AI 消息卡与用户气泡
  const m = cfg.message
  if (m?.cardBg) {
    style['--cw-card-bg'] = m.cardBg
    // 卡内数据块面跟随卡底，避免自定义深底后残留白块
    style['--cw-block-bg'] = m.cardBg
    style['--cw-md-table-bg'] = m.cardBg
    style['--cw-think-bg'] = m.cardBg
    // 思考区底部渐隐罩终点色跟随卡底，避免自定义后露出预设色亮带
    style['--cw-think-fade'] = m.cardBg
    // 探索模式卡/工作室窗格的玻璃面与步骤结果/摘要/技能带面同样跟随卡底
    style['--glass-strong'] = m.cardBg
    style['--glass'] = m.cardBg
    style['--cw-step-bg'] = m.cardBg
    style['--cw-skill-band-bg'] = m.cardBg
    style['--cw-empty-bg'] = m.cardBg
  }
  if (m?.textColor) {
    style['--cw-md-text'] = m.textColor
    style['--cw-md-head'] = m.textColor
    style['--cw-md-td'] = m.textColor
    style['--cw-block-text'] = m.textColor
    // 探索模式卡/工作室正文以 --ink 系列为基色，同色覆盖保证自定义文字色占到
    style['--ink'] = m.textColor
    style['--ink-2'] = m.textColor
    style['--ink-3'] = m.textColor
    style['--ink-4'] = m.textColor
  }
  if (m?.bubbleColor) {
    style['--cw-bubble-bg'] = m.bubbleColor
    style['--cw-bubble-border'] = 'transparent'
    // 气泡文字按底色明暗自动取黑/白，保证可读
    style['--cw-bubble-text'] = isLightColor(m.bubbleColor) ? '#1f2733' : '#ffffff'
  }

  return style as CSSProperties
}

/** 粗判颜色明暗（支持 #rrggbb 与 rgb/rgba）：气泡文字色自动取黑/白用 */
function isLightColor(css: string): boolean {
  let r = 0
  let g = 0
  let b = 0
  const hex = /^#([0-9a-f]{6})$/i.exec(css.trim())
  if (hex) {
    const n = parseInt(hex[1], 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  } else {
    const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(css)
    if (!rgb) return false
    r = +rgb[1]
    g = +rgb[2]
    b = +rgb[3]
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

/** 图表四维 → getChartOption 所需 ChartOptionStyle（color 为逗号分隔串，与既有约定一致） */
export function chartStyleFromConfig(cfg?: DeepPartial<ThemeConfig> | null): { font: string; fontSize: number; color: string; textColor: string } {
  const c = cfg?.chart
  const palette = c?.palette && c.palette.length ? c.palette : DEFAULT_THEME_CONFIG.chart.palette
  return {
    font: c?.fontFamily ?? DEFAULT_THEME_CONFIG.chart.fontFamily,
    fontSize: c?.fontSize ?? DEFAULT_THEME_CONFIG.chart.fontSize,
    color: palette.join(','),
    textColor: c?.textColor ?? DEFAULT_THEME_CONFIG.chart.textColor,
  }
}
