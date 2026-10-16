/**
 * 图表数据处理与 ECharts option 构建（主对话 ViewEle 使用）
 * 自 ViewEle 内联逻辑原样抽出，行为保持一致；样式参数（字体/配色）可覆盖，默认取 ViewEle 初始值。
 */
import type { EChartsOption } from 'echarts'

import { calculateRotation, isSingleMetricData } from '@/utils'

export interface ChartOptionStyle {
  font: string
  fontSize: number
  /** 逗号分隔的系列配色 */
  color: string
  textColor: string
  /** 横向滚动时同屏可视的类目数；缺省 10（主对话）。窄面板（悬浮窗）可调小以降低标签拥挤 */
  visibleCount?: number
}

/** 与 ViewEle chartConfig 初始状态一致的默认样式 */
export const DEFAULT_CHART_STYLE: ChartOptionStyle = {
  font: 'Arial',
  fontSize: 12,
  color: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878',
  textColor: '#333333',
}

// 图表 tooltip 系列色块
const tooltipHtml = (color: any) =>
  `<span style="display:inline-block; width:0.5rem; height:0.5rem; border-radius:50%; background-color:${color}; margin-right:0.3125rem;"></span>`

// 解析 ISO 8601 时长（P..T.. 格式）为 HH:mm:ss
export const parseISO8601Duration = (duration: string): string => {
  if (typeof duration !== 'string') return duration

  const match = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!match) return duration

  const days = parseInt(match[1] || '0', 10)
  const hours = parseInt(match[2] || '0', 10)
  const minutes = parseInt(match[3] || '0', 10)
  const seconds = Math.floor(parseFloat(match[4] || '0'))

  const totalHours = days * 24 + hours
  const hh = String(totalHours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}

// 解析 ISO 日期格式：去掉时间部分
export const parseISODate = (dateStr: string): string => {
  if (typeof dateStr !== 'string') return dateStr

  if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return dateStr.split('T')[0]
  }

  return dateStr
}

/** 从查询结果行数组推断 x 轴/系列字段，产出 xData/yData */
export const processChartData = (data: any[]) => {
  if (!data || !data.length) return { xField: '', xData: [], yFields: [], yData: [] }

  // 判断数据格式是单指标还是多指标
  const isSingle = isSingleMetricData(data)

  // 获取第一条数据的所有键
  const keys = Object.keys(data[0])

  // 特殊处理：如果只有一条数据且只有一个数值字段，将其作为 yField
  if (data.length === 1 && keys.length === 1) {
    const singleKey = keys[0]
    const singleValue = data[0][singleKey]

    const isNumeric =
      typeof singleValue === 'number' || (!isNaN(parseFloat(singleValue)) && isFinite(parseFloat(singleValue)))

    if (isNumeric) {
      return {
        xField: '',
        xData: [],
        yFields: [singleKey],
        yData: [[typeof singleValue === 'number' ? singleValue : parseFloat(singleValue)]],
      }
    }
  }

  // 获取 x 轴字段
  let xField = ''
  const dateField = keys.find(
    (key) =>
      key.includes('日期') ||
      key.includes('date') ||
      key.includes('时间') ||
      key.includes('time') ||
      /^\d{4}-\d{2}-\d{2}/.test(data[0][key]),
  )

  if (dateField) {
    xField = dateField
  } else {
    xField =
      keys.find(
        (key) =>
          key.includes('名称') ||
          key.includes('name') ||
          key.includes('产品') ||
          key.includes('商品') ||
          key.includes('部门') ||
          key.includes('站'),
      ) || keys[0] // 如果找不到默认使用第一个字段作为 xField
  }

  // 获取 y 轴字段：自动识别所有包含数字的字段
  const yFields = keys.filter((key) => {
    // 排除已经被识别为x轴的字段
    if (key === xField) return false

    const value = data[0][key]

    // 如果是纯数字类型，直接认为是Y轴字段
    if (typeof value === 'number') return true

    // 如果是字符串，需要进一步判断
    if (typeof value === 'string') {
      // 排除日期时间格式的字符串
      if (
        /^\d{4}-\d{2}-\d{2}/.test(value) ||
        key.includes('日期') ||
        key.includes('date') ||
        key.includes('时间') ||
        key.includes('time')
      ) {
        return false
      }

      // 检查是否为纯数字字符串
      const numValue = parseFloat(value)
      return !isNaN(numValue) && isFinite(numValue) && numValue === Number(value.trim())
    }

    return false
  })

  // 处理 yData，根据 yFields 获取对应的数据
  const yData = yFields.map((field) => {
    return data.map((item) => {
      const value = item[field]
      return typeof value === 'number' ? value : parseFloat(value) || 0 // 转换为数值，如果是 NaN 则设为 0
    })
  })

  // 获取 xData，并转换ISO 8601时间格式
  const xData = data.map((item) => {
    const value = item[xField] || ''
    if (typeof value === 'string' && value.match(/^P(?:\d+D)?T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/)) {
      return parseISO8601Duration(value)
    }
    return value
  })

  return { xField, yFields, xData, yData }
}

