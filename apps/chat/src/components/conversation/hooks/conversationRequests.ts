export interface StoredUserInfo {
  userName?: string
}

export function parseStoredUserInfo(value: string | null): StoredUserInfo {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null ? parsed as StoredUserInfo : {}
  } catch {
    return {}
  }
}

export function getConversationUserName(): string {
  // user_name 使用登录账号 userName，而非展示昵称；与原有 user_id 分开传递。
  try {
    const userInfo = parseStoredUserInfo(localStorage.getItem('SOY-REACT_userInfo'))
    return typeof userInfo.userName === 'string' ? userInfo.userName : ''
  } catch {
    return ''
  }
}

export function isApiSuccess(response: unknown): boolean {
  if (typeof response !== 'object' || response === null) return false
  const result = response as Record<string, unknown>
  return Number(result.code) === 200 || result.success === true
}

export interface ApiFlowResult {
  message?: string
  success: boolean
}

export async function runApiSuccessFlow(
  request: () => Promise<unknown>,
  onSuccess?: () => void | Promise<void>
): Promise<ApiFlowResult> {
  try {
    const response = await request()
    if (!isApiSuccess(response)) {
      const result = typeof response === 'object' && response !== null
        ? response as Record<string, unknown>
        : {}
      return { success: false, message: String(result.msg || result.message || '服务器错误') }
    }
    await onSuccess?.()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '请求失败，请重试'
    }
  }
}
