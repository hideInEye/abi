/**
 * 智能图表类型目录
 * 参考大屏（apps/dashboard）组件库的三级组织方式：
 *   一级：语义分类（趋势演变 / 占比构成 / 比较排名 / 多维评估 / 关系分布）
 *   二级：图表大类（按形状分组：折线图 / 面积图 / 饼图 / 柱状图 ...，如"面积图"聚合所有面积图）
 *   三级：大类下的具体图表变体（基础面积图 / 堆叠面积图 / 百分比面积图 ...），以带预览图的卡片形式展示
 * 预览缩略图复用大屏导出的静态图片（apps/chat/src/assets/chart-thumbs）。
 *
 * 渲染分期：当前仅 supported=true 的类型接入了 ECharts 渲染，
 * 其余类型仅提供选择与预览，选中后在图表区域展示占位提示。
 */
import lineThumb from '@/assets/chart-thumbs/line.png'
import areaThumb from '@/assets/chart-thumbs/area.png'
import areaStackThumb from '@/assets/chart-thumbs/area-stack.png'
import areaPercentThumb from '@/assets/chart-thumbs/area-percent.png'
import pieThumb from '@/assets/chart-thumbs/pie.png'
import donutThumb from '@/assets/chart-thumbs/donut.svg'
import barPercentThumb from '@/assets/chart-thumbs/bar-percent.png'
import barThumb from '@/assets/chart-thumbs/bar.png'
import columnThumb from '@/assets/chart-thumbs/column.png'
import columnGroupThumb from '@/assets/chart-thumbs/column-group.png'
import radarThumb from '@/assets/chart-thumbs/radar.png'
import funnelThumb from '@/assets/chart-thumbs/funnel.svg'
import gaugeThumb from '@/assets/chart-thumbs/gauge.png'
import roseThumb from '@/assets/chart-thumbs/rose.png'
import radialBarThumb from '@/assets/chart-thumbs/radial-bar.png'
import scatterThumb from '@/assets/chart-thumbs/scatter.png'
import wordcloudThumb from '@/assets/chart-thumbs/wordcloud.png'

export interface ChartTypeItem {
  /** 展示名称（三级具体变体名） */
  label: string
  /** 英文名 */
  enName: string
  /** 内部图表类型标识（与 ViewEle 渲染逻辑一致） */
  value: string
  /** 预览缩略图 */
  thumbnail: string
  /** 是否已接入真实渲染（false 时选中展示占位提示） */
  supported: boolean
}

export interface ChartFamily {
  /** 大类标识 */
  key: string
  /** 大类名称（二级，如"面积图"） */
  label: string
  /** 大类下的具体图表变体（三级） */
  items: ChartTypeItem[]
}

export interface ChartCategory {
  /** 分类标识 */
  key: string
  /** 分类名称（一级语义分类） */
  label: string
  families: ChartFamily[]
}

