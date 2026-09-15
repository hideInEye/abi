import { completeLocalLogout } from '../utils/auth'

import { fetchLogout } from './api/auth'
import { assertFlatRequestSuccess } from './request/flat-result'

export async function requestLogout(): Promise<void> {
  const result = await fetchLogout()

  assertFlatRequestSuccess(result, '退出登录失败')
}

export async function logoutNow(redirectPath?: string): Promise<void> {
  await requestLogout()
  await completeLocalLogout(redirectPath)
}
