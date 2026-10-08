import { describe, expect, it, vi } from 'vitest'

import { loadChatRuntimeConfig } from './config'

function response(body: string, status = 200): Response {
  return new Response(body, { status })
}

describe('loadChatRuntimeConfig', () => {
  it('loads a JSON object without browser cache reuse', async () => {
    const fetchImpl = vi.fn(async () => response('{"VITE_BASE_API":"/api"}'))

    await expect(loadChatRuntimeConfig({ fetchImpl, path: '/config.json' })).resolves.toEqual({ VITE_BASE_API: '/api' })
    expect(fetchImpl).toHaveBeenCalledWith('/config.json', expect.objectContaining({ cache: 'no-store' }))
  })

  it('reports an HTTP failure', async () => {
    await expect(loadChatRuntimeConfig({ fetchImpl: async () => response('{}', 503) })).rejects.toMatchObject({ code: 'http' })
  })

  it('rejects non-JSON and non-object payloads', async () => {
    await expect(loadChatRuntimeConfig({ fetchImpl: async () => response('<html>') })).rejects.toMatchObject({ code: 'invalid-json' })
    await expect(loadChatRuntimeConfig({ fetchImpl: async () => response('[]') })).rejects.toMatchObject({ code: 'invalid-shape' })
  })

  it('aborts a request that exceeds the deadline', async () => {
    const fetchImpl: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    })

    await expect(loadChatRuntimeConfig({ fetchImpl, timeoutMs: 5 })).rejects.toMatchObject({ code: 'timeout' })
  })

  it('propagates caller cancellation distinctly from a timeout', async () => {
    const controller = new AbortController()
    const fetchImpl: typeof fetch = (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    })

    const promise = loadChatRuntimeConfig({ fetchImpl, signal: controller.signal, timeoutMs: 1_000 })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ code: 'aborted' })
  })
})
