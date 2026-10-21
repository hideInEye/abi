import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchFavoriteList, fetchIsFavorite, fetchOperateNew } from './abi-system'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../request/index', () => ({ default: request }))

// 调用清单：abi-system.ts -> fetchFavoriteList、fetchIsFavorite、fetchOperateNew。
describe('favorite API space query', () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ code: 200, rows: [] })
    const storage: Record<string, string> = { userId: '7', spaceId: '164' }
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage[key] ?? null })
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([164, '2101964298823217159'])('passes spaceId=%s without changing its type or the existing query', async (spaceId) => {
    await fetchFavoriteList({ favorType: 'skill', spaceId })
    expect(request).toHaveBeenCalledWith({
      url: '/api/abi-system/favorite/list',
      method: 'get',
      params: { favorType: 'skill', pageNum: 1, pageSize: 999, spaceId },
    })
  })

  it('uses the current space and preserves paging without forwarding a legacy userId', async () => {
    const legacyParams = { userId: '8', favorType: 'chat', pageNum: 2, pageSize: 12 }
    await fetchFavoriteList(legacyParams)
    expect(request.mock.calls[0][0].params).toEqual({ spaceId: 164, favorType: 'chat', pageNum: 2, pageSize: 12 })
  })

  it.each([
    ['addOrRemove', fetchOperateNew, 'post'],
    ['status', fetchIsFavorite, 'get'],
  ] as const)('%s sends explicit spaceId without userId', async (path, fetchFavorite, method) => {
    const legacyParams = { userId: '8', favorType: 'skill', favorId: '9', spaceId: '2101964298823217159' }
    await fetchFavorite(legacyParams)
    expect(request).toHaveBeenCalledWith({
      url: `/api/abi-system/favorite/${path}`,
      method,
      params: { favorType: 'skill', favorId: '9', spaceId: '2101964298823217159' },
    })
  })

  it.each([fetchFavoriteList, fetchIsFavorite, fetchOperateNew])('reads the current space on every request', async (fetchFavorite) => {
    await fetchFavorite({ favorId: '9' })
    expect(request.mock.lastCall?.[0].params.spaceId).toBe(164)
    vi.stubGlobal('localStorage', { getItem: (key: string) => (key === 'spaceId' ? '160' : null) })
    await fetchFavorite({ favorId: '9' })
    expect(request.mock.lastCall?.[0].params.spaceId).toBe(160)
    expect(request.mock.lastCall?.[0].params).not.toHaveProperty('userId')
  })

  it('preserves request failures for the calling workflow', async () => {
    request.mockRejectedValueOnce(new Error('offline'))
    await expect(fetchFavoriteList({ favorType: 'skill', spaceId: 164 })).rejects.toThrow('offline')
  })
})
