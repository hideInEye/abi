import { useLayoutEffect, useRef, useState } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ConfigProvider, Table, message as antdMessage } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'

import HumanEle from '../conversation/HumanEle'
import AiEle from '../conversation/AiEle'
import convStyles from '../conversation/index.module.css'
import viewStyles from '../conversation/styles.module.css'
import { parseISO8601Duration, parseISODate } from '../conversation/helpers/chartOption'
import { LazyFeatureFallback, RetryableLazy } from '../performance/RetryableLazy'
import type { WidgetChart, WidgetMessage } from './history'

const loadWidgetChartVisualization = () => import('./WidgetChartVisualization')
const loadWidgetSqlView = () => import('./WidgetSqlView')
const loadChartHeader = () => import('../conversation/components/ChartHeader')
const loadStatisticsAnalysis = () => import('../conversation/components/StatisticsAnalysis')
const loadAttributionDashboard = () => import('../conversation/components/AttributionDashboard')
const loadPredictionAnalysis = () => import('../conversation/components/PredictionAnalysis')
const loadCausalAnalysis = () => import('../conversation/components/CausalAnalysis')

interface WidgetInteractionMessageProps {
  index: number
  message: WidgetMessage
  onChartTypeChange: (index: number, type: string) => void
  onFeedback: (index: number, current: number, status: 1 | -1) => void
  onOpenSchema: (schemaId: string | number, name: string) => void
  onLayout?: () => void
}

const stripHtmlTags = (value: string): string => value.replace(/<[^>]*>/g, '')

