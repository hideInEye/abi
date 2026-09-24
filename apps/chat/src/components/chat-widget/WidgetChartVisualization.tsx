import type { MutableRefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import PieLegend from '../PieLegend'
import { EChart } from '../react-echarts'
import { SUPPORTED_RENDER_TYPES, getChartTypeItem } from '../conversation/components/chartTypeCatalog'
import { getChartOption } from '../conversation/helpers/chartOption'
import viewStyles from '../conversation/styles.module.css'

interface WidgetChartVisualizationProps {
  chart: {
    data: any[]
    type: string
  }
  chartRef: MutableRefObject<any>
}

const CHART_CONFIG = {
  font: 'Arial',
  fontSize: 12,
  chartStyle: { color: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878', textColor: '#333333' },
}

export default function WidgetChartVisualization({ chart, chartRef }: WidgetChartVisualizationProps) {
  const [isChartHovered, setIsChartHovered] = useState(false)
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const option = useMemo(
    () => getChartOption(chart.type, chart.data, {
      font: CHART_CONFIG.font,
      fontSize: CHART_CONFIG.fontSize,
      color: CHART_CONFIG.chartStyle.color,
      textColor: CHART_CONFIG.chartStyle.textColor,
    }),
    [chart.data, chart.type],
  )

  useEffect(() => {
    const element = chartWrapRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(element)
    return () => observer.disconnect()
  }, [chartRef])

  if (!SUPPORTED_RENDER_TYPES.has(chart.type)) {
    const item = getChartTypeItem(chart.type)
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        {item?.thumbnail && <img src={item.thumbnail} alt={item.label} className="mb-3 w-40 opacity-60" />}
        <div className="text-sm text-[#666]">「{item?.label || '该图表'}」即将支持</div>
        <div className="mt-1 text-xs text-[#999]">当前版本暂未接入该图表渲染，可切换其他图表类型或查看数据表格</div>
      </div>
    )
  }

  const isPieOrDonut = chart.type === 'response_pie_chart' || chart.type === 'response_donut_chart'
  const pieSeriesData: any[] = isPieOrDonut ? ((option as any).series?.[0]?.data || []) : []
  const colors = CHART_CONFIG.chartStyle.color.split(',')
  const legendData = pieSeriesData.map((item: any, index: number) => ({
    name: String(item.name),
    value: item.value,
    color: colors[index % colors.length],
  }))

  return (
    <div
      ref={chartWrapRef}
      className={`${viewStyles.chartContainer} ${isChartHovered ? viewStyles.chartContainerHovered : ''}`}
      onMouseEnter={() => setIsChartHovered(true)}
      onMouseLeave={() => setIsChartHovered(false)}
    >
      {isPieOrDonut && legendData.length > 0 && (
        <PieLegend
          data={legendData}
          maxRows={3}
          fontSize={CHART_CONFIG.fontSize}
          resetKey={chart.type + (chart.data?.length ?? 0)}
          onItemClick={(name: string) => {
            chartRef.current?.getInstance()?.dispatchAction({ type: 'legendToggleSelect', name })
          }}
        />
      )}
      <EChart ref={chartRef} option={option} style={{ height: '16rem', width: '100%' }} autoResize handleClick={() => {}} />
    </div>
  )
}
