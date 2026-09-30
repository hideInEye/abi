import { createContext, useContext } from 'react'

import { DEFAULT_CHART_STYLE, type ChartOptionStyle } from '../conversation/helpers/chartOption'

/**
 * 图表主题 token（配色/文字色/字体/字号）由 ChatWidget 根节点注入，ChartCard 消费。
 * 替代原写死的模块常量 CHART_CONFIG，使图表随自定义主题联动；缺省回落 DEFAULT_CHART_STYLE。
 */
export const ChartThemeContext = createContext<ChartOptionStyle>(DEFAULT_CHART_STYLE)

export const useChartTheme = (): ChartOptionStyle => useContext(ChartThemeContext)
