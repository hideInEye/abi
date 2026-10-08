import type { ChatRuntimeConfig } from './config'

export interface ChatAppModule {
  mountChatApp: () => void | Promise<void>
}

interface ChatStartupDependencies {
  applyConfig: (config: ChatRuntimeConfig) => void
  loadApp: () => Promise<ChatAppModule>
  loadConfig: (signal: AbortSignal) => Promise<ChatRuntimeConfig>
  onError: (error: Error, retry: () => void) => void
  onLoading: () => void
  onReady?: () => void
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export function createChatStartupController({
  applyConfig,
  loadApp,
  loadConfig,
  onError,
  onLoading,
  onReady,
}: ChatStartupDependencies) {
  let activeRun = 0
  let requestController: AbortController | null = null
  let disposed = false

  const start = async (): Promise<void> => {
    if (disposed) return

    const run = ++activeRun
    requestController?.abort()
    const runController = new AbortController()
    requestController = runController
    onLoading()

    try {
      const [config, app] = await Promise.all([
        loadConfig(runController.signal),
        loadApp(),
      ])

      if (disposed || run !== activeRun) return
      applyConfig(config)
      await app.mountChatApp()
      if (disposed || run !== activeRun) return
      onReady?.()
    } catch (error) {
      if (disposed || run !== activeRun || runController.signal.aborted) return
      onError(toError(error), () => void start())
    }
  }

  return {
    dispose() {
      disposed = true
      activeRun += 1
      requestController?.abort()
      requestController = null
    },
    start,
  }
}
