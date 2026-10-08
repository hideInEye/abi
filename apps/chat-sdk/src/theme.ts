import type { CSSProperties } from 'react'

/**
 * 悬浮窗预设主题：整体风格三选一，由分享方在 ABI 平台选定后随分享配置下发。
 * - blue：现状（浅蓝玻璃拟态），= chat/index.css :root 默认值，不做任何覆盖，保证零风险
 * - light：干净白色系（弱化蓝紫玻璃感，背景近白，主色沿用蓝）
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
  // 复用对话组件内写死的白色半透明/渐变（thinking 卡片、底部渐隐罩、section-header）
  '--cw-think-bg': 'rgba(36, 40, 56, 0.85)',
  '--cw-think-fade': 'rgba(31, 34, 48, 0.95)',
  '--cw-section-head': 'rgba(255, 255, 255, 0.04)',
  // 复用 markdown 正文（index.module.css .markdown-content 写死深色文字/浅色表头）
  '--cw-md-text': '#dbe2f0',
  '--cw-md-head': '#f0f3fa',
  '--cw-md-td': '#c2cbdb',
  '--cw-md-th-bg': 'rgba(255, 255, 255, 0.05)',
  '--cw-md-table-bg': 'rgba(255, 255, 255, 0.03)',
}

const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  blue: {},
  light: LIGHT_VARS,
  dark: DARK_VARS,
}

/**
 * 解析主题为可直接挂到根节点的 inline style（CSS 自定义属性覆盖）。
 * 内联优先级高于 :where(.abi-cw-root) 默认，天然覆盖且仅作用于悬浮窗子树，不污染宿主。
 * blue 返回空对象即回退默认值。
 */
export function resolveThemeStyle(themeId: ThemeId): CSSProperties {
  return THEME_VARS[themeId] as CSSProperties
}
