import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ConfigProvider, Popover, Table, Typography, message as antdMessage } from 'antd'
import { ApiOutlined, CheckOutlined, EyeOutlined, RightOutlined, SearchOutlined, ToolOutlined } from '@ant-design/icons'
import zhCN from 'antd/es/locale/zh_CN'
import { format as formatSql } from 'sql-formatter'
// @ts-ignore - react-syntax-highlighter 类型定义问题
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// @ts-ignore
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

/* 渲染层直接复用主对话组件（开场白/用户气泡/思考卡/图表工具栏/反馈行），仅数据层走分享 token 链路 */
import HumanEle from '../conversation/HumanEle'
import AiEle from '../conversation/AiEle'
import OpeningsEle from '../conversation/OpeningsEle'
import ChartHeader from '../conversation/components/ChartHeader'
import StatisticsAnalysis from '../conversation/components/StatisticsAnalysis'
import AttributionDashboard from '../conversation/components/AttributionDashboard'
import PredictionAnalysis from '../conversation/components/PredictionAnalysis'
import CausalAnalysis from '../conversation/components/CausalAnalysis'
import { SUPPORTED_RENDER_TYPES, getChartTypeItem } from '../conversation/components/chartTypeCatalog'
import convStyles from '../conversation/index.module.css'
import viewStyles from '../conversation/styles.module.css'
import { getChartOption, parseISO8601Duration, parseISODate } from '../conversation/helpers/chartOption'
import { handleImageExport } from '../conversation/helpers/download'
import PieLegend from '../PieLegend'
import { EChart } from '../react-echarts'
import SchemaFieldsModal, { parseSchemaFieldsFromModelDetail } from '../conversation-analysis/SchemaFieldsModal'
import type { SchemaTable } from '../conversation-analysis/SchemaFieldsModal'
/* 探索/报告：直接复用主对话 hook 与渲染组件，仅通过 authorization 注入分享 token（依赖注入，不影响主对话） */
import { useExploreConversation } from '../conversation/exploration-mode/useExploreConversation'
import ExploreMessageRow from '../conversation/exploration-mode/ExploreMessageRow'
import ExplorePreviewPane from '../conversation/exploration-mode/ExplorePreviewPane'
import type { ExploreItem } from '../conversation/exploration-mode/types'
import { useReportConversation } from '../conversation/report-mode/useReportConversation'
import ReportMessageRow from '../conversation/report-mode/ReportMessageRow'
import ReportPreviewPane from '../conversation/report-mode/ReportPreviewPane'
import type { ReportHistoryRoundGroup, ReportItem } from '../conversation/report-mode/types'
import type { ReportSourceVersionFields } from '../../service/api/report'
import { parseViewChart, type WidgetChart, WidgetMessage } from './history'
import {
  checkSharePassword,
  ensureSession,
  fetchAssistantInfo,
  fetchChartDataBySql,
  fetchHistory,
  fetchMaxRound,
  fetchSemanticDetail,
  fetchViewContextByRound,
  parseAiRaw,
  sendChatStream,
  submitFeedback,
  type ProjectType,
  type WidgetAssistantInfo,
  type WidgetSemanticNode,
  type WidgetSemanticSelection,
  type WidgetSession,
} from './service'
import type { AssistantBoundMcp, AssistantBoundSkill } from '../../pages/chat/workshop/assistantResources'
import './index.css'

export interface ChatWidgetProps {
  /** 分享码（免登录凭证） */
  shareCode: string
  /** 网关前缀，空串表示同源 */
  apiBase: string
  /** page：分享路由页整页面板；float：第三方嵌入右侧悬浮面板 */
  mode?: 'page' | 'float'
  /** 外层（分享页）已完成校验并拿到 appId 时传入，跳过 widget 内部校验/密码表单 */
  verifiedAppId?: string
  /** 外层校验时后端返回的项目类型（自主助手=react / 工作流助手=workflow），随 verifiedAppId 透传 */
  verifiedType?: ProjectType
  /** 外层分享校验通过后后端下发的临时 token，后续接口随 Authorization 携带 */
  verifiedToken?: string
  /** float 形态下的关闭回调 */
  onClose?: () => void
}

type Phase = 'checking' | 'password' | 'loading' | 'ready' | 'error'

/** 输入工具栏对话模式（标签同主对话，三模式各自对接发送协议与渲染） */
type WidgetChatMode = 'interact' | 'report' | 'explore'

/* 模式展示顺序对齐主对话 chat-input modeMenuItems：交互 / 探索 / 报告 */
const WIDGET_MODES: Array<{ key: WidgetChatMode; label: string; desc: string }> = [
  { key: 'interact', label: '交互', desc: '敏捷问数，基础分析' },
  { key: 'explore', label: '探索', desc: '自主规划，复杂分析' },
  { key: 'report', label: '报告', desc: '深度挖掘，智能洞察' },
]

function getNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── AI 消息 Markdown 渲染（对齐主对话 ViewEle 管线）── */
/** 剥离 AI 回复中的残留 HTML 标签（think 段与尾部结构化 JSON 已由 parseAiRaw 剥离） */
const stripHtmlTags = (s: string): string => s.replace(/<[^>]*>/g, '')

/** 图表类型白名单（与主对话 ViewEle 一致）：仅白名单内类型参与渲染与切换 */
const WIDGET_CHART_TYPES: Array<{ value: string; label: string }> = [
  { value: 'response_bar_chart', label: '柱状图' },
  { value: 'response_line_chart', label: '折线图' },
  { value: 'response_area_chart', label: '面积图' },
  { value: 'response_pie_chart', label: '饼图' },
  { value: 'response_donut_chart', label: '圆环图' },
  { value: 'response_many_bar_chart', label: '多指标柱状图' },
  { value: 'response_many_line_chart', label: '多指标折线图' },
]

const isValidChartType = (t: unknown): boolean =>
  typeof t === 'string' && WIDGET_CHART_TYPES.some((i) => i.value === t)

/** 流内/查数 JSON 的语义元信息 → 消息信息条字段（同主对话 extractSemanticMeta 口径）；schemaId 供 chip 点击开 Schema 抽屉 */
const semanticMetaOf = (json: any): Pick<WidgetMessage, 'semanticGroup' | 'semanticName' | 'semanticSchemaId'> => ({
  semanticGroup: typeof json?.semantic_group_name === 'string' && json.semantic_group_name.trim() ? json.semantic_group_name : undefined,
  semanticName: typeof json?.semantic_name === 'string' && json.semantic_name.trim() ? json.semantic_name : undefined,
  semanticSchemaId: json?.semantic_id != null && json.semantic_id !== '' ? json.semantic_id : undefined,
})

/* ── 内联图标（不依赖 antd，与大屏 AiChatPanel 同款 feather 线稿） ── */
const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const IconDatabase = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
)

const IconFolder = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IconFolderOpen = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
)

const IconFile = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const IconChevronRight = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconArrowDown = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/* 头部放大/缩小（SVG 路径同归因分析 AttributionDashboard 全屏按钮） */
const IconExpand = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
)

const IconCompress = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
)

/* 输入工具栏图标（feather 线稿：对话/文档/指南针=三模式，灯泡=思考，眼睛=查看语义，闪电=技能，服务器=MCP） */
const IconMessage = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconFileText = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const IconCompass = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
)

const IconBulb = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
)

const WIDGET_MODE_ICONS: Record<WidgetChatMode, React.ReactNode> = {
  interact: IconMessage,
  report: IconFileText,
  explore: IconCompass,
}

/* 探索/报告复用交互链路的默认模型 id（同 service.sendChatStream：大模型 12 / 嵌入模型 6） */
const WIDGET_CHAT_MODEL_ID = 12
const WIDGET_EMBED_MODEL_ID = 6

/* 分享场景不做历史恢复：模块级空数组保持引用稳定；内联 [] 每次渲染都是新引用，
   会触发报告 hook 的初始化 effect（依赖 historyRounds）重跑并清空实时报告项 */
const WIDGET_EMPTY_HISTORY_ROUNDS: ReportHistoryRoundGroup[] = []

/** 统一时间线条目：交互消息 / 探索项 / 报告项按 sortKey（创建时间）合并排序 */
type WidgetTimelineEntry =
  | { key: string; sortKey: number; kind: 'interact'; index: number; message: WidgetMessage }
  | { key: string; sortKey: number; kind: 'explore'; item: ExploreItem }
  | { key: string; sortKey: number; kind: 'report'; report: ReportItem }

