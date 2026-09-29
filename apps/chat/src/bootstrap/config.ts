export type ChatRuntimeConfig = Record<string, unknown>

export type ChatConfigFailureCode = 'aborted' | 'http' | 'invalid-json' | 'invalid-shape' | 'network' | 'timeout'

export class ChatConfigError extends Error {
  readonly code: ChatConfigFailureCode
  readonly cause?: unknown

  constructor(code: ChatConfigFailureCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'ChatConfigError'
    this.code = code
    this.cause = cause
  }
}

declare global {
  interface Window {
    APP_CONFIG: ChatRuntimeConfig
    onTokenExpired?: () => Promise<void> | void
  }
}

interface LoadChatRuntimeConfigOptions {
  fetchImpl?: typeof fetch
  path?: string
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export function getChatConfigPath(baseUrl = import.meta.env.BASE_URL): string {
  return `${baseUrl.replace(/\/?$/, '/')}config.json`
}

function isPlainObject(value: unknown): value is ChatRuntimeConfig {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createAbortError(): ChatConfigError {
  return new ChatConfigError('aborted', '配置加载已取消')
}

export async function loadChatRuntimeConfig({
  fetchImpl = fetch,
  path = getChatConfigPath(),
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: LoadChatRuntimeConfigOptions = {}): Promise<ChatRuntimeConfig> {
  if (signal?.aborted) throw createAbortError()

  const requestController = new AbortController()
  let didTimeout = false
  const abortFromCaller = () => requestController.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  const timeoutId = setTimeout(() => {
    didTimeout = true
    requestController.abort()
  }, timeoutMs)

  try {
    const response = await fetchImpl(path, {
      cache: 'no-store',
      signal: requestController.signal,
    })

    if (!response.ok) {
      throw new ChatConfigError('http', `配置请求失败（HTTP ${response.status}）`)
    }

    let config: unknown
    try {
      config = JSON.parse(await response.text())
    } catch (error) {
      throw new ChatConfigError('invalid-json', '配置文件不是有效 JSON', error)
    }

    if (!isPlainObject(config)) {
      throw new ChatConfigError('invalid-shape', '配置文件必须是 JSON 对象')
    }

    return config
  } catch (error) {
    if (didTimeout) {
      throw new ChatConfigError('timeout', `配置加载超过 ${timeoutMs}ms`)
    }
    if (signal?.aborted) throw createAbortError()
    if (error instanceof ChatConfigError) throw error
    throw new ChatConfigError('network', '配置请求失败，请检查网络后重试', error)
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
