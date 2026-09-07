/** 图表数据（对齐主对话 view 消息结构：type 为图表类型标识，data 为查询结果行数组） */
export interface WidgetChart {
  type: string
  data: any[]
  /** 图表标题（后端下发时展示） */
  title?: string
  sql?: string
  /** 正文描述（同主对话 parseContext 口径：chart-view 标签前前缀文本，兜底 JSON desc/data_knowledge） */
  desc?: string
  /** 后端类型为 response_table 时默认展示表格视图（同主对话 ViewEle activeType 口径） */
  tableView?: boolean
  /** 数据语义组（view/流内 JSON 的 semantic_group_name，同主对话信息条口径） */
  semanticGroup?: string
  /** 数据语义（semantic_name） */
  semanticName?: string
  /** 数据语义 schemaId（view/流内 JSON 的 semantic_id，信息条 chip 点击查看 Schema 抽屉依赖） */
  semanticSchemaId?: number | string
  /** 主场景标识（chat_with_analysis 归因 / chat_with_predict 预测），用于渲染专属看板而非通用图表卡 */
  chatMode?: string
  /** 归因/预测看板的完整原始 JSON（view 尾部结构化数据），直接透传 AttributionDashboard / PredictionAnalysis */
  raw?: any
}

/** Widget 消息模型（与后端原始字段解耦） */
export interface WidgetMessage {
  role: 'human' | 'ai'
  /** 展示文本（深度思考段与尾部结构化 JSON 已剥离） */
  content: string
  time: string
  /** 仅 AI：是否正在流式生成中（用于渲染光标） */
  streaming?: boolean
  /** 仅 AI：深度思考内容 */
  thinking?: string
  /** 仅 AI：图表数据（问数等场景，尾部 JSON 含 sql/data 时组装） */
  chart?: WidgetChart | null
  /** 仅 AI：图表数据加载中（SQL 查询中） */
  chartLoading?: boolean
  /** 仅 AI：对话轮次（点赞点踩依赖） */
  roundIndex?: number
  /** 仅 AI：思考用时秒（同主对话 thinkTime，流结束按发送耗时计算） */
  thinkTime?: number
  /** 仅 AI：评价状态 0=无评价 1=点赞 -1=点踩 */
  feedback?: number
  /** 仅 AI：数据语义组（信息条展示；发送时取当前选中，历史/回补取 view 的 semantic_group_name） */
  semanticGroup?: string
  /** 仅 AI：数据语义（semantic_name） */
  semanticName?: string
  /** 仅 AI：数据语义 schemaId（信息条 chip 可点查看 Schema 抽屉的依据） */
  semanticSchemaId?: number | string
  /** 创建时间戳（ms）：与探索/报告项在同一时间线按创建时间排序；历史消息无此值，按索引兜底排最前 */
  createdAt?: number
}

/** createTime → HH:mm；非法时间返回空字符串 */
export function formatTime(t: unknown): string {
  if (!t) return ''
  const d = new Date(String(t))
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 将历史消息接口（/abi-chat/v1/app/message/query）展平后的原始消息映射为 widget 消息。
 * 与 chat 对话同源：roleType 取 roleType || messageDetail.type，内容取 messageDetail.data.content。
 * human/ai 文本回复直接保留；view 消息保存图表 JSON（后端异步生成，同主对话历史链路），
 * 解析后挂到最近一条 ai 消息（同轮 ai 先于 view），避免刷新后历史消息丢失图表。
 */
export function mapShareHistory(rawList: unknown): WidgetMessage[] {
  if (!Array.isArray(rawList)) return []
  const result: WidgetMessage[] = []
  for (const item of rawList) {
    const role = (item as any)?.roleType || (item as any)?.messageDetail?.type || ''
    const content = (item as any)?.messageDetail?.data?.content
    if (role === 'view') {
      const chart = parseViewChart(content)
      if (chart) {
        const lastAi = [...result].reverse().find((m) => m.role === 'ai')
        if (lastAi && !lastAi.chart) lastAi.chart = chart
      }
      continue
    }
    if (role !== 'human' && role !== 'ai') continue
    if (typeof content !== 'string' || !content.trim()) continue
    result.push({ role, content, time: formatTime((item as any)?.createTime) })
  }
  return result
}

/** 解析 view 上下文（view 消息 content / messages/search 的 context）为图表数据（JSON 字符串或 <chart-view content="..."/> 包裹；'describe' 表示仅正文无图表） */
export function parseViewChart(content: unknown): WidgetChart | null {
  if (typeof content !== 'string' || !content.trim() || content.trim() === 'describe') return null
  let json: any = null
  if (content.includes('<chart-view')) {
    const m = content.match(/<chart-view content="([\s\S]*?)"\s*\/>/)
    if (m) {
      try {
        json = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/NaN/g, 'null'))
      } catch {
        // 解析失败忽略
      }
    }
  } else {
    try {
      json = JSON.parse(content)
    } catch {
      // 解析失败忽略
    }
  }
  if (!json || typeof json !== 'object') return null
  const rows = Array.isArray(json.data) ? json.data : []
  const sql = typeof json.sql === 'string' && json.sql.trim() ? json.sql : undefined
  // 正文口径同主对话 parseContext：chart-view 标签前的前缀文本即 desc；无标签/无前缀时兜底 JSON 的 desc（chat_with_knowledge 取 data_knowledge）
  const prefix = content.includes('<chart-view') ? content.slice(0, content.indexOf('<chart-view')).trim() : ''
  const desc =
    prefix ||
    (json.chat_mode === 'chat_with_knowledge'
      ? typeof json.data_knowledge === 'string' && json.data_knowledge.trim()
        ? json.data_knowledge
        : undefined
      : typeof json.desc === 'string' && json.desc.trim()
        ? json.desc
        : undefined)
  // 归因（chat_with_analysis）/ 预测（chat_with_predict）走专属看板：无结果行/sql/desc 也需保留原始 JSON 供渲染（同主对话 ViewEle）
  const chatMode = typeof json.chat_mode === 'string' && json.chat_mode ? json.chat_mode : undefined
  const isDashboard = chatMode === 'chat_with_analysis' || chatMode === 'chat_with_predict'
  if (!rows.length && !sql && !desc && !isDashboard) return null
  return {
    // 类型合法性由调用方按图表白名单校正，此处仅做非空兜底
    type: typeof json.type === 'string' && json.type ? json.type : 'response_bar_chart',
    data: rows,
    title: json.title ? String(json.title) : undefined,
    sql,
    desc,
    tableView: json.type === 'response_table' ? true : undefined,
    chatMode,
    raw: isDashboard ? json : undefined,
    semanticGroup: typeof json.semantic_group_name === 'string' && json.semantic_group_name.trim() ? json.semantic_group_name : undefined,
    semanticName: typeof json.semantic_name === 'string' && json.semantic_name.trim() ? json.semantic_name : undefined,
    semanticSchemaId: json.semantic_id != null && json.semantic_id !== '' ? json.semantic_id : undefined,
  }
}