const { Text } = Typography

/* ── 图表区（同主对话 ViewEle 图表分支：小节头 + ChartHeader 工具栏 + 图/表/SQL 三视图） ── */
// 图表配置常量与主对话 ViewEle 默认值保持一致
const CHART_CONFIG = {
  font: 'Arial',
  fontSize: 12,
  chartStyle: { color: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878', textColor: '#333333' },
}

const ChartCard = ({ chart, onTypeChange }: { chart: WidgetChart; onTypeChange: (type: string) => void }) => {
  // 后端 response_table 默认落表格视图（同主对话 ViewEle：response_table → setActiveType('table')）
  const [activeType, setActiveType] = useState<'chart' | 'table' | 'sql'>(chart.tableView ? 'table' : 'chart')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isChartHovered, setIsChartHovered] = useState(false)
  const echartRef = useRef<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const chartWrapRef = useRef<HTMLDivElement>(null)

  // 面板拖拽改宽不触发 window resize（EChart autoResize 仅监听 window）：观察图表容器宽度同步 echarts 尺寸
  useEffect(() => {
    const el = chartWrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => echartRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasData = Array.isArray(chart.data) && chart.data.length > 0
  const option = useMemo(
    () =>
      getChartOption(chart.type, chart.data, {
        font: CHART_CONFIG.font,
        fontSize: CHART_CONFIG.fontSize,
        color: CHART_CONFIG.chartStyle.color,
        textColor: CHART_CONFIG.chartStyle.textColor,
      }),
    [chart.type, chart.data],
  )

  // 导出：PNG 走客户端截图；csv/excel 在分享免登录场景无后端导出接口，用已有数据本地生成
  const handleExport = async (key: string) => {
    if (!hasData) {
      antdMessage.warning('暂无数据可导出')
      return
    }
    try {
      if (key === 'csv' || key === 'excel') {
        const rows = chart.data || []
        const keys = Object.keys(rows[0] || {})
        const csv = [keys.join(','), ...rows.map((r: any) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${chart.title || '数据'}.csv`
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      if (!['table', 'chart'].includes(activeType)) {
        antdMessage.warning('请切换到表格或图表再点击进行下载图片')
        return
      }
      await handleImageExport(activeType as 'table' | 'chart', activeType === 'table' ? tableRef : echartRef, chart.title || '数据')
    } catch (error: any) {
      antdMessage.error(error?.message || '文件导出失败，请重试')
    }
  }

  const renderVisualization = () => {
    // 未接入真实渲染的图表类型展示占位提示（同主对话）
    if (!SUPPORTED_RENDER_TYPES.has(chart.type)) {
      const item = getChartTypeItem(chart.type)
      return (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          {item?.thumbnail && <img src={item.thumbnail} alt={item.label} className="w-40 opacity-60 mb-3" />}
          <div className="text-sm text-[#666]">「{item?.label || '该图表'}」即将支持</div>
          <div className="text-xs text-[#999] mt-1">当前版本暂未接入该图表渲染，可切换其他图表类型或查看数据表格</div>
        </div>
      )
    }
    const isPieOrDonut = chart.type === 'response_pie_chart' || chart.type === 'response_donut_chart'
    const pieSeriesData: any[] = isPieOrDonut ? ((option as any).series?.[0]?.data || []) : []
    const colors = CHART_CONFIG.chartStyle.color.split(',')
    const legendData = pieSeriesData.map((item: any, i: number) => ({
      name: String(item.name),
      value: item.value,
      color: colors[i % colors.length],
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
              echartRef.current?.getInstance()?.dispatchAction({ type: 'legendToggleSelect', name })
            }}
          />
        )}
        <EChart ref={echartRef} option={option} style={{ height: '16rem', width: '100%' }} autoResize handleClick={() => {}} />
      </div>
    )
  }

  const renderContent = () => {
    if (activeType !== 'sql' && !hasData) {
      return (
        <div className="flex items-center justify-center py-8">
          <span style={{ fontSize: '12px', color: '#999' }}>暂无数据</span>
        </div>
      )
    }
    const paginationConfig = {
      current: currentPage,
      pageSize,
      total: (chart.data || []).length,
      showSizeChanger: true,
      pageSizeOptions: ['10', '20', '50', '100'],
      onChange: (page: number, newPageSize: number) => {
        setCurrentPage(page)
        if (newPageSize !== pageSize) {
          setPageSize(newPageSize)
          setCurrentPage(1)
        }
      },
      showTotal: (total: number) => `共 ${total} 条`,
    }
    if (activeType === 'chart') return renderVisualization()
    if (activeType === 'table') {
      const tableRows = chart.data || []
      const tableKeys = Object.keys(tableRows[0] || {})
      const isFewCols = tableKeys.length > 0 && tableKeys.length <= 4
      const isNumericColumn = (key: string) =>
        tableRows.slice(0, 20).every((row: Record<string, any>) => {
          const v = row?.[key]
          if (v === null || v === undefined || v === '') return true
          return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))
        })
      const measureTextWidth = (s: string) => {
        let w = 0
        for (const ch of String(s)) {
          w += ch.charCodeAt(0) > 255 ? 14 : 8
        }
        return w
      }
      const estimateColWidth = (key: string) => {
        let maxWidth = measureTextWidth(key) + 16
        tableRows.slice(0, 30).forEach((row: Record<string, any>) => {
          const w = measureTextWidth(String(row?.[key] ?? ''))
          if (w > maxWidth) maxWidth = w
        })
        return Math.min(320, Math.max(96, maxWidth + 28))
      }
      const tableColumns = tableKeys.map((key, columnIndex) => {
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
        tableColumns.push({ title: '', dataIndex: '__filler__', key: '__filler__', ellipsis: true, align: 'left', width: undefined, render: () => null } as any)
      }
      return (
        <div ref={tableRef} className="px-1 pb-2">
          <ConfigProvider locale={zhCN}>
            <Table
              dataSource={tableRows.map((item: Record<string, any>, index: number) => ({ ...item, key: index }))}
              columns={tableColumns as any}
              pagination={paginationConfig}
              scroll={isFewCols ? undefined : { x: 'max-content' }}
              className={viewStyles.viewTable}
            />
          </ConfigProvider>
        </div>
      )
    }
    // activeType === 'sql'
    const sqlText = chart.sql
    let displayText = sqlText || ''
    if (sqlText) {
      try {
        displayText = formatSql(sqlText, { language: 'sql', tabWidth: 2, keywordCase: 'upper', linesBetweenQueries: 2 })
      } catch {
        displayText = sqlText
      }
    }
    return (
      <div className={viewStyles.sqlCodeBlock}>
        <div className={viewStyles.sqlCodeBlockHeader}>
          <span>SQL</span>
          <Text copyable={{ text: displayText, tooltips: ['复制', '已复制'] }} />
        </div>
        {/* @ts-ignore */}
        <SyntaxHighlighter
          language="sql"
          style={oneLight}
          showLineNumbers
          customStyle={{ margin: 0, borderRadius: '0 0 10px 10px', fontSize: '0.8125rem', backgroundColor: 'transparent', padding: '12px 14px' }}
          codeTagProps={{ style: { fontFamily: 'Consolas, Monaco, "Courier New", monospace' } }}
        >
          {displayText || '暂无 SQL 语句'}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <div className="w-full text-left">
      <div className="section-header pt-3 pb-3">
        <span className="chart-header-title font-semibold text-[#2d2d2d]">图表信息</span>
      </div>
      <div className="pt-3">
        <ChartHeader
          onTypeChange={(t) => setActiveType(t as 'chart' | 'table' | 'sql')}
          onShareClick={() => {}}
          onConfigClick={() => {}}
          onDebugClick={() => {}}
          onFullscreenClick={() => {}}
          onDataFetched={() => {}}
          onExportClick={(key) => void handleExport(key)}
          onhandleGetChartType={onTypeChange}
          showChartIcon
          chartType={chart.type}
          activeType={activeType}
          currentTableData={chart.data || []}
          showTitle={false}
          hideTools
        />
        <div className="mt-3" style={activeType === 'chart' || !hasData ? { background: '#F2F3F5', borderRadius: '8px', padding: '12px' } : undefined}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

/** 助手分享对话悬浮框：无 store 依赖的纯组件，分享页与第三方嵌入共用；渲染层复用主对话组件 */
const ChatWidget = ({ shareCode, apiBase, mode = 'page', verifiedAppId, verifiedType, verifiedToken, onClose }: ChatWidgetProps) => {
  // 分享校验通过后的临时 token（外层传入或 widget 内部密码校验后写入），后续接口随 Authorization 携带
  const [shareToken, setShareToken] = useState(verifiedToken || '')
  const cfg = useMemo(() => ({ shareCode, apiBase, token: shareToken || undefined }), [shareCode, apiBase, shareToken])

  const [phase, setPhase] = useState<Phase>(verifiedAppId ? 'loading' : 'checking')
  const [appId, setAppId] = useState(verifiedAppId || '')
  const [info, setInfo] = useState<WidgetAssistantInfo | null>(null)
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  // 点赞点踩请求中的消息索引（防连点重复提交；-1 表示空闲）
  const [fbBusyIndex, setFbBusyIndex] = useState(-1)
  // 数据语义（助手绑定的语义叶子，随 getProjectInfo 一并下发）
  const [semanticTree, setSemanticTree] = useState<WidgetSemanticNode[]>([])
  const [selectedSemantic, setSelectedSemantic] = useState<WidgetSemanticSelection | null>(null)
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set())
  const [semDropdownOpen, setSemDropdownOpen] = useState(false)
  // 窗体放大态（头部按钮切换；点击信息条语义 chip 时自动进入）
  const [maximized, setMaximized] = useState(false)
  // 输入工具栏：模式（仅切换展示）/ 思考开关（缺省开，同现状）/ 更多浮层与工具子视图
  const [chatMode, setChatMode] = useState<WidgetChatMode>('interact')
  const [enableThinking, setEnableThinking] = useState(true)
  const [tbPopover, setTbPopover] = useState<'mode' | 'tools' | null>(null)
  // 技能/MCP 飞层搜索词（同主对话飞层顶部搜索）
  const [skillSearch, setSkillSearch] = useState('')
  const [mcpSearch, setMcpSearch] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedMcps, setSelectedMcps] = useState<Set<string>>(new Set())
  // 数据语义 Schema 抽屉（窗内右侧滑出，复用主对话 SchemaFieldsModal）
  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false)
  const [schemaTables, setSchemaTables] = useState<SchemaTable[]>([])
  // sessionRef 的 state 镜像：探索/报告 hook 需在渲染期读取 conv（ref 变更不触发重渲染）
  const [convSession, setConvSession] = useState<WidgetSession | null>(null)
  // 探索右侧工作室当前打开项 id
  const [activeExploreId, setActiveExploreId] = useState<string | undefined>(undefined)

  const sessionRef = useRef<WidgetSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const semSelectorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  // 放大前的 inline 样式快照（还原时恢复拖拽/resize 自定义的位置尺寸）
  const panelCssTextRef = useRef('')
  const didInit = useRef(false)

  // 分享 token 以 Bearer 头注入探索/报告 service（依赖注入，不写 localStorage、不影响主对话登录态）
  const shareAuth = shareToken ? `Bearer ${shareToken}` : null
  // 探索/报告 hook 在渲染期读取的 conv：由 convSession 构造（字段名对齐主对话 conv）
  const hookConv = useMemo(() => {
    if (!convSession) return undefined
    return {
      conv_uid: convSession.convUid,
      chat_id: convSession.sessionId,
      appId: Number(appId) || 0,
      space_id: Number(info?.spaceId) || 0,
      chat_model_id: WIDGET_CHAT_MODEL_ID,
    }
  }, [convSession, appId, info?.spaceId])

  const exploreController = useExploreConversation({
    conv: hookConv,
    spaceId: Number(info?.spaceId) || 0,
    currentModelId: WIDGET_CHAT_MODEL_ID,
    embedModelId: WIDGET_EMBED_MODEL_ID,
    authorization: shareAuth,
  })

  // 分享场景不做历史恢复：historyLoaded=true + 空历史，报告项只来自本次实时提交
  const reportController = useReportConversation({
    conv: hookConv,
    spaceId: Number(info?.spaceId) || 0,
    schemaId: selectedSemantic?.schemaId,
    currentModelId: WIDGET_CHAT_MODEL_ID,
    embedModelId: WIDGET_EMBED_MODEL_ID,
    historyLoaded: true,
    historyRounds: WIDGET_EMPTY_HISTORY_ROUNDS,
    authorization: shareAuth,
  })

  // 加载助手信息 + 会话 + 历史（type 为统一接口 getProjectInfo/{type}/{id} 的类型段）
  const load = useCallback(
    async (id: string, type: ProjectType = 'react', tokenOverride?: string) => {
      // 校验刚返回的 token 尚未写入 state，本轮接口直接用覆盖配置携带凭证
      const effectiveCfg = tokenOverride ? { ...cfg, token: tokenOverride } : cfg
      setAppId(id)
      setPhase('loading')
      const assistantInfo = await fetchAssistantInfo(effectiveCfg, id, type)
      setInfo(assistantInfo)
      // 数据语义随助手详情（getProjectInfo）一并下发；后端未加字段时为空列表，下拉显示“暂无数据语义”
      setSemanticTree(assistantInfo?.semantics ?? [])
      // 默认选中第一个数据语义（同主对话 findFirstSchemaLeaf：深度优先首个叶子）；已选中不覆盖
      const findFirstSchemaLeaf = (nodes: WidgetSemanticNode[]): WidgetSemanticNode | undefined => {
        for (const n of nodes) {
          if (n.type === 'schema') return n
          const hit = findFirstSchemaLeaf(Array.isArray(n.children) ? n.children : [])
          if (hit) return hit
        }
        return undefined
      }
      const firstLeaf = findFirstSchemaLeaf(assistantInfo?.semantics ?? [])
      if (firstLeaf) setSelectedSemantic((prev) => prev ?? { name: firstLeaf.name, schemaId: firstLeaf.schemaId, groupName: firstLeaf.groupName })
      const session = await ensureSession(effectiveCfg, id, assistantInfo?.spaceId)
      sessionRef.current = session
      // 镜像到 state：探索/报告 hook 在渲染期读取 conv（sessionRef 不触发重渲染）
      setConvSession(session)
      if (session) {
        const history = await fetchHistory(effectiveCfg, session.convUid)
        // 历史 AI 消息同实时一样结构化解析（剥离思考段/尾部 JSON）；view 消息挂来的图表按白名单校正类型
        // 图表数据仅取 view 消息自带结果行（同主对话历史链路不重查 sql）
        const enriched = history.map((m) => {
          if (m.role !== 'ai') return m
          const { thinking, text } = parseAiRaw(m.content)
          const chart = m.chart && !isValidChartType(m.chart.type) ? { ...m.chart, type: 'response_bar_chart' } : m.chart
          // ai 内容无正文字段时回退 view 消息 desc（同主对话 ViewEle 正文口径）；信息条取 view 的 semantic_*
          return {
            ...m,
            thinking: thinking || undefined,
            content: text || chart?.desc || '',
            chart,
            semanticGroup: chart?.semanticGroup,
            semanticName: chart?.semanticName,
            semanticSchemaId: chart?.semanticSchemaId,
          }
        })
        setMessages(enriched)
      }
      setPhase('ready')
    },
    [cfg],
  )

  // 进入先探测分享是否需要密码（密码传空串）
  const initCheck = useCallback(async () => {
    setPhase('checking')
    const res = await checkSharePassword(cfg, '').catch(() => null)
    if (!res || !res.appId) {
      setErrorMsg('获取分享信息失败')
      setPhase('error')
      return
    }
    if (res.passwordFlag) {
      setPhase('password')
      return
    }
    if (res.token) setShareToken(res.token)
    await load(res.appId, res.type, res.token)
  }, [cfg, load])

  useEffect(() => {
    // 守卫：StrictMode 重挂载不重复初始化（避免重复建会话）
    if (didInit.current) return
    didInit.current = true
    if (verifiedAppId) void load(verifiedAppId, verifiedType)
    else void initCheck()
  }, [verifiedAppId, verifiedType, load, initCheck])

  // 卸载时中断进行中的流式请求，避免向已卸载组件写状态
  useEffect(() => () => abortRef.current?.abort(), [])

  // 新消息/探索/报告流式更新自动滚动到底部（三模式统一追踪时间线数据源；交互仅 messages 变化，行为不变）
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, exploreController.items, reportController.reports, phase])

  // 语义下拉打开时：点击面板外部收起
  useEffect(() => {
    if (!semDropdownOpen) return
    const onDown = (e: PointerEvent) => {
      if (semSelectorRef.current && !semSelectorRef.current.contains(e.target as Node)) {
        setSemDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [semDropdownOpen])

  // 模式下拉打开时：点击工具栏外部收起（工具用 antd Popover，外部收起由其自管）
  useEffect(() => {
    if (tbPopover !== 'mode') return
    const onDown = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setTbPopover(null)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [tbPopover])

  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError('请输入密码')
      return
    }
    const res = await checkSharePassword(cfg, password).catch(() => null)
    if (res?.result && res.appId) {
      setPasswordError('')
      if (res.token) setShareToken(res.token)
      await load(res.appId, res.type, res.token)
    } else {
      setPasswordError('密码错误')
    }
  }

  // 增量合并消息字段：省略 index = 最后一条 AI（流式进行中）；指定 index = 历史消息回填（新消息只追加末尾，索引稳定）
  const patchMsg = (patch: Partial<WidgetMessage>, index?: number) => {
    setMessages((prev) => {
      const copy = [...prev]
      let target = index
      if (target == null) {
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === 'ai') {
            target = i
            break
          }
        }
      }
      if (target == null || !copy[target]) return prev
      copy[target] = { ...copy[target], ...patch }
      return copy
    })
  }

  // 按尾部 JSON 组装图表：优先直连 json.data（后端直接下发结果行时无需 sql/dbName），否则同主对话 fetchDataBySql 查数；两者皆无静默降级不展示图表
  const loadChartForMessage = async (json: any, dbName?: string) => {
    const directRows = Array.isArray(json?.data) && json.data.length > 0 ? (json.data as any[]) : null
    const hasSql = dbName && typeof json?.sql === 'string' && json.sql.trim()
    if (!directRows && !hasSql) return
    patchMsg({ chartLoading: true })
    const rows = directRows ?? (await fetchChartDataBySql(cfg, dbName as string, json.sql))
    patchMsg(
      rows
        ? {
            chart: {
              type: isValidChartType(json.type) ? json.type : 'response_bar_chart',
              data: rows,
              title: json.title ? String(json.title) : undefined,
              sql: json.sql,
              tableView: json.type === 'response_table' ? true : undefined,
            },
            chartLoading: false,
            ...semanticMetaOf(json),
          }
        : { chartLoading: false, ...semanticMetaOf(json) },
    )
  }

  // 流结束无 sql/数据（同主对话 describe 场景）：按本轮 round 搜 view 回补正文/图表。
  // 同主对话 ViewEle fetchData 口径；round 缺失（流内未提取且 max 未落库）直接不搜。
  // 返回是否回补到正文 desc：未回补时调用方回退流内解析正文
  const backfillFromView = async (session: WidgetSession, round: number | null): Promise<boolean> => {
    if (round == null) return false
    // 后端 view 消息异步落库常晚于 [DONE]：单次 search 易取空而回退退化流文本，故有限重试（最多 3 次、间隔 700ms）
    let view: ReturnType<typeof parseViewChart> = null
    for (let attempt = 0; attempt < 3; attempt++) {
      view = parseViewChart(await fetchViewContextByRound(cfg, session.convUid, round))
      if (view) break
      if (attempt < 2) await new Promise((r) => setTimeout(r, 700))
    }
    if (!view) return false
    const type = isValidChartType(view.type) ? view.type : 'response_bar_chart'
    // 归因/预测无结果行/sql，但需保留 chatMode+raw 以渲染专属看板（同主对话 ViewEle）
    const isDashboard = view.chatMode === 'chat_with_analysis' || view.chatMode === 'chat_with_predict'
    const patch: Partial<WidgetMessage> = {}
    if (view.desc) patch.content = view.desc
    if (view.data.length > 0 || view.sql || isDashboard) patch.chart = { ...view, type }
    if (view.semanticGroup) patch.semanticGroup = view.semanticGroup
    if (view.semanticName) patch.semanticName = view.semanticName
    if (view.semanticSchemaId != null) patch.semanticSchemaId = view.semanticSchemaId
    if (Object.keys(patch).length === 0) return false
    patchMsg(patch)
    // 仅当回补到正文 desc 才算 filled：只回补图表时调用方仍需回退流内正文，避免“描述分析”小节缺失
    return !!view.desc
  }

  // 切换图表类型（同主对话：仅切换本地类型，用已有数据重新构建 option）
  const handleChartTypeChange = (index: number, type: string) => {
    setMessages((prev) => {
      const m = prev[index]
      if (!m?.chart) return prev
      const copy = [...prev]
      copy[index] = { ...m, chart: { ...m.chart, type } }
      return copy
    })
  }

  // 点赞点踩（同主对话 feedback/add 接口；再次点击同状态 = 取消评价回 0），成功后本地高亮
  const handleFeedback = async (index: number, current: number, status: 1 | -1) => {
    const session = sessionRef.current
    if (!session || fbBusyIndex >= 0) return
    const next = current === status ? 0 : status
    setFbBusyIndex(index)
    const ok = await submitFeedback(cfg, {
      convUid: session.convUid,
      roundIndex: messages[index]?.roundIndex,
      status: next,
      appId: appId || 0,
    })
    setFbBusyIndex(-1)
    if (ok) patchMsg({ feedback: next }, index)
  }

  const handleSend = async (explicitText?: string) => {
    const text = (explicitText ?? input).trim()
    if (!text || sending || phase !== 'ready') return
    let session = sessionRef.current
    if (!session) {
      session = await ensureSession(cfg, appId, info?.spaceId)
      if (!session) {
        setErrorMsg('创建会话失败，请稍后重试')
        return
      }
      sessionRef.current = session
      setConvSession(session)
    }
    setInput('')
    setSending(true)
    // 交互消息记录创建时间，与探索/报告项在同一时间线按 createdAt 排序
    const nowTs = Date.now()
    setMessages((prev) => [
      ...prev,
      { role: 'human', content: text, time: getNow(), createdAt: nowTs },
      {
        role: 'ai',
        content: '',
        time: getNow(),
        streaming: true,
        createdAt: nowTs,
        // 信息条随发送即展示（取当前选中语义），历史/回补场景由 view 的 semantic_* 覆盖
        semanticGroup: selectedSemantic?.groupName,
        semanticName: selectedSemantic?.name,
        semanticSchemaId: selectedSemantic?.schemaId,
      },
    ])
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    // 同主对话：round_index 随流内 content 占位串下发，优先流内提取，免流结束再查 max
    let streamRound: number | null = null
    // 同主对话 thinkTime 口径：发送到 [DONE] 的耗时秒
    const startTime = performance.now()
    sendChatStream(
      cfg,
      session,
      text,
      appId,
      controller.signal,
      {
        // 流中：仅思考卡流式展示（同主对话流中只挂 ai 思考消息，正文 [DONE] 后由 view 挂载）
        onDelta: (raw) => {
          if (streamRound == null) {
            const roundMatch = raw.match(/round_index:(\d+)/)
            if (roundMatch) {
              streamRound = Number(roundMatch[1])
              patchMsg({ roundIndex: streamRound })
            }
          }
          const { thinking, text: deltaText } = parseAiRaw(raw)
          patchMsg({ thinking: thinking || undefined, content: deltaText, streaming: true })
        },
        // 流结束（同主对话 [DONE] 管线）：思考卡收尾 → 轮次定位 → sql 主动查数 / describe 单次回补
        onDone: (raw) => {
          const { thinking, text: finalText, json } = parseAiRaw(raw)
          // 思考卡不随 [DONE] 立即收起：保持 streaming 直到正文/图表落定，与主对话「数据到位后思考收起与正文同帧展示」一致
          patchMsg({
            thinking: thinking || undefined,
            content: '',
            thinkTime: Math.round((performance.now() - startTime) / 1000),
          })
          setSending(false)
          // 落定收口：streaming 置 false 与正文/图表同一次 patch 生效，避免思考先收起、数据后到的空窗
          const settle = (patch: Partial<WidgetMessage>) => patchMsg({ ...patch, streaming: false })
          // 轮次：流内提取优先，缺失补查一次 max（同主对话 [DONE] 的 fetchConvMaxRound）
          const resolveRound = async (): Promise<number | null> => {
            if (streamRound != null) return streamRound
            const round = await fetchMaxRound(cfg, session.convUid)
            if (round != null) patchMsg({ roundIndex: round })
            return round
          }
          const hasSql = !!session.dbName && typeof json?.sql === 'string' && !!json.sql.trim()
          const hasRows = Array.isArray(json?.data) && json.data.length > 0
          if (hasSql || hasRows) {
            // sql 已主动查数（同主对话 arrowStatus=true），不再搜 view；图表落定后正文同帧落定
            void resolveRound()
            void loadChartForMessage(json, session.dbName).then(() => settle({ content: finalText || '无数据返回' }))
          } else {
            void resolveRound().then(async (round) => {
              const filled = await backfillFromView(session, round)
              // view 未回补到任何内容时才回退流内解析正文（避免退化流文本覆盖 view desc）
              settle(filled ? {} : { content: finalText || '无数据返回' })
            })
          }
        },
        onError: () => {
          // 主动停止（AbortError）保留已生成内容，其余异常提示重试
          patchMsg({ content: (controller.signal.aborted && '已停止生成') || '请求异常，请稍后重试', streaming: false })
          setSending(false)
        },
      },
      selectedSemantic,
      info?.spaceId,
      {
        enableThinking,
        // 工具菜单选中的技能/MCP 源版本 id（MCP 按协议归入 sse/streamable 字段，同主对话）
        skillSourceVersionIds: Array.from(selectedSkills),
        sseMcpSourceVersionIds: (info?.mcps ?? []).filter((m: AssistantBoundMcp) => selectedMcps.has(m.id) && m.protocol === 'sse').map((m: AssistantBoundMcp) => m.id),
        streamableMcpSourceVersionIds: (info?.mcps ?? []).filter((m: AssistantBoundMcp) => selectedMcps.has(m.id) && m.protocol === 'streamable').map((m: AssistantBoundMcp) => m.id),
      },
    )
  }

  const handleStop = () => {
    abortRef.current?.abort()
    // service 对 AbortError 静默（不回调 onError），这里主动收尾：重置发送态让 icon 变回发送，并落定流式标记保留已生成内容
    setSending(false)
    patchMsg({ streaming: false })
  }

  // 报告能力源：技能 + MCP（按协议拆 sse/streamable），与交互发送同口径；无选择时四字段为空数组
  const buildReportSources = (): ReportSourceVersionFields => {
    const mcps = (info?.mcps ?? []) as AssistantBoundMcp[]
    return {
      sse_mcp_source_version_ids: mcps.filter((m) => selectedMcps.has(m.id) && m.protocol === 'sse').map((m) => m.id),
      mcp_streamable_source_version_ids: mcps.filter((m) => selectedMcps.has(m.id) && m.protocol === 'streamable').map((m) => m.id),
      skills_source_version_ids: Array.from(selectedSkills),
      builtin_tools_source_version_ids: [],
    }
  }

  // 三模式统一发送入口：按当前模式分流到交互 / 探索 / 报告，交互沿用既有 handleSend
  const dispatchSend = async (explicitText?: string) => {
    const text = (explicitText ?? input).trim()
    if (!text || phase !== 'ready') return
    if (chatMode === 'explore') {
      if (exploreController.loading) return
      const schemaId = selectedSemantic?.schemaId
      if (schemaId == null || schemaId === '') {
        antdMessage.warning('请先选择数据语义')
        return
      }
      if (!convSession) {
        antdMessage.error('会话未就绪，请稍后重试')
        return
      }
      setInput('')
      exploreController.handleSend(text, schemaId, {
        skillSourceVersionIds: Array.from(selectedSkills),
        mcpSourceVersionIds: Array.from(selectedMcps),
      })
      return
    }
    if (chatMode === 'report') {
      if (reportController.loading) return
      if (!convSession) {
        antdMessage.error('会话未就绪，请稍后重试')
        return
      }
      setInput('')
      reportController.handleSend(text, buildReportSources())
      return
    }
    void handleSend(explicitText)
  }

  // 停止按钮：按当前正在生成的模式停止（探索/报告各自的流，交互沿用 handleStop）
  const handleStopClick = () => {
    if (exploreController.loading) {
      exploreController.stopGenerating()
      return
    }
    if (reportController.loading) {
      reportController.stopGenerating()
      return
    }
    handleStop()
  }

  // 三模式发送中态：任一模式在生成即视为 busy（驱动发送/停止按钮切换）
  const busy = sending || exploreController.loading || reportController.loading

  // 探索/报告预览互斥：打开探索工作室时收起报告侧栏，反之亦然
  const openExplore = (exploreId: string) => {
    reportController.closeReport()
    setActiveExploreId(exploreId)
  }
  const openReportPane = (reportId: string) => {
    setActiveExploreId(undefined)
    reportController.openReport(reportId)
  }
  const activeExplore = useMemo(
    () => exploreController.items.find((item) => item.id === activeExploreId),
    [exploreController.items, activeExploreId],
  )
  const previewOpen = Boolean(activeExplore) || Boolean(reportController.activeReport)

  // 探索从 running 结束为 completed 且有结果时自动打开工作室（同主对话）
  const exploreStatusRef = useRef<Map<string, string>>(new Map())
  useEffect(() => {
    const next = new Map<string, string>()
    exploreController.items.forEach((item) => {
      const prev = exploreStatusRef.current.get(item.id)
      const hasResult = Boolean(item.finalContent) || Boolean(item.summary) || item.steps.some((s) => s.outputs.length > 0)
      if (prev === 'running' && item.status === 'completed' && hasResult) openExplore(item.id)
      next.set(item.id, item.status)
    })
    exploreStatusRef.current = next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreController.items])

  // 预览打开时若窗体未放大则自动放大（窄面板放不下工作室/报告侧栏）
  useEffect(() => {
    if (previewOpen && !maximized) handleToggleMaximize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen])

  // 统一时间线：交互消息 + 探索项 + 报告项按创建时间排序（历史交互消息无 createdAt，用索引兜底排最前）
  const timeline = useMemo<WidgetTimelineEntry[]>(() => {
    const entries: WidgetTimelineEntry[] = []
    messages.forEach((m, i) => entries.push({ key: `im-${i}`, sortKey: m.createdAt ?? i, kind: 'interact', index: i, message: m }))
    exploreController.items.forEach((item) => entries.push({ key: `ex-${item.id}`, sortKey: item.createdAt, kind: 'explore', item }))
    reportController.reports.forEach((r) => entries.push({ key: `rp-${r.id}`, sortKey: r.createdAt, kind: 'report', report: r }))
    return entries.sort((a, b) => a.sortKey - b.sortKey)
  }, [messages, exploreController.items, reportController.reports])

  // 展开/收起语义分组节点（数据已全量返回，无需懒加载）
  const toggleSemGroup = (nodeId: string) => {
    setExpandedSemGroups((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  // 按住头部拖拽面板：首次拖拽时把 CSS 定位切换为显式 left/top，之后跟随指针；放大态禁用
  const handleDragStart = (e: React.PointerEvent) => {
    if (maximized) return
    if ((e.target as HTMLElement).closest('button')) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    panel.style.position = 'fixed'
    panel.style.transform = 'none'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    const onMove = (ev: PointerEvent) => {
      const left = Math.min(Math.max(rect.left + ev.clientX - startX, 0), window.innerWidth - 80)
      const top = Math.min(Math.max(rect.top + ev.clientY - startY, 0), window.innerHeight - 48)
      panel.style.left = `${left}px`
      panel.style.top = `${top}px`
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // 面板最小尺寸与视口安全边距（resize 约束，口径同头部拖拽）
  const RESIZE_MIN_W = 380
  const RESIZE_MIN_H = 420
  const VIEWPORT_MARGIN = 16

  // 四边拖拽改大小：按下时把 CSS 定位固化为显式 left/top/width/height，之后按方向跟随指针（视口内约束 + 最小尺寸）
  const handleResizeStart = (dir: 'n' | 's' | 'e' | 'w', e: React.PointerEvent) => {
    if (maximized) return
    e.preventDefault()
    e.stopPropagation()
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    panel.style.position = 'fixed'
    panel.style.transform = 'none'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.left = `${rect.left}px`
    panel.style.top = `${rect.top}px`
    panel.style.width = `${rect.width}px`
    panel.style.height = `${rect.height}px`
    panel.style.maxWidth = 'none'
    panel.style.maxHeight = 'none'
    const clampW = (w: number) => Math.min(Math.max(w, RESIZE_MIN_W), window.innerWidth - VIEWPORT_MARGIN)
    const clampH = (h: number) => Math.min(Math.max(h, RESIZE_MIN_H), window.innerHeight - VIEWPORT_MARGIN)
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (dir === 'e') {
        panel.style.width = `${clampW(rect.width + dx)}px`
      } else if (dir === 's') {
        panel.style.height = `${clampH(rect.height + dy)}px`
      } else if (dir === 'w') {
        // 左边拖过最小宽度后固定左缘，避免面板抖动
        const w = clampW(rect.width - dx)
        panel.style.left = `${Math.max(VIEWPORT_MARGIN, rect.right - w)}px`
        panel.style.width = `${w}px`
      } else {
        const h = clampH(rect.height - dy)
        panel.style.top = `${Math.max(0, rect.bottom - h)}px`
        panel.style.height = `${h}px`
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // 放大：快照当前 inline 样式后按视口百分比留边铺展（不占满全屏，保留圆角）；还原：恢复快照（保留拖拽/resize 自定义的位置尺寸）
  const handleToggleMaximize = () => {
    const panel = panelRef.current
    if (!panel) return
    if (maximized) {
      panel.setAttribute('style', panelCssTextRef.current)
      setMaximized(false)
      return
    }
    panelCssTextRef.current = panel.getAttribute('style') || ''
    panel.style.position = 'fixed'
    // 百分比布局随屏幕等比缩放（产品标注留边：左右约 6%、上约 7%、高约 85%）
    panel.style.left = '6%'
    panel.style.top = '7%'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.width = '88%'
    panel.style.height = '85%'
    panel.style.maxWidth = 'none'
    panel.style.maxHeight = 'none'
    panel.style.transform = 'none'
    setMaximized(true)
  }

  // 点击信息条语义 chip：窗体自动放大，Schema 详情抽屉在面板内右侧滑出（同主对话 openSchemaModal 链路）
  const openSchemaDrawer = (schemaId: number | string, bizName: string) => {
    if (!maximized) handleToggleMaximize()
    const table: SchemaTable = { schemaId, bizName, fields: [], loading: true }
    setSchemaTables([table])
    setSchemaDrawerOpen(true)
    fetchSemanticDetail(cfg, schemaId)
      .then((res: any) => {
        const detail = res?.data?.data || res?.data || res
        const modelDetail = detail?.modelDetail
        const fields = modelDetail ? parseSchemaFieldsFromModelDetail(modelDetail) : []
        setSchemaTables([{ ...table, fields, loading: false, description: detail?.description || detail?.remark || '' }])
      })
      .catch(() => setSchemaTables([{ ...table, loading: false }]))
  }

  /** 递归渲染语义节点（与大屏同款：分组仅展开/收起，叶子可选中） */
  const renderSemNode = (node: WidgetSemanticNode, depth: number): React.ReactNode => {
    const indent = { paddingLeft: 8 + depth * 16 }
    if (node.type === 'schema') {
      const isSel = selectedSemantic?.schemaId === node.schemaId
      return (
        <div
          key={node.id}
          className={`abi-cw-sem-leaf${isSel ? ' selected' : ''}`}
          style={indent}
          title={node.techName || node.name}
          onClick={() => {
            setSelectedSemantic({ name: node.name, schemaId: node.schemaId, groupName: node.groupName })
            setSemDropdownOpen(false)
          }}
        >
          <span className="abi-cw-sem-leaf-icon">{IconFile}</span>
          <span className="abi-cw-sem-leaf-name">{node.name}</span>
        </div>
      )
    }
    const children = Array.isArray(node.children) ? node.children : []
    if (children.length === 0) {
      return (
        <div key={node.id} className="abi-cw-sem-group-node is-empty" style={indent}>
          <span className="abi-cw-sem-group-icon is-empty">{IconFolder}</span>
          <span className="abi-cw-sem-group-name">{node.name}</span>
        </div>
      )
    }
    const nodeId = String(node.id)
    const isExpanded = expandedSemGroups.has(nodeId)
    const childCount = typeof node.count === 'number' ? node.count : children.length
    return (
      <div key={node.id} className="abi-cw-sem-group">
        <div className="abi-cw-sem-group-node" style={indent} onClick={() => toggleSemGroup(nodeId)}>
          <span className="abi-cw-sem-group-icon">{isExpanded ? IconFolderOpen : IconFolder}</span>
          <span className="abi-cw-sem-group-name">{node.name}</span>
          {childCount > 0 && <span className="abi-cw-sem-group-count">{childCount}</span>}
          <span className={`abi-cw-sem-chevron${isExpanded ? ' open' : ''}`}>{IconChevronRight}</span>
        </div>
        {isExpanded && children.map((child) => renderSemNode(child, depth + 1))}
      </div>
    )
  }

  // 技能/MCP 飞层候选（顶部搜索过滤，同主对话 uni-popup 飞层）
  const filteredSkills = useMemo(() => {
    const kw = skillSearch.trim().toLowerCase()
    const list = (info?.skills ?? []) as AssistantBoundSkill[]
    return kw ? list.filter((sk) => (sk.bizName || sk.id).toLowerCase().includes(kw)) : list
  }, [info?.skills, skillSearch])

  const filteredMcps = useMemo(() => {
    const kw = mcpSearch.trim().toLowerCase()
    const list = (info?.mcps ?? []) as AssistantBoundMcp[]
    return kw ? list.filter((mc) => (mc.name || mc.id).toLowerCase().includes(kw)) : list
  }, [info?.mcps, mcpSearch])

  const skillFlyoutContent = (
    <div className="uni-popup uni-popup--flyout">
      <div className="uni-popup-search">
        <SearchOutlined />
        <input
          placeholder="搜索技能"
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="uni-popup-list">
        {filteredSkills.length === 0 ? (
          <div className="uni-popup-empty">
            {skillSearch.trim() ? '无匹配结果' : '该助手未绑定技能'}
          </div>
        ) : (
          filteredSkills.map((sk: AssistantBoundSkill) => (
            <div
              key={sk.id}
              className={`uni-popup-item${selectedSkills.has(sk.id) ? ' selected' : ''}`}
              title={sk.bizName}
              onClick={() =>
                setSelectedSkills((prev) => {
                  const next = new Set(prev)
                  if (next.has(sk.id)) next.delete(sk.id)
                  else next.add(sk.id)
                  return next
                })
              }
            >
              <ToolOutlined className="uni-icon" />
              <span className="uni-name">{sk.bizName || sk.id}</span>
              {selectedSkills.has(sk.id) && <CheckOutlined className="uni-check" />}
            </div>
          ))
        )}
      </div>
    </div>
  )

  const mcpFlyoutContent = (
    <div className="uni-popup uni-popup--flyout">
      <div className="uni-popup-search">
        <SearchOutlined />
        <input
          placeholder="搜索 MCP"
          value={mcpSearch}
          onChange={(e) => setMcpSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="uni-popup-list">
        {filteredMcps.length === 0 ? (
          <div className="uni-popup-empty">
            {mcpSearch.trim() ? '无匹配结果' : '该助手未绑定 MCP'}
          </div>
        ) : (
          filteredMcps.map((mc: AssistantBoundMcp) => (
            <div
              key={mc.id}
              className={`uni-popup-item${selectedMcps.has(mc.id) ? ' selected' : ''}`}
              title={mc.name}
              onClick={() =>
                setSelectedMcps((prev) => {
                  const next = new Set(prev)
                  if (next.has(mc.id)) next.delete(mc.id)
                  else next.add(mc.id)
                  return next
                })
              }
            >
              <ApiOutlined className="uni-icon" />
              <span className="uni-name">{mc.name || mc.id}</span>
              {selectedMcps.has(mc.id) && <CheckOutlined className="uni-check" />}
            </div>
          ))
        )}
      </div>
    </div>
  )

  // 工具弹窗内容（同主对话「更多」菜单：查看语义 + 技能/MCP hover 右飞层）
  const toolsPopoverContent = (
    <div className="uni-popup uni-popup--menu">
      <div
        className="uni-popup-item"
        onClick={() => {
          setTbPopover(null)
          const schemaId = selectedSemantic?.schemaId
          if (schemaId != null) openSchemaDrawer(schemaId, selectedSemantic?.name || '')
          else antdMessage.info('请先在左侧选择数据语义')
        }}
      >
        <EyeOutlined className="uni-icon" />
        <span className="uni-name">查看语义</span>
      </div>
      <Popover
        content={skillFlyoutContent}
        trigger="hover"
        placement="rightTop"
        arrow={false}
        overlayClassName="uni-popover"
        getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
      >
        <div className="uni-popup-item">
          <ToolOutlined className="uni-icon" />
          <span className="uni-name">技能</span>
          {(info?.skills?.length ?? 0) > 0 && <span className="uni-count">{info!.skills.length}</span>}
          <RightOutlined className="uni-arrow" />
        </div>
      </Popover>
      <Popover
        content={mcpFlyoutContent}
        trigger="hover"
        placement="rightTop"
        arrow={false}
        overlayClassName="uni-popover"
        getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
      >
        <div className="uni-popup-item">
          <ApiOutlined className="uni-icon" />
          <span className="uni-name">MCP</span>
          {(info?.mcps?.length ?? 0) > 0 && <span className="uni-count">{info!.mcps.length}</span>}
          <RightOutlined className="uni-arrow" />
        </div>
      </Popover>
    </div>
  )

  const welcomeDesc = info?.prologue || info?.description || '请输入问题，开始对话'
  const recList = info?.recQuestions ?? []

  return (
    <div className={`abi-cw-root ${mode === 'float' ? 'abi-cw-float' : 'abi-cw-page'}`}>
      <div className="abi-cw-panel" ref={panelRef}>
        {/* 四边拖拽改大小把手（放大态隐藏） */}
        {!maximized && (
          <>
            <div className="abi-cw-resize abi-cw-resize-n" onPointerDown={(e) => handleResizeStart('n', e)} />
            <div className="abi-cw-resize abi-cw-resize-s" onPointerDown={(e) => handleResizeStart('s', e)} />
            <div className="abi-cw-resize abi-cw-resize-e" onPointerDown={(e) => handleResizeStart('e', e)} />
            <div className="abi-cw-resize abi-cw-resize-w" onPointerDown={(e) => handleResizeStart('w', e)} />
          </>
        )}
        <div className="abi-cw-header" onPointerDown={handleDragStart}>
          <div className="abi-cw-header-logo">A</div>
          <span className="abi-cw-header-name" title={info?.name || '助手'}>
            AI {info?.name ? `· ${info.name}` : '智能问答'}
          </span>
          <button
            type="button"
            className="abi-cw-action-btn"
            onClick={handleToggleMaximize}
            aria-label={maximized ? '还原' : '放大'}
            title={maximized ? '还原' : '放大'}
          >
            {maximized ? IconCompress : IconExpand}
          </button>
          {mode === 'float' && onClose && (
            <button type="button" className="abi-cw-action-btn" onClick={onClose} aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="abi-cw-body" ref={bodyRef}>
          {phase === 'checking' || phase === 'loading' ? (
            <div className="abi-cw-status">
              <div className="abi-cw-spinner" />
              <span>加载中...</span>
            </div>
          ) : phase === 'error' ? (
            <div className="abi-cw-status">
              <span>{errorMsg || '加载失败'}</span>
              <button type="button" className="abi-cw-btn-primary" onClick={() => void initCheck()}>
                重试
              </button>
            </div>
          ) : phase === 'password' ? (
            <div className="abi-cw-status">
              <div className="abi-cw-password">
                <span className="abi-cw-password-title">该分享需要密码访问</span>
                <input
                  type="password"
                  placeholder="请输入访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handlePasswordSubmit()
                  }}
                />
                <span className="abi-cw-password-error">{passwordError}</span>
                <button type="button" className="abi-cw-btn-primary" onClick={() => void handlePasswordSubmit()}>
                  确认
                </button>
              </div>
            </div>
          ) : timeline.length === 0 ? (
            /* 开场白直接复用主对话 OpeningsEle（含 3 个一批 + 换一批） */
            <OpeningsEle
              data={
                {
                  context: welcomeDesc,
                  question: {
                    items: recList,
                    page: 1,
                    page_size: 3,
                    total_count: recList.length,
                    total_pages: Math.ceil(recList.length / 3),
                  },
                } as any
              }
              getAnswer={({ question }: any) => void dispatchSend(question)}
            />
          ) : (
            timeline.map((entry) => {
              /* 探索项：复用主对话 ExploreMessageRow（运行中卡片内展示当前步骤，完成后自动开工作室） */
              if (entry.kind === 'explore') {
                return (
                  <div key={entry.key} className="abi-cw-msg abi-cw-msg-full">
                    <ExploreMessageRow
                      item={entry.item}
                      active={activeExploreId === entry.item.id}
                      compact
                      onOpen={() => openExplore(entry.item.id)}
                      onClose={() => setActiveExploreId(undefined)}
                    />
                  </div>
                )
              }
              /* 报告项：复用主对话 ReportMessageRow（思考/Todo/文件卡），点文件卡在覆盖层打开报告预览 */
              if (entry.kind === 'report') {
                const r = entry.report
                return (
                  <div key={entry.key} className="abi-cw-msg abi-cw-msg-full">
                    <ReportMessageRow
                      report={r}
                      onToggleThinking={() => reportController.toggleThinking(r.id)}
                      onToggleTodo={() => reportController.toggleTodo(r.id)}
                      onToggleTask={(taskKey) => reportController.toggleTaskExecution(r.id, taskKey)}
                      onOpenReport={() => openReportPane(r.id)}
                      onThinkingTypewriterComplete={() => reportController.completeThinkingTypewriter(r.id)}
                    />
                  </div>
                )
              }
              const m = entry.message
              const i = entry.index
              if (m.role === 'human') {
                return (
                  <div key={`human-${i}`} className="abi-cw-msg abi-cw-msg-human">
                    {/* 用户气泡复用主对话 HumanEle（分享场景不传编辑/删除回调） */}
                    <HumanEle data={{ context: m.content }} />
                  </div>
                )
              }
              // 流中仅思考卡（同主对话），正文不闪现未闭合 JSON；[DONE] 后正文同主对话 ViewEle desc 口径
              const displayText = m.streaming ? '' : stripHtmlTags(m.content || '')
              return (
                <div key={`ai-${i}`} className="abi-cw-msg abi-cw-msg-ai">
                  {/* 白卡容器类与主对话 MessageList bodyCard 保持一致 */}
                  <div className="w-full rounded-[1.25rem] border border-[#e9edf4] bg-white px-[0.875rem] pt-[0.75rem] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.04)]">
                    {/* 信息条：分组 + 数据语义（同主对话 MessageList 信息条样式，分享场景不可点 schema） */}
                    {(m.semanticGroup || m.semanticName) && (
                      <div className="abi-cw-infobar">
                        <span className="abi-cw-infobar-label">分组：</span>
                        <span className="abi-cw-infobar-chip abi-cw-infobar-chip-group">
                          <i className="abi-cw-infobar-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 6px rgba(139,92,246,0.5)' }} />
                          {m.semanticGroup || '无'}
                        </span>
                        <span className="abi-cw-infobar-label" style={{ marginLeft: '2em' }}>数据语义：</span>
                        {/* 带 schemaId 时可点：窗体自动放大，Schema 抽屉窗内右侧滑出 */}
                        <span
                          className={`abi-cw-infobar-chip abi-cw-infobar-chip-sem${m.semanticSchemaId != null ? ' clickable' : ''}`}
                          onClick={m.semanticSchemaId != null ? () => openSchemaDrawer(m.semanticSchemaId as number | string, m.semanticName || '') : undefined}
                        >
                          <i className="abi-cw-infobar-dot" style={{ background: '#5b7cf7', boxShadow: '0 0 6px rgba(91,124,247,0.5)' }} />
                          {m.semanticName || '无'}
                        </span>
                      </div>
                    )}
                    {(m.thinking || m.streaming) && (
                      <AiEle
                        data={{
                          context: m.thinking ? `<think>${m.thinking}</think>` : '',
                          smLoading: m.streaming,
                          order: i,
                        }}
                        loading={m.streaming}
                        isDone={!m.streaming}
                        thinkTime={m.thinkTime}
                        compact
                      />
                    )}
                    {displayText && (
                      <>
                        {/* 描述分析小节头（同主对话 ViewEle：蓝色左条标题），与思考卡拉开间距；px-2.5 与主对话卡片内边距对齐，避免贴左 */}
                        <div className="section-header mt-2 pt-3 pb-3 px-2.5">
                          <span className="chart-header-title font-semibold text-[#2d2d2d]">描述分析</span>
                        </div>
                        <div className={`${convStyles['markdown-content']} abi-cw-desc text-left px-2.5`} style={{ width: '100%', fontSize: '13px', lineHeight: 1.75 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
                        </div>
                      </>
                    )}
                    {m.chartLoading && (
                      <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#8494ad]">
                        <div className="abi-cw-spinner" />
                        <span>图表数据加载中...</span>
                      </div>
                    )}
                    {/* 归因分析（chat_with_analysis）：与主对话 ViewEle 一致，新版看板优先，旧格式沿用因果组件 */}
                    {!m.streaming && m.chart?.chatMode === 'chat_with_analysis' && m.chart?.raw && (() => {
                      const d = m.chart!.raw
                      const hasAnalysis = Array.isArray(d.dimension_table) && Array.isArray(d.factor_table) && d.metric_overview
                      // 看板自身为圆角灰底面板（width:100%），直接嵌入白卡与其他块等宽，无需额外负边距
                      if (hasAnalysis) return <AttributionDashboard data={d} compact />
                      if (d.total_df || d.analysis_response) return <CausalAnalysis data={d} />
                      return null
                    })()}
                    {/* 预测分析（chat_with_predict）：与主对话 ViewEle 一致，渲染预测图表 */}
                    {!m.streaming && m.chart?.chatMode === 'chat_with_predict' && m.chart?.raw && (
                      <div className="flex" style={{ width: '100%' }}>
                        <div className="rounded bg-white px-2.5" style={{ width: '100%' }}>
                          <PredictionAnalysis data={m.chart.raw} compact />
                        </div>
                      </div>
                    )}
                    {/* 仅 desc 的 view（无结果行无 sql）不渲染图表卡，避免空图表占位；归因/预测走专属看板不走通用图表卡；streaming 期间隐藏，与思考收起同帧展示 */}
                    {!m.streaming && m.chart && m.chart.chatMode !== 'chat_with_analysis' && m.chart.chatMode !== 'chat_with_predict' && (m.chart.data.length > 0 || !!m.chart.sql) && (
                      <div className="px-2.5">
                        <ChartCard chart={m.chart} onTypeChange={(t) => handleChartTypeChange(i, t)} />
                      </div>
                    )}
                    {!m.streaming && (
                      <StatisticsAnalysis
                        chatMode="chat_with_analysis"
                        feedback={m.feedback ?? 0}
                        content={m.content}
                        onVoteChange={(p: any) => void handleFeedback(i, m.feedback || 0, (p?.status === -1 ? -1 : 1) as 1 | -1)}
                        onAttributionClick={() => {}}
                        onPredictClick={() => {}}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="abi-cw-footer">
          <div className="abi-cw-input-box">
            <textarea
              className="abi-cw-input"
              rows={2}
              placeholder="请输入问题，获取结果"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void dispatchSend()
                }
              }}
            />
            <div className="abi-cw-input-toolbar" ref={toolbarRef}>
              {/* 数据语义选择（与大屏同款：分组树，仅叶子可选） */}
              <div className="abi-cw-sem-selector" ref={semSelectorRef}>
                <button
                  type="button"
                  className={`abi-cw-sem-trigger${semDropdownOpen ? ' active' : ''}`}
                  title="选择数据语义"
                  onClick={() => {
                    setTbPopover(null)
                    setSemDropdownOpen((v) => !v)
                  }}
                >
                  <span className="abi-cw-sem-trigger-icon">{IconDatabase}</span>
                  <span className="abi-cw-sem-trigger-name">{selectedSemantic?.name || '数据语义'}</span>
                  <span className={`abi-cw-sem-trigger-arrow${semDropdownOpen ? ' open' : ''}`}>{IconArrowDown}</span>
                </button>
                {semDropdownOpen && (
                  <div className="abi-cw-sem-popover">
                    <div className="abi-cw-sem-tree">
                      {semanticTree.length === 0 ? (
                        <div className="abi-cw-sem-empty">暂无数据语义</div>
                      ) : (
                        semanticTree.map((node) => renderSemNode(node, 0))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* 模式（交互/探索/报告，顺序与标签同主对话） */}
              <div className="abi-cw-tb-item">
                <button
                  type="button"
                  className={`abi-cw-tb-btn${tbPopover === 'mode' ? ' active' : ''}`}
                  title="切换模式"
                  onClick={() => {
                    setSemDropdownOpen(false)
                    setTbPopover((v) => (v === 'mode' ? null : 'mode'))
                  }}
                >
                  <span className="abi-cw-tb-btn-icon">{WIDGET_MODE_ICONS[chatMode]}</span>
                  <span>{WIDGET_MODES.find((mo) => mo.key === chatMode)?.label}</span>
                  <span className="abi-cw-tb-btn-arrow">{IconArrowDown}</span>
                </button>
                {tbPopover === 'mode' && (
                  <div className="abi-cw-tb-popover">
                    {WIDGET_MODES.map((mo) => (
                      <div
                        key={mo.key}
                        className={`abi-cw-tb-mode-item${chatMode === mo.key ? ' selected' : ''}`}
                        onClick={() => {
                          setChatMode(mo.key)
                          setTbPopover(null)
                          antdMessage.info(`已切换到${mo.label}模式`)
                        }}
                      >
                        <span className="abi-cw-tb-mode-icon">{WIDGET_MODE_ICONS[mo.key]}</span>
                        <span className="abi-cw-tb-mode-main">
                          <span className="abi-cw-tb-mode-name">{mo.label}</span>
                          <span className="abi-cw-tb-mode-desc">{mo.desc}</span>
                        </span>
                        {chatMode === mo.key && <span className="abi-cw-tb-mode-check">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* 深度思考开关（缺省开，关闭后随发送下发 enable_thinking:false） */}
              <button
                type="button"
                className={`abi-cw-tb-btn${enableThinking ? ' on' : ''}`}
                title={enableThinking ? '关闭深度思考' : '开启深度思考'}
                onClick={() => setEnableThinking((v) => !v)}
              >
                <span className="abi-cw-tb-btn-icon">{IconBulb}</span>
                <span>思考</span>
              </button>
              {/* 工具（更多）：查看语义 / 技能 / MCP，打开方式同主对话（antd Popover + uni-popup 弹窗） */}
              <Popover
                content={toolsPopoverContent}
                trigger="click"
                placement="topRight"
                arrow={false}
                open={tbPopover === 'tools'}
                onOpenChange={(open) => {
                  if (open) {
                    setSemDropdownOpen(false)
                    setTbPopover('tools')
                  } else {
                    setTbPopover(null)
                    setSkillSearch('')
                    setMcpSearch('')
                  }
                }}
                destroyTooltipOnHide
                overlayClassName="uni-popover"
                getPopupContainer={() => panelRef.current as HTMLElement}
              >
                <button
                  type="button"
                  className={`abi-cw-tb-btn${tbPopover === 'tools' ? ' active' : ''}`}
                  title="更多工具"
                >
                  工具
                  {(selectedSkills.size > 0 || selectedMcps.size > 0) && (
                    <span className="abi-cw-tb-badge">{selectedSkills.size + selectedMcps.size}</span>
                  )}
                </button>
              </Popover>
              {busy ? (
                <button type="button" className="abi-cw-stop" onClick={handleStopClick} aria-label="停止生成">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="abi-cw-send"
                  disabled={!input.trim()}
                  onClick={() => void dispatchSend()}
                  aria-label="发送"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="abi-cw-disclaimer">AI 生成的内容仅供参考，请注意甄别信息准确性</div>
        </div>

        {/* 探索工作室 / 报告预览：覆盖层铺满面板（预览打开时窗体已自动放大），复用主对话预览面板 */}
        {previewOpen && (
          <div className="abi-cw-preview-overlay">
            {reportController.activeReport ? (
              <ReportPreviewPane
                report={reportController.activeReport}
                animate={reportController.animateReportPreview}
                onClose={reportController.closeReport}
              />
            ) : activeExplore ? (
              <ExplorePreviewPane item={activeExplore} onClose={() => setActiveExploreId(undefined)} />
            ) : null}
          </div>
        )}

        {/* 数据语义 Schema 抽屉：挂载到面板内（窗内右侧滑出，不溢出悬浮窗） */}
        <SchemaFieldsModal
          open={schemaDrawerOpen}
          tables={schemaTables}
          onClose={() => setSchemaDrawerOpen(false)}
          getContainer={() => panelRef.current as HTMLElement}
        />
      </div>
    </div>
  )
}

export default ChatWidget
