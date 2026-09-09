import { authManager } from '../utils/auth'

import { fetchLogout } from './api/auth'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isLogoutResponseSuccess(response: unknown): boolean {
  if (!isRecord(response)) return false

  const responseCode = response.code === undefined || response.code === null ? '' : String(response.code)
  return responseCode === '200' || responseCode === '0000' || response.success === true || response.data === true
}

export async function requestLogout(): Promise<void> {
  const response = await fetchLogout()

  if (!isLogoutResponseSuccess(response)) {
    const errorMessage =
      isRecord(response) && typeof response.msg === 'string'
        ? response.msg
        : isRecord(response) && typeof response.message === 'string'
          ? response.message
          : '退出登录失败'
    throw new Error(errorMessage)
  }
}

export async function logoutNow(): Promise<void> {
  await requestLogout()
  await authManager.logout({ preserveRedirect: false })
}
