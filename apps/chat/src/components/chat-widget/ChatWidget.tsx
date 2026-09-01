import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { marked } from 'marked'
import { ConfigProvider, Table, Typography, message as antdMessage } from 'antd'
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
import { SUPPORTED_RENDER_TYPES, getChartTypeItem } from '../conversation/components/chartTypeCatalog'
import convStyles from '../conversation/index.module.css'
import viewStyles from '../conversation/styles.module.css'
import { getChartOption, parseISO8601Duration, parseISODate } from '../conversation/helpers/chartOption'
import { handleImageExport } from '../conversation/helpers/download'
import PieLegend from '../PieLegend'
import { EChart } from '../react-echarts'
import type { WidgetChart, WidgetMessage } from './history'
import {
  checkSharePassword,
  ensureSession,
  fetchAssistantInfo,
  fetchChartDataBySql,
  fetchHistory,
  fetchMaxRound,
  parseAiRaw,
  sendChatStream,
  submitFeedback,
  type ProjectType,
  type WidgetAssistantInfo,
  type WidgetConfig,
  type WidgetSemanticNode,
  type WidgetSemanticSelection,
  type WidgetSession,
} from './service'
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

function getNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── AI 消息 Markdown 渲染（对齐主对话 ViewEle 管线）── */
// 窄屏分享面板：开启硬换行，问数/归因/预测等回复中的单换行保持原样换行
marked.use({ breaks: true, gfm: true })

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

/** marked 同步解析；解析异常时降级为转义后的原文 */
const renderMarkdown = (content: string): string => {
  try {
    return marked.parse(content) as string
  } catch {
    return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
  }
}

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

const { Text } = Typography

