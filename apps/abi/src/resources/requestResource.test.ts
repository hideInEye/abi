import { describe, expect, it, vi } from 'vitest'

import { createStableRequestKey, RequestResource } from './requestResource'

describe('ABI RequestResource', () => {
  it('deduplicates equivalent keys and inflight loads', async () => {
    const key = createStableRequestKey('spaces', { page: 1, filter: { b: 2, a: 1 } })
    expect(key).toBe(createStableRequestKey('spaces', { filter: { a: 1, b: 2 }, page: 1 }))

    const resource = new RequestResource<number>()
    let resolve!: (value: number) => void
    const pending = new Promise<number>(done => { resolve = done })
    const loader = vi.fn(() => pending)
    const first = resource.load(key, loader)
    const second = resource.load(key, loader)
    expect(first).toBe(second)
    resolve(1)
    await expect(first).resolves.toBe(1)
    expect(loader).toHaveBeenCalledOnce()
  })

  it('invalidates successful data and does not cache a failure', async () => {
    const resource = new RequestResource<number>()
    const loader = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(2).mockResolvedValueOnce(3)
    await expect(resource.load('key', loader)).rejects.toThrow('failed')
    await expect(resource.load('key', loader)).resolves.toBe(2)
    resource.invalidate('key')
    await expect(resource.load('key', loader)).resolves.toBe(3)
  })
})