/** 按图表类型构建 ECharts option；style 缺省使用 DEFAULT_CHART_STYLE */
export const getChartOption = (type: string, data: any[], style: ChartOptionStyle = DEFAULT_CHART_STYLE): EChartsOption => {
  const { xField, yFields = [], xData = [], yData = [] }: any = processChartData(data) || {}

  const isDateAxis = Array.isArray(xData) && xData.some((x: any) => /^\d{4}-\d{2}-\d{2}/.test(x))

  // 处理单数值情况：如果 xData 为空，使用字段名作为 X 轴标签
  const finalXData = Array.isArray(xData) && xData.length > 0 ? xData : yFields || []

  // 计算x轴标签的旋转角度
  const rotation = isDateAxis ? 30 : calculateRotation(finalXData)

  const { font, fontSize, color, textColor } = style

  // 仅当数据超过可视数量时才需要横向滚动条，避免未溢出也显示
  const visibleCount = style.visibleCount ?? 10
  const needZoom = finalXData.length > visibleCount

  // 根据图表类型计算Y轴最大值
  const calculateYAxisMax = (chartType: string) => {
    // 多指标图表：计算所有指标的最大值
    if (chartType === 'response_many_bar_chart' || chartType === 'response_many_line_chart') {
      const allValues = Array.isArray(yData) ? yData.flat().filter((v: any) => typeof v === 'number') : []
      return allValues.length > 0 ? Math.max(...allValues) : 0
    }
    // 单指标图表：只计算第一个指标的最大值
    const currentValues = Array.isArray(yData?.[0]) ? yData[0].filter((v: any) => typeof v === 'number') : []
    return currentValues.length > 0 ? Math.max(...currentValues) : 0
  }

  // 基础配置
  const baseOption: EChartsOption = {
    title: {
      show: false, // 禁用默认标题
    },
    color: color.split(','),
    textStyle: {
      fontFamily: font,
      fontSize,
      color: textColor,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: needZoom ? 34 : 8, // 有滚动条时预留底部空间，避免与 X 轴标签重叠（标签由 containLabel 自动容纳）
      containLabel: true,
    },
    // 横向滚动条：仅在数据超出可视范围时显示，避免未溢出也出现滚动条
    dataZoom: needZoom
      ? [
          {
            type: 'slider',
            show: true,
            xAxisIndex: 0,
            start: 0,
            end: Math.min(100, (visibleCount / finalXData.length) * 100), // 默认显示前10个数据点
            bottom: 4, // 贴近底部，位于 X 轴标签下方
            height: 14, // 滚动条高度
            handleSize: '100%', // 手柄大小设为100%，覆盖整个蓝色区域
            handleStyle: {
              color: 'rgba(24, 144, 255, 0.8)', // 手柄颜色与填充色相同
              borderColor: 'transparent', // 隐藏手柄边框
              borderWidth: 0,
            },
            showDetail: false, // 隐藏详细信息
            showDataShadow: false, // 隐藏数据阴影
            borderColor: 'transparent', // 隐藏边框
            fillerColor: 'rgba(24, 144, 255, 0.8)', // 深蓝色填充
            backgroundColor: 'transparent', // 背景透明
            moveHandleSize: 0, // 禁用移动手柄
            zoomLock: true, // 锁定缩放，只允许平移
            brushSelect: false, // 禁用框选缩放
            preventDefaultMouseMove: false, // 禁用默认鼠标移动行为
          },
        ]
      : [],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (Array.isArray(params) && params[0]) {
          const value = params[0].value
          const name = params[0].name
          if (isDateAxis) {
            const date = new Date(name)
            if (date.toString() !== 'Invalid Date') {
              return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日<br/>${yFields?.[0] || ''}: ${value}`
            }
          }

          let tooltipContent = ''
          params.forEach((param: any) => {
            const value = param.value
            const seriesName = param.seriesName
            const color = param.color
            tooltipContent += `<span>${tooltipHtml(color)}${seriesName}: ${value}</span><br/>`
          })
          return tooltipContent
        }
        return ''
      },
    },
    // 添加图例配置
    legend: {
      show: true, // 设置为true显示图例
      left: '4%', // 向右移动图例
      top: '5%', // 向下调整图例位置
      data: yFields, // 图例展示的系列名，可以根据需要动态修改
      textStyle: {
        color: textColor, // 设置图例文字的颜色
        fontFamily: font,
        fontSize,
      },
      itemWidth: 8, // 图例标志的宽度
      itemHeight: 8, // 图例标志的高度
    },
    xAxis: {
      type: 'category' as const,
      data: finalXData, // 统一使用 finalXData
      axisLabel: {
        interval: 0, // 显示所有标签
        rotate: rotation,
        overflow: 'break', // 文字过长时换行
        formatter: isDateAxis
          ? (value: string) => {
              const date = new Date(value)
              if (date.toString() !== 'Invalid Date') {
                return `${date.getMonth() + 1}月${date.getDate()}日`
              }
              return value
            }
          : undefined,
        fontFamily: font,
        fontSize,
        color: textColor,
      },
    },
    yAxis: {
      type: 'value' as const,
      scale: false, // 不自动缩放，确保滚动时纵轴不变
      min: 0, // 从0开始
      max: calculateYAxisMax(type), // 根据图表类型动态计算最大值
      nameTextStyle: {
        fontFamily: font,
        fontSize,
        color: textColor,
      },
      axisLabel: {
        fontFamily: font,
        fontSize,
        color: textColor,
      },
    },
  }

  switch (type) {
    case 'response_bar_chart':
      return {
        ...baseOption,
        series: [
          {
            type: 'bar',
            name: yFields?.[0] || '',
            data: yData?.[0] || [],
            barMaxWidth: 50,
            barGap: '30%',
          },
        ],
      }

    case 'response_line_chart':
      return {
        ...baseOption,
        series: [
          {
            type: 'line',
            name: yFields?.[0] || '',
            data: yData?.[0] || [],
            smooth: true,
          },
        ],
      }

    case 'response_area_chart':
      return {
        ...baseOption,
        series: [
          {
            type: 'line',
            name: yFields?.[0] || '', // 只取第一个指标
            data: yData?.[0] || [], // 对应yData中的第一个数组
            smooth: true,
            areaStyle: {
              opacity: 0.3,
            },
          },
        ],
      }

    case 'response_pie_chart': {
      // 处理饼图数据：支持单数值和多分类数据
      let pieData: any[] = []

      if (Array.isArray(xData) && xData.length > 0 && Array.isArray(yData?.[0])) {
        // 正常的多分类数据
        pieData = xData.map((item: any, index: any) => ({
          name: item,
          value: yData[0][index],
        }))
      } else if (Array.isArray(yData?.[0]) && yData[0].length > 0) {
        // 单数值数据：显示为一个完整的圆
        pieData = [
          {
            name: yFields?.[0] || '数值',
            value: yData[0][0],
          },
        ]
      }
      // 双数值字段的特殊处理：当 xData 为空 yFields 有多个数值字段时
      if (pieData.length === 0 && yFields.length >= 2 && Array.isArray(yData) && yData.length >= 2) {
        pieData = yData[0].map((_: any, index: number) => ({
          name: String(yData[0][index]),
          value: yData[1][index],
        }))
      }

      const option: EChartsOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}',
        },
        legend: {
          show: false, // 禁用内置图例，使用自定义图例
        },
        series: [
          {
            type: 'pie',
            radius: '80%',
            center: ['50%', '50%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              show: pieData.length === 1, // 单数值时显示标签
              position: 'center',
              formatter: '{b}\n{c}',
              fontSize: 16,
              color: textColor,
            },
          },
        ],
      }
      return option
    }

    case 'response_donut_chart': {
      // 处理环形图数据：支持单数值和多分类数据
      let donutData: any[] = []

      if (Array.isArray(xData) && xData.length > 0 && Array.isArray(yData?.[0])) {
        // 正常的多分类数据
        donutData = xData.map((item: any, index: any) => ({
          name: item,
          value: yData[0][index],
        }))
      } else if (Array.isArray(yData?.[0]) && yData[0].length > 0) {
        // 单数值数据：显示为一个完整的环
        donutData = [
          {
            name: yFields?.[0] || '数值',
            value: yData[0][0],
          },
        ]
      }
      // 双数值字段的特殊处理：当 xData 为空 yFields 有多个数值字段时
      if (donutData.length === 0 && yFields.length >= 2 && Array.isArray(yData) && yData.length >= 2) {
        donutData = yData[0].map((_: any, index: number) => ({
          name: String(yData[0][index]),
          value: yData[1][index],
        }))
      }

      const option: EChartsOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}',
        },
        legend: {
          show: false, // 禁用内置图例，使用自定义图例
        },
        series: [
          {
            type: 'pie',
            radius: ['40%', '80%'],
            center: ['50%', '50%'],
            data: donutData,
            label: {
              show: donutData.length === 1, // 单数值时显示标签
              position: 'center',
              formatter: '{b}\n{c}',
              fontSize: 16,
              color: textColor,
            },
          },
        ],
      }
      return option
    }

    // **多指标柱状图**
    case 'response_many_bar_chart':
      return {
        ...baseOption,
        series: Array.isArray(yFields)
          ? yFields.map((field: any, index: any) => ({
              type: 'bar',
              name: field, // 指标名
              data: yData?.[index] || [], // 对应指标的数据
              barMaxWidth: 50,
              barGap: '30%',
              emphasis: {
                focus: 'series',
              },
            }))
          : [],
      }

    // **多指标折线图**
    case 'response_many_line_chart':
      return {
        ...baseOption,
        series: Array.isArray(yFields)
          ? yFields.map((field: any, index: any) => ({
              type: 'line',
              name: field,
              data: yData?.[index] || [],
              smooth: true,
              emphasis: {
                focus: 'series',
              },
            }))
          : [],
      }

    default:
      return baseOption
  }
}
