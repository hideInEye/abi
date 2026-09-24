import { describe, expect, it, vi } from 'vitest'

import { createChatStartupController } from './startup'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('createChatStartupController', () => {
  it('starts config and app loading together, then applies config before mount', async () => {
    const events: string[] = []
    const config = deferred<Record<string, unknown>>()
    const app = deferred<{ mountChatApp: () => void }>()
    const controller = createChatStartupController({
      applyConfig: () => events.push('config'),
      loadApp: () => {
        events.push('load-app')
        return app.promise
      },
      loadConfig: () => {
        events.push('load-config')
        return config.promise
      },
      onError: vi.fn(),
      onLoading: () => events.push('loading'),
      onReady: () => events.push('ready'),
    })

    const start = controller.start()
    expect(events).toEqual(['loading', 'load-config', 'load-app'])
    app.resolve({ mountChatApp: () => events.push('mount') })
    config.resolve({ ok: true })
    await start
    expect(events.slice(-3)).toEqual(['config', 'mount', 'ready'])
  })

  it('aborts an older run and only mounts the latest result', async () => {
    const signals: AbortSignal[] = []
    const configs = [deferred<Record<string, unknown>>(), deferred<Record<string, unknown>>()]
    const mountChatApp = vi.fn()
    let configIndex = 0
    const controller = createChatStartupController({
      applyConfig: vi.fn(),
      loadApp: async () => ({ mountChatApp }),
      loadConfig: signal => {
        signals.push(signal)
        return configs[configIndex++].promise
      },
      onError: vi.fn(),
      onLoading: vi.fn(),
    })

    const first = controller.start()
    const second = controller.start()
    expect(signals[0]?.aborted).toBe(true)
    configs[0].resolve({ run: 1 })
    configs[1].resolve({ run: 2 })
    await Promise.all([first, second])
    expect(mountChatApp).toHaveBeenCalledTimes(1)
  })

  it('exposes a retry that can recover from failure', async () => {
    const mountChatApp = vi.fn()
    const onError = vi.fn()
    let attempt = 0
    const controller = createChatStartupController({
      applyConfig: vi.fn(),
      loadApp: async () => ({ mountChatApp }),
      loadConfig: async () => {
        attempt += 1
        if (attempt === 1) throw new Error('offline')
        return { ok: true }
      },
      onError,
      onLoading: vi.fn(),
    })

    await controller.start()
    expect(onError).toHaveBeenCalledTimes(1)
    const retry = onError.mock.calls[0]?.[1] as (() => void)
    retry()
    await vi.waitFor(() => expect(mountChatApp).toHaveBeenCalledTimes(1))
  })
})
