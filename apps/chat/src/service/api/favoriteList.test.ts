import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchFavoriteList } from './abi-system'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../request/index', () => ({ default: request }))

describe('fetchFavoriteList space query', () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ code: 200, rows: [] })
    vi.stubGlobal('localStorage', { getItem: (key: string) => (key === 'spaceId' ? '164' : null) })
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([164, '2101964298823217159'])('passes spaceId=%s without changing its type or the existing query', async (spaceId) => {
    await fetchFavoriteList({ favorType: 'skill', spaceId })
    expect(request).toHaveBeenCalledWith({
      url: '/api/abi-system/favorite/list',
      method: 'get',
      params: { favorType: 'skill', spaceId, pageNum: 1, pageSize: 999 },
    })
  })

  it('falls back to the current space and preserves explicit paging without userId', async () => {
    await fetchFavoriteList({ favorType: 'chat', pageNum: 2, pageSize: 12 })
    expect(request.mock.calls[0][0].params).toEqual({ favorType: 'chat', spaceId: 164, pageNum: 2, pageSize: 12 })
  })

  it('preserves request failures for the calling workflow', async () => {
    request.mockRejectedValueOnce(new Error('offline'))
    await expect(fetchFavoriteList({ favorType: 'skill', spaceId: 164 })).rejects.toThrow('offline')
  })
})
