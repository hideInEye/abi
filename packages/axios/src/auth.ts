import type { InternalAxiosRequestConfig } from 'axios'

type TokenExpiredHandler = (() => void | Promise<void>) | undefined

const INVALID_TOKEN_VALUES = new Set(['', 'null', 'undefined'])

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function tryReadTokenFromObject(tokenLike: Record<string, unknown>) {
  const tokenKeys = ['token', 'access_token', 'accessToken']
  for (const tokenKey of tokenKeys) {
    const tokenValue = tokenLike[tokenKey]
    const normalizedToken = normalizeToken(tokenValue)
    if (normalizedToken) {
      return normalizedToken
    }
  }
  return ''
}

/**
 * normalize token-like value to a plain token string
 */
export function normalizeToken(tokenLike: unknown): string {
  if (typeof tokenLike === 'string') {
    const trimmedToken = tokenLike.trim()
    if (INVALID_TOKEN_VALUES.has(trimmedToken)) {
      return ''
    }

    try {
      const parsedToken = JSON.parse(trimmedToken) as unknown
      if (parsedToken !== tokenLike) {
        return normalizeToken(parsedToken)
      }
    } catch {}

    return trimmedToken
  }

  if (typeof tokenLike === 'number' || typeof tokenLike === 'bigint') {
    return String(tokenLike)
  }

  if (isObjectValue(tokenLike)) {
    return tryReadTokenFromObject(tokenLike)
  }

  return ''
}

/**
 * resolve bearer authorization header value
 */
export function createAuthorizationHeader(tokenLike: unknown): string | null {
  const token = normalizeToken(tokenLike)
  return token ? `Bearer ${token}` : null
}

/**
 * read token from localStorage by key list
 */
export function readTokenFromLocalStorage(storageKeys: string | string[]): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return ''
  }

  const keyList = Array.isArray(storageKeys) ? storageKeys : [storageKeys]
  for (const storageKey of keyList) {
    const storageValue = window.localStorage.getItem(storageKey)
    const token = normalizeToken(storageValue)
    if (token) {
      return token
    }
  }

  return ''
}

/**
 * attach authorization header to axios request config
 */
export function applyAuthorizationHeader(config: InternalAxiosRequestConfig, tokenLike: unknown, headerName = 'Authorization') {
  const authorization = createAuthorizationHeader(tokenLike)
  const headers = config.headers as any
  if (headers?.set && typeof headers.set === 'function') {
    if (authorization) {
      headers.set(headerName, authorization)
    } else if (headers.delete && typeof headers.delete === 'function') {
      headers.delete(headerName)
    }
    return
  }

  if (authorization) {
    headers[headerName] = authorization
  } else if (headers && typeof headers === 'object') {
    delete headers[headerName]
  }
}

function readBackendCode(data: unknown) {
  if (!isObjectValue(data)) {
    return ''
  }
  const code = data.code
  if (code === undefined || code === null) {
    return ''
  }
  return String(code)
}

/**
 * parse backend code list from csv string
 */
export function parseBackendCodeList(codes: string | null | undefined): string[] {
  if (!codes) {
    return []
  }
  return codes
    .split(',')
    .map(code => code.trim())
    .filter(Boolean)
}

/**
 * check whether backend response code is in target list
 */
export function isBackendCodeIn(data: unknown, codeList: Iterable<string>) {
  const backendCode = readBackendCode(data)
  if (!backendCode) {
    return false
  }
  for (const targetCode of codeList) {
    if (backendCode === String(targetCode)) {
      return true
    }
  }
  return false
}

/**
 * run token-expired callback safely
 */
export async function triggerTokenExpired(handler: TokenExpiredHandler) {
  if (!handler) {
    return
  }

  try {
    await handler()
  } catch {
    // keep request layer resilient and avoid breaking current flow
  }
}
