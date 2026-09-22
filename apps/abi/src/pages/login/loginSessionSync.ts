import { isJwtExpired } from '../../router/guard/jwt'

interface PersistedUserInfo {
  userId?: unknown
  userName?: unknown
}

interface LoginSessionRedirectOptions {
  isSessionActive: () => boolean
  restoreSession: () => Promise<boolean>
}

const AUTH_SESSION_VERSION_STORAGE_KEY = 'authSessionVersion'

function hasUserIdentity(userInfo: unknown): userInfo is PersistedUserInfo {
  if (!userInfo || typeof userInfo !== 'object') return false

  const { userId, userName } = userInfo as PersistedUserInfo
  return [userId, userName].some(value => typeof value === 'string' && value.trim().length > 0)
}

export function hasActiveLoginSession(hasToken: boolean, token: unknown, userInfo: unknown): boolean {
  return hasToken && hasUserIdentity(userInfo) && !isJwtExpired(token)
}

export function isLoginSessionReadyStorageKey(key: string | null): boolean {
  return typeof key === 'string' && key.endsWith(AUTH_SESSION_VERSION_STORAGE_KEY)
}

export function createLoginSessionRedirectCheck({
  isSessionActive,
  restoreSession,
}: LoginSessionRedirectOptions) {
  let isChecking = false
  let hasRedirected = false

  return async function checkAndRestoreLoginSession(): Promise<boolean> {
    if (isChecking || hasRedirected || !isSessionActive()) return false

    isChecking = true

    try {
      const didRedirect = await restoreSession()
      hasRedirected = didRedirect
      return didRedirect
    } catch {
      return false
    } finally {
      isChecking = false
    }
  }
}