const ChartCard = ({ chart, onTypeChange }: { chart: WidgetChart; onTypeChange: (type: string) => void }) => {
  const [activeType, setActiveType] = useState<'chart' | 'table' | 'sql'>(chart.tableView ? 'table' : 'chart')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const echartRef = useRef<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const hasData = Array.isArray(chart.data) && chart.data.length > 0

  const handleExport = async (key: string) => {
    if (!hasData) {
      antdMessage.warning('暂无数据可导出')
      return
    }
    try {
      if (key === 'csv' || key === 'excel') {
        const rows = chart.data || []
        const keys = Object.keys(rows[0] || {})
        const csv = [keys.join(','), ...rows.map((row: any) => keys.map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${chart.title || '数据'}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
        return
      }
      if (!['table', 'chart'].includes(activeType)) {
        antdMessage.warning('请切换到表格或图表再点击进行下载图片')
        return
      }
      const { handleImageExport } = await import('../conversation/helpers/download')
      await handleImageExport(activeType as 'table' | 'chart', activeType === 'table' ? tableRef : echartRef, chart.title || '数据')
    } catch (error: any) {
      antdMessage.error(error?.message || '文件导出失败，请重试')
    }
  }

  const renderContent = () => {
    if (activeType !== 'sql' && !hasData) {
      return (
        <div className="flex items-center justify-center py-8">
          <span style={{ fontSize: '12px', color: '#999' }}>暂无数据</span>
        </div>
      )
    }

    if (activeType === 'chart') {
      return (
        <RetryableLazy
          loader={loadWidgetChartVisualization}
          componentProps={{ chart, chartRef: echartRef }}
          fallback={<LazyFeatureFallback label="正在加载图表…" style={{ height: '12rem' }} />}
        />
      )
    }

    if (activeType === 'table') {
      const tableRows = chart.data || []
      const tableKeys = Object.keys(tableRows[0] || {})
      const isFewCols = tableKeys.length > 0 && tableKeys.length <= 4
      const isNumericColumn = (key: string) => tableRows.slice(0, 20).every((row: Record<string, any>) => {
        const value = row?.[key]
        if (value === null || value === undefined || value === '') return true
        return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
      })
      const measureTextWidth = (value: string) => [...String(value)].reduce((width, character) => width + (character.charCodeAt(0) > 255 ? 14 : 8), 0)
      const estimateColWidth = (key: string) => {
        let maxWidth = measureTextWidth(key) + 16
        tableRows.slice(0, 30).forEach((row: Record<string, any>) => {
          maxWidth = Math.max(maxWidth, measureTextWidth(String(row?.[key] ?? '')))
        })
        return Math.min(320, Math.max(96, maxWidth + 28))
      }
      const columns = tableKeys.map((key, columnIndex) => {
        const isDeltaColumn = /变化量|变化率/.test(key)
        const numeric = isNumericColumn(key)
        return {
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
          align: isFewCols ? (numeric ? 'right' : 'left') : columnIndex <= 1 ? 'left' : 'center',
          width: isFewCols ? estimateColWidth(key) : columnIndex === 0 ? 90 : undefined,
          render: (text: any) => {
            let displayText = text
            if (typeof displayText === 'string') {
              if (/^P(?:\d+D)?T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/.test(displayText)) displayText = parseISO8601Duration(displayText)
              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(displayText)) displayText = parseISODate(displayText)
            }
            return <span className={isDeltaColumn ? viewStyles.deltaValue : viewStyles.tableCellValue}>{displayText}</span>
          },
        }
      })
      if (isFewCols) {
        columns.push({ title: '', dataIndex: '__filler__', key: '__filler__', ellipsis: true, align: 'left', width: undefined, render: () => null } as any)
      }

      return (
        <div ref={tableRef} className="px-1 pb-2">
          <ConfigProvider locale={zhCN}>
            <Table
              dataSource={tableRows.map((item: Record<string, any>, index: number) => ({ ...item, key: index }))}
              columns={columns as any}
              pagination={{
                current: currentPage,
                pageSize,
                total: tableRows.length,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: (page: number, nextPageSize: number) => {
                  setCurrentPage(nextPageSize === pageSize ? page : 1)
                  setPageSize(nextPageSize)
                },
                showTotal: (total: number) => `共 ${total} 条`,
              }}
              scroll={isFewCols ? undefined : { x: 'max-content' }}
              className={viewStyles.viewTable}
            />
          </ConfigProvider>
        </div>
      )
    }

    return (
      <RetryableLazy
        loader={loadWidgetSqlView}
        componentProps={{ sql: chart.sql }}
        fallback={<LazyFeatureFallback label="正在加载 SQL 查看器…" style={{ height: 240 }} />}
      />
    )
  }

  return (
    <div className="w-full text-left">
      <div className="section-header pt-3 pb-3">
        <span className="chart-header-title font-semibold text-[#2d2d2d]">图表信息</span>
      </div>
      <div className="pt-3">
        <RetryableLazy
          loader={loadChartHeader}
          componentProps={{
            onTypeChange: (type: string) => setActiveType(type as 'chart' | 'table' | 'sql'),
            onShareClick: () => {},
            onConfigClick: () => {},
            onDebugClick: () => {},
            onFullscreenClick: () => {},
            onDataFetched: () => {},
            onExportClick: (key: string) => void handleExport(key),
            onhandleGetChartType: onTypeChange,
            showChartIcon: true,
            chartType: chart.type,
            activeType,
            currentTableData: chart.data || [],
            showTitle: false,
            hideTools: true,
          }}
          fallback={<LazyFeatureFallback label="正在加载图表工具…" style={{ height: 40 }} />}
        />
        <div className="mt-3" style={activeType === 'chart' || !hasData ? { background: '#F2F3F5', borderRadius: '8px', padding: '12px' } : undefined}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

/** 普通交互消息的重型渲染边界：Markdown、澄清组件、表格和图表只在存在消息时下载。 */
export default function WidgetInteractionMessage({
  index,
  message,
  onChartTypeChange,
  onFeedback,
  onOpenSchema,
  onLayout,
}: WidgetInteractionMessageProps) {
  useLayoutEffect(() => {
    onLayout?.()
  }, [onLayout, message.semanticGroup, message.semanticName])

  if (message.role === 'human') {
    return (
      <div className="abi-cw-msg abi-cw-msg-human">
        <HumanEle data={{ context: message.content }} />
      </div>
    )
  }

  const displayText = message.streaming ? '' : stripHtmlTags(message.content || '')
  return (
    <div className="abi-cw-msg abi-cw-msg-ai">
      <div className="w-full rounded-[1.25rem] border border-[#e9edf4] bg-white px-[0.875rem] pt-[0.75rem] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.04)]">
        {(message.semanticGroup || message.semanticName) && (
          <div className="abi-cw-infobar">
            <span className="abi-cw-infobar-label">分组：</span>
            <span className="abi-cw-infobar-chip abi-cw-infobar-chip-group">
              <i className="abi-cw-infobar-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 6px rgba(139,92,246,0.5)' }} />
              <span className="abi-cw-infobar-chip-text">{message.semanticGroup || '无'}</span>
            </span>
            <span className="abi-cw-infobar-label" style={{ marginLeft: '2em' }}>数据语义：</span>
            <span
              className={`abi-cw-infobar-chip abi-cw-infobar-chip-sem${message.semanticSchemaId != null ? ' clickable' : ''}`}
              onClick={message.semanticSchemaId != null ? () => onOpenSchema(message.semanticSchemaId as number | string, message.semanticName || '') : undefined}
            >
              <i className="abi-cw-infobar-dot" style={{ background: '#5b7cf7', boxShadow: '0 0 6px rgba(91,124,247,0.5)' }} />
              <span className="abi-cw-infobar-chip-text">{message.semanticName || '无'}</span>
            </span>
          </div>
        )}
        {(message.thinking || message.streaming) && (
          <AiEle
            data={{
              context: message.thinking ? `<think>${message.thinking}</think>` : '',
              smLoading: message.streaming,
              order: index,
            }}
            loading={message.streaming}
            isDone={!message.streaming}
            thinkTime={message.thinkTime}
            compact
          />
        )}
        {displayText && (
          <>
            <div className="section-header mt-2 pt-3 pb-3 px-2.5">
              <span className="chart-header-title font-semibold text-[#2d2d2d]">描述分析</span>
            </div>
            <div className={`${convStyles['markdown-content']} abi-cw-desc text-left px-2.5`} style={{ width: '100%', fontSize: '13px', lineHeight: 1.75 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
            </div>
          </>
        )}
        {message.chartLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#8494ad]">
            <div className="abi-cw-spinner" />
            <span>图表数据加载中...</span>
          </div>
        )}
        {!message.streaming && message.chart?.chatMode === 'chat_with_analysis' && message.chart?.raw && (() => {
          const data = message.chart!.raw
          const hasAnalysis = Array.isArray(data.dimension_table) && Array.isArray(data.factor_table) && data.metric_overview
          if (hasAnalysis) {
            return (
              <RetryableLazy
                loader={loadAttributionDashboard}
                componentProps={{ data, compact: true }}
                fallback={<LazyFeatureFallback label="正在加载归因分析…" style={{ height: 280 }} />}
              />
            )
          }
          if (data.total_df || data.analysis_response) {
            return (
              <RetryableLazy
                loader={loadCausalAnalysis}
                componentProps={{ data }}
                fallback={<LazyFeatureFallback label="正在加载因果分析…" style={{ height: 280 }} />}
              />
            )
          }
          return null
        })()}
        {!message.streaming && message.chart?.chatMode === 'chat_with_predict' && message.chart?.raw && (
          <div className="flex" style={{ width: '100%' }}>
            <div className="rounded bg-white px-2.5" style={{ width: '100%' }}>
              <RetryableLazy
                loader={loadPredictionAnalysis}
                componentProps={{ data: message.chart.raw, compact: true }}
                fallback={<LazyFeatureFallback label="正在加载预测分析…" style={{ height: 280 }} />}
              />
            </div>
          </div>
        )}
        {!message.streaming && message.chart && message.chart.chatMode !== 'chat_with_analysis' && message.chart.chatMode !== 'chat_with_predict' && (message.chart.data.length > 0 || !!message.chart.sql) && (
          <div className="px-2.5">
            <ChartCard chart={message.chart} onTypeChange={(type) => onChartTypeChange(index, type)} />
          </div>
        )}
        {!message.streaming && (
          <RetryableLazy
            loader={loadStatisticsAnalysis}
            componentProps={{
              chatMode: 'chat_with_analysis',
              feedback: message.feedback ?? 0,
              content: message.content,
              onVoteChange: (payload: any) => onFeedback(index, message.feedback || 0, payload?.status === -1 ? -1 : 1),
              onAttributionClick: () => {},
              onPredictClick: () => {},
            }}
            fallback={<LazyFeatureFallback label="正在加载消息操作…" style={{ height: 48 }} />}
          />
        )}
      </div>
    </div>
  )
}