/* ── 图表区（同主对话 ViewEle 图表分支：小节头 + ChartHeader 工具栏 + 图/表/SQL 三视图） ── */
// 图表配置常量与主对话 ViewEle 默认值保持一致
const CHART_CONFIG = {
  font: 'Arial',
  fontSize: 12,
  chartStyle: { color: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878', textColor: '#333333' },
}

const ChartCard = ({ chart, onTypeChange }: { chart: WidgetChart; onTypeChange: (type: string) => void }) => {
  const [activeType, setActiveType] = useState<'chart' | 'table' | 'sql'>('chart')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isChartHovered, setIsChartHovered] = useState(false)
  const echartRef = useRef<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)

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
        <EChart ref={echartRef} option={option} style={{ height: '25rem', width: '100%' }} autoResize handleClick={() => {}} />
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

  const sessionRef = useRef<WidgetSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const semSelectorRef = useRef<HTMLDivElement>(null)
  const didInit = useRef(false)

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
      const session = await ensureSession(effectiveCfg, id, assistantInfo?.spaceId)
      sessionRef.current = session
      if (session) {
        const history = await fetchHistory(effectiveCfg, session.convUid)
        // 历史 AI 消息同实时一样结构化解析（剥离思考段/尾部 JSON），再按索引补图表数据与轮次无关字段
        const enriched = history.map((m) => {
          if (m.role !== 'ai') return m
          const { thinking, text } = parseAiRaw(m.content)
          return { ...m, thinking: thinking || undefined, content: text }
        })
        setMessages(enriched)
        history.forEach((m, i) => {
          if (m.role !== 'ai') return
          const { json } = parseAiRaw(m.content)
          void loadChartForMessage(i, json, session.dbName, effectiveCfg)
        })
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

  // 新消息自动滚动到底部
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, phase])

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
  const loadChartForMessage = async (index: number | undefined, json: any, dbName?: string, cfgOverride?: WidgetConfig) => {
    const directRows = Array.isArray(json?.data) && json.data.length > 0 ? (json.data as any[]) : null
    const hasSql = dbName && typeof json?.sql === 'string' && json.sql.trim()
    if (!directRows && !hasSql) return
    patchMsg({ chartLoading: true }, index)
    const rows = directRows ?? (await fetchChartDataBySql(cfgOverride ?? cfg, dbName as string, json.sql))
    patchMsg(
      rows
        ? {
            chart: {
              type: isValidChartType(json.type) ? json.type : 'response_bar_chart',
              data: rows,
              title: json.title ? String(json.title) : undefined,
              sql: json.sql,
            },
            chartLoading: false,
          }
        : { chartLoading: false },
      index,
    )
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
    }
    setInput('')
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { role: 'human', content: text, time: getNow() },
      { role: 'ai', content: '', time: getNow(), streaming: true },
    ])
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    sendChatStream(
      cfg,
      session,
      text,
      appId,
      controller.signal,
      {
        // 流中：实时结构化解析（思考段 + 展示文本）增量回写
        onDelta: (raw) => {
          const { thinking, text } = parseAiRaw(raw)
          patchMsg({ thinking: thinking || undefined, content: text, streaming: true })
        },
        // 流结束（同主对话管线）：收尾文本 → 尾部 JSON 带 sql 则查数组图表 → 取本轮 roundIndex
        onDone: (raw) => {
          const { thinking, text, json } = parseAiRaw(raw)
          patchMsg({ thinking: thinking || undefined, content: text || '无数据返回', streaming: false })
          setSending(false)
          void loadChartForMessage(undefined, json, session.dbName)
          void fetchMaxRound(cfg, session.convUid).then((round) => {
            if (round != null) patchMsg({ roundIndex: round })
          })
        },
        onError: () => {
          // 主动停止（AbortError）保留已生成内容，其余异常提示重试
          patchMsg({ content: (controller.signal.aborted && '已停止生成') || '请求异常，请稍后重试', streaming: false })
          setSending(false)
        },
      },
      selectedSemantic,
      info?.spaceId,
    )
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  // 展开/收起语义分组节点（数据已全量返回，无需懒加载）
  const toggleSemGroup = (nodeId: string) => {
    setExpandedSemGroups((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  // 按住头部拖拽面板：首次拖拽时把 CSS 定位切换为显式 left/top，之后跟随指针
  const handleDragStart = (e: React.PointerEvent) => {
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

  const welcomeDesc = info?.prologue || info?.description || '请输入问题，开始对话'
  const recList = info?.recQuestions ?? []

  return (
    <div className={`abi-cw-root ${mode === 'float' ? 'abi-cw-float' : 'abi-cw-page'}`}>
      <div className="abi-cw-panel" ref={panelRef}>
        <div className="abi-cw-header" onPointerDown={handleDragStart}>
          <div className="abi-cw-header-logo">A</div>
          <span className="abi-cw-header-name" title={info?.name || '助手'}>
            AI {info?.name ? `· ${info.name}` : '智能问答'}
          </span>
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
          ) : messages.length === 0 ? (
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
              getAnswer={({ question }: any) => void handleSend(question)}
            />
          ) : (
            messages.map((m, i) => {
              if (m.role === 'human') {
                return (
                  <div key={`human-${i}`} className="abi-cw-msg abi-cw-msg-human">
                    {/* 用户气泡复用主对话 HumanEle（分享场景不传编辑/删除回调） */}
                    <HumanEle data={{ context: m.content }} />
                  </div>
                )
              }
              // 流中隐藏尚未闭合的尾部 JSON 片段（[DONE] 后由 parseAiRaw 完整剥离）
              const displayText = stripHtmlTags(m.streaming ? (m.content || '').replace(/\{[^{}]*$/, '') : m.content || '')
              return (
                <div key={`ai-${i}`} className="abi-cw-msg abi-cw-msg-ai">
                  {/* 白卡容器类与主对话 MessageList bodyCard 保持一致 */}
                  <div className="w-full rounded-[1.25rem] border border-[#e9edf4] bg-white px-[0.875rem] pt-[0.75rem] shadow-[0_0.125rem_0.5rem_rgba(15,23,42,0.04)]">
                    {(m.thinking || m.streaming) && (
                      <AiEle
                        data={{
                          context: m.thinking ? `<think>${m.thinking}</think>` : '',
                          smLoading: m.streaming,
                          order: i,
                        }}
                        loading={m.streaming}
                        isDone={!m.streaming}
                      />
                    )}
                    {displayText && (
                      <div
                        className={`${convStyles['markdown-content']} text-left`}
                        style={{ width: '100%' }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(displayText) }}
                      />
                    )}
                    {m.chartLoading && (
                      <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#8494ad]">
                        <div className="abi-cw-spinner" />
                        <span>图表数据加载中...</span>
                      </div>
                    )}
                    {m.chart && <ChartCard chart={m.chart} onTypeChange={(t) => handleChartTypeChange(i, t)} />}
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
                  void handleSend()
                }
              }}
            />
            <div className="abi-cw-input-toolbar">
              {/* 数据语义选择（与大屏同款：分组树，仅叶子可选） */}
              <div className="abi-cw-sem-selector" ref={semSelectorRef}>
                <button
                  type="button"
                  className={`abi-cw-sem-trigger${semDropdownOpen ? ' active' : ''}`}
                  title="选择数据语义"
                  onClick={() => setSemDropdownOpen((v) => !v)}
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
              {sending ? (
                <button type="button" className="abi-cw-stop" onClick={handleStop} aria-label="停止生成">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="abi-cw-send"
                  disabled={!input.trim()}
                  onClick={() => void handleSend()}
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
      </div>
    </div>
  )
}

export default ChatWidget
