import type { UserInfo } from '@/types/layout'

const USER_INFO_STORAGE_KEY = 'SOY-REACT_userInfo'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return ''
}

export function getCurrentUser(): UserInfo {
  const raw = localStorage.getItem(USER_INFO_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) return {}
    return {
      userName: normalizeText(parsed.userName) || undefined,
      nickName: normalizeText(parsed.nickName) || undefined,
    }
  } catch {
    return {}
  }
}

export function getCurrentUserName(): string {
  const user = getCurrentUser()
  return user.nickName || user.userName || '当前用户'
}