export const CHART_CATEGORIES: ChartCategory[] = [
  {
    key: 'trend',
    label: '趋势演变',
    families: [
      {
        key: 'line',
        label: '折线图',
        items: [
          { label: '基础折线图', enName: 'Line Chart', value: 'response_line_chart', thumbnail: lineThumb, supported: true },
        ],
      },
      {
        key: 'area',
        label: '面积图',
        items: [
          { label: '基础面积图', enName: 'Area Chart', value: 'response_area_chart', thumbnail: areaThumb, supported: true },
          { label: '堆叠面积图', enName: 'Stacked Area', value: 'response_stacked_area_chart', thumbnail: areaStackThumb, supported: false },
          { label: '百分比面积图', enName: 'Percent Stacked Area', value: 'response_percent_area_chart', thumbnail: areaPercentThumb, supported: false },
        ],
      },
    ],
  },
  {
    key: 'proportion',
    label: '占比构成',
    families: [
      {
        key: 'pie',
        label: '饼图',
        items: [
          { label: '基础饼图', enName: 'Pie Chart', value: 'response_pie_chart', thumbnail: pieThumb, supported: true },
          { label: '圆环图', enName: 'Donut Chart', value: 'response_donut_chart', thumbnail: donutThumb, supported: true },
        ],
      },
    ],
  },
  {
    key: 'compare',
    label: '比较排名',
    families: [
      {
        key: 'bar',
        label: '条形图',
        items: [
          { label: '条形图', enName: 'Bar Chart', value: 'response_horizontal_bar_chart', thumbnail: barThumb, supported: false },
        ],
      },
      {
        key: 'column',
        label: '柱状图',
        items: [
          { label: '基础柱状图', enName: 'Column Chart', value: 'response_bar_chart', thumbnail: columnThumb, supported: true },
          { label: '多指标柱形图', enName: 'Grouped Bar', value: 'response_many_bar_chart', thumbnail: columnGroupThumb, supported: true },
          { label: '百分比堆叠柱状图', enName: 'Percent Stacked Bar', value: 'response_percent_bar_chart', thumbnail: barPercentThumb, supported: false },
        ],
      },
    ],
  },
  {
    key: 'evaluate',
    label: '多维评估',
    families: [
      {
        key: 'radar',
        label: '雷达图',
        items: [
          { label: '雷达图', enName: 'Radar Chart', value: 'response_radar_chart', thumbnail: radarThumb, supported: false },
        ],
      },
      {
        key: 'funnel',
        label: '漏斗图',
        items: [
          { label: '漏斗图', enName: 'Funnel Chart', value: 'response_funnel_chart', thumbnail: funnelThumb, supported: false },
        ],
      },
      {
        key: 'progress',
        label: '进度图',
        items: [
          { label: '进度图', enName: 'Progress/Gauge Chart', value: 'response_gauge_chart', thumbnail: gaugeThumb, supported: false },
        ],
      },
      {
        key: 'rose',
        label: '玫瑰图',
        items: [
          { label: '玫瑰图', enName: 'Rose Chart', value: 'response_rose_chart', thumbnail: roseThumb, supported: false },
        ],
      },
      {
        key: 'radial',
        label: '玉珏图',
        items: [
          { label: '玉珏图', enName: 'Jade Chart', value: 'response_radial_bar_chart', thumbnail: radialBarThumb, supported: false },
        ],
      },
    ],
  },
  {
    key: 'relation',
    label: '关系分布',
    families: [
      {
        key: 'scatter',
        label: '散点图',
        items: [
          { label: '散点图', enName: 'Scatter Plot', value: 'response_scatter_chart', thumbnail: scatterThumb, supported: false },
        ],
      },
      {
        key: 'wordCloud',
        label: '词云图',
        items: [
          { label: '词云图', enName: 'Word Cloud', value: 'response_wordcloud_chart', thumbnail: wordcloudThumb, supported: false },
        ],
      },
    ],
  },
]

/** 扁平化的全部图表大类（跨分类） */
export const ALL_FAMILIES: ChartFamily[] = CHART_CATEGORIES.flatMap((c) => c.families)

/** 扁平化的全部图表类型 */
export const ALL_CHART_TYPES: ChartTypeItem[] = ALL_FAMILIES.flatMap((f) => f.items)

/** 已接入真实渲染的图表类型集合 */
export const SUPPORTED_RENDER_TYPES = new Set<string>(
  ALL_CHART_TYPES.filter((item) => item.supported).map((item) => item.value),
)

/** 根据 value 查找图表类型配置 */
export const getChartTypeItem = (value?: string): ChartTypeItem | undefined =>
  ALL_CHART_TYPES.find((item) => item.value === value)

/** 根据 value 查找其所属大类 */
export const getChartFamily = (value?: string): ChartFamily | undefined =>
  ALL_FAMILIES.find((f) => f.items.some((i) => i.value === value))

/** 根据 value 查找其所属一级分类 */
export const getChartCategory = (value?: string): ChartCategory | undefined =>
  CHART_CATEGORIES.find((c) => c.families.some((f) => f.items.some((i) => i.value === value)))
