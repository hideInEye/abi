import { describe, expect, it, vi } from 'vitest'

import { createStableRequestKey, RequestResource } from './requestResource'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('RequestResource', () => {
  it('normalizes object keys and separates different spaces', () => {
    expect(createStableRequestKey('list', { page: 1, filter: { b: 2, a: 1 } }))
      .toBe(createStableRequestKey('list', { filter: { a: 1, b: 2 }, page: 1 }))
    expect(createStableRequestKey('list', { spaceId: 1 }))
      .not.toBe(createStableRequestKey('list', { spaceId: 2 }))
  })

  it('reuses an inflight promise and a successful cache entry', async () => {
    const resource = new RequestResource<number>()
    const request = deferred<number>()
    const loader = vi.fn(() => request.promise)

    const first = resource.load('same', loader)
    const second = resource.load('same', loader)
    expect(first).toBe(second)
    expect(loader).toHaveBeenCalledOnce()

    request.resolve(42)
    await expect(first).resolves.toBe(42)
    await expect(resource.load('same', loader)).resolves.toBe(42)
    expect(loader).toHaveBeenCalledOnce()
  })

  it('does not cache failures and reloads after invalidation', async () => {
    const resource = new RequestResource<number>()
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(8)

    await expect(resource.load('key', loader)).rejects.toThrow('failed')
    await expect(resource.load('key', loader)).resolves.toBe(7)
    resource.invalidate('key')
    await expect(resource.load('key', loader)).resolves.toBe(8)
    expect(loader).toHaveBeenCalledTimes(3)
  })

  it('aborts an old request without letting its late response update the cache', async () => {
    const resource = new RequestResource<string>()
    const oldRequest = deferred<string>()
    const oldLoad = resource.load('space-a', () => oldRequest.promise)
    resource.abort('space-a')
    oldRequest.resolve('stale')

    await expect(oldLoad).rejects.toMatchObject({ name: 'AbortError' })
    expect(resource.peek('space-a')).toBeUndefined()

    await expect(resource.load('space-a', async () => 'fresh')).resolves.toBe('fresh')
    expect(resource.peek('space-a')).toBe('fresh')
  })
})
