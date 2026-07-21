import dayjs from 'dayjs'

import type { TopicItem, UserInfo } from '@/types/layout'

const USER_INFO_STORAGE_KEY = 'SOY-REACT_userInfo'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return ''
}

// 会话排序值（后端固定字段 sortOrder，与分组一致；>0 表示置顶）。
function normalizeSortOrder(item: Record<string, unknown>): number {
  const raw = item.sortOrder
  return typeof raw === 'number' ? raw : Number(raw) || 0
}

function normalizeTopic(item: unknown): TopicItem | null {
  if (!isRecord(item)) return null

  const chatId = normalizeText(item.chat_id)
  if (!chatId) return null

  const title = normalizeText(item.biz_name) || `对话 ${chatId}`
  const updateTime = normalizeText(item.update_time) || normalizeText(item.create_time) || undefined

  return {
    chatId,
    title,
    updateTime,
    sortOrder: normalizeSortOrder(item),
  }
}

// 读取本地用户信息，解析失败时返回空对象，避免阻断页面渲染。
export function getCurrentUser(): UserInfo {
  const raw = localStorage.getItem(USER_INFO_STORAGE_KEY)
  if (!raw) return {}

  const parsed = safeParseJson(raw)
  if (!isRecord(parsed)) return {}

  return {
    userName: normalizeText(parsed.userName) || undefined,
    nickName: normalizeText(parsed.nickName) || undefined,
  }
}

// 统一用户名称回退顺序，保证 UI 永远有可展示值。
export function getCurrentUserName(): string {
  const user = getCurrentUser()
  return user.nickName || user.userName || '当前用户'
}

// 服务端历史话题可能为空或格式异常，统一在此做标准化。
export function normalizeTopicsFromApi(data: unknown): TopicItem[] {
  if (!Array.isArray(data)) return []

  return data
    .map(normalizeTopic)
    .filter((item): item is TopicItem => Boolean(item))
}

// 路由路径提取会话 ID，路径异常时返回空字符串。
export function extractConversationIdFromPath(pathname: string): string {
  if (!pathname) return ''

  const match = pathname.match(/^\/chat\/conversation\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export function formatTopicUpdateTime(value?: string): string {
  if (!value) return '最近使用'

  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY年MM月DD日 HH:mm') : value
}
