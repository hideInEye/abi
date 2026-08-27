/** Widget 消息模型（与后端原始字段解耦） */
export interface WidgetMessage {
  role: 'human' | 'ai'
  content: string
  time: string
  /** 仅 AI：是否正在流式生成中（用于渲染光标） */
  streaming?: boolean
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
 * 仅保留 human 与 ai 文本回复；view（结构化图表）widget 初版不渲染，直接过滤。
 */
export function mapShareHistory(rawList: unknown): WidgetMessage[] {
  if (!Array.isArray(rawList)) return []
  const result: WidgetMessage[] = []
  for (const item of rawList) {
    const role = (item as any)?.roleType || (item as any)?.messageDetail?.type || ''
    if (role !== 'human' && role !== 'ai') continue
    const content = (item as any)?.messageDetail?.data?.content
    if (typeof content !== 'string' || !content.trim()) continue
    result.push({ role, content, time: formatTime((item as any)?.createTime) })
  }
  return result
}
