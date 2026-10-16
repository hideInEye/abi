import type { UserInfo } from '@/types/layout'

import { readAuthToken } from './auth'

const USER_INFO_STORAGE_KEY = 'SOY-REACT_userInfo'
const USER_INFO_CHANGE_EVENT = 'auth-user-changed'

export function notifyCurrentUserChanged(): void {
  window.dispatchEvent(new Event(USER_INFO_CHANGE_EVENT))
}

export function subscribeCurrentUser(listener: () => void): () => void {
  window.addEventListener(USER_INFO_CHANGE_EVENT, listener)
  return () => window.removeEventListener(USER_INFO_CHANGE_EVENT, listener)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return ''
}

export function getCurrentUser(): UserInfo {
  // 凭据可能先于用户缓存被清除，读取身份时不能把残留用户名当成有效登录。
  if (!readAuthToken()) return {}
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
