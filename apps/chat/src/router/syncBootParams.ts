const SPACE_ID_QUERY_KEY = 'spaceId'
const CHAT_ID_QUERY_KEY = 'chatId'
const CHAT_ID_STORAGE_KEY = 'chatId'
const SPACE_ID_STORAGE_KEY = 'spaceId'

type BootParams = {
  spaceId?: string
  chatId?: string
}

function readHashQueryParam(hash: string, key: string): string | null {
  const queryIndex = hash.indexOf('?')
  if (queryIndex < 0) return null

  const params = new URLSearchParams(hash.slice(queryIndex + 1))
  return params.get(key)
}

function extractChatIdFromHashPath(hash: string): string | null {
  const match = hash.match(/\/chat\/(?:conversation|task)\/([^/?#]+)/)
  if (!match?.[1]) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function normalizeSpaceId(value: string | null): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? trimmed : undefined
}

function normalizeChatId(value: string | null): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  return trimmed || undefined
}

function setStorageItemSafely(key: string, value?: string) {
  if (!value) return

  try {
    localStorage.setItem(key, value)
  } catch {
    // 忽略 localStorage 不可写场景，避免中断主流程。
  }
}

function resolveBootParams(url: URL): BootParams {
  const { hash, searchParams } = url

  const querySpaceId = searchParams.get(SPACE_ID_QUERY_KEY)
  const queryChatId = searchParams.get(CHAT_ID_QUERY_KEY)

  const hashSpaceId = readHashQueryParam(hash, SPACE_ID_QUERY_KEY)
  const hashChatId = readHashQueryParam(hash, CHAT_ID_QUERY_KEY)
  const hashPathChatId = extractChatIdFromHashPath(hash)

  return {
    spaceId: normalizeSpaceId(querySpaceId ?? hashSpaceId),
    chatId: normalizeChatId(queryChatId ?? hashChatId ?? hashPathChatId),
  }
}

export function syncBootParamsFromUrl() {
  try {
    const url = new URL(window.location.href)
    const { spaceId, chatId } = resolveBootParams(url)

    setStorageItemSafely(SPACE_ID_STORAGE_KEY, spaceId)
    setStorageItemSafely(CHAT_ID_STORAGE_KEY, chatId)
  } catch {
    // 忽略 URL 解析异常，保留现有本地状态。
  }
}
