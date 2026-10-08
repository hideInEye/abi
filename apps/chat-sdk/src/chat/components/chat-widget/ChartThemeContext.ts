import { createContext, useContext } from 'react'

import { DEFAULT_CHART_STYLE, type ChartOptionStyle } from '../conversation/helpers/chartOption'

/**
 * 图表主题 token（配色/文字色/字体/字号）由 ChatWidget 根节点注入，ChartCard 消费。
 * 替代原写死的模块常量 CHART_CONFIG，使图表随自定义主题联动；缺省回落 DEFAULT_CHART_STYLE。
 * dark 标记黑色系预设：SQL/代码块等 JS 侧控制的配色据此切暗色语法主题（CSS 变量覆盖不到的部分）。
 */
export type ChartThemeValue = ChartOptionStyle & { dark?: boolean }

export const ChartThemeContext = createContext<ChartThemeValue>({ ...DEFAULT_CHART_STYLE, dark: false })

export const useChartTheme = (): ChartThemeValue => useContext(ChartThemeContext)
