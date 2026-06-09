import { createAuthorizationHeader, normalizeToken } from '@sa/auth'
import type { InternalAxiosRequestConfig } from 'axios'

type TokenExpiredHandler = (() => void | Promise<void>) | undefined

export { createAuthorizationHeader, normalizeToken } from '@sa/auth'

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
