import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ load: vi.fn(), token: 'account-a' }))
vi.mock('../resources/spaceListResource', () => ({ loadChatSpacePage: mocks.load }))
vi.mock('../utils/auth', () => ({ readAuthToken: () => mocks.token }))

import { initializeChatSessionSpace } from './sessionSpace'

beforeEach(() => {
  mocks.token = 'account-a'
  mocks.load.mockReset()
  const storage = new Map<string, string>([['spaceId', '99'], ['spaceName', '旧空间']])
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
})
afterEach(() => vi.unstubAllGlobals())

describe('Chat session space initialization', () => {
  it('falls back to the first server space when the cached space is no longer accessible', async () => {
    mocks.load.mockResolvedValue({ rows: [{ spaceId: 8, spaceName: '第一空间' }] })
    await initializeChatSessionSpace()
    expect(localStorage.getItem('spaceId')).toBe('8')
    expect(localStorage.getItem('spaceName')).toBe('第一空间')
  })

  it('restores the cached space and uses its current server name on refresh', async () => {
    mocks.load.mockResolvedValue({ rows: [{ spaceId: 8, spaceName: '第一空间' }, { spaceId: 99, spaceName: '当前空间新名称' }] })
    await initializeChatSessionSpace()
    expect(localStorage.getItem('spaceId')).toBe('99')
    expect(localStorage.getItem('spaceName')).toBe('当前空间新名称')
  })

  it('restores a cached space from a later page', async () => {
    mocks.load.mockResolvedValueOnce({ rows: [{ spaceId: 8, spaceName: '第一空间' }], hasMore: true, pageNum: 1 })
      .mockResolvedValueOnce({ rows: [{ spaceId: 99, spaceName: '后续页空间' }], hasMore: false, pageNum: 2 })
    await initializeChatSessionSpace()
    expect(mocks.load).toHaveBeenNthCalledWith(2, 2, '', true)
    expect(localStorage.getItem('spaceId')).toBe('99')
    expect(localStorage.getItem('spaceName')).toBe('后续页空间')
  })

  it('falls back to the initial first space after exhausting cached-space lookup', async () => {
    mocks.load.mockResolvedValueOnce({ rows: [{ spaceId: 8, spaceName: '第一空间' }], hasMore: true, pageNum: 1 })
      .mockResolvedValueOnce({ rows: [{ spaceId: 7, spaceName: '其他空间' }], hasMore: false, pageNum: 2 })
    await initializeChatSessionSpace()
    expect(localStorage.getItem('spaceId')).toBe('8')
    expect(localStorage.getItem('spaceName')).toBe('第一空间')
  })

  it.each([null, 'not-an-id'])('defaults to the first space for missing or invalid cache: %s', async cached => {
    if (cached === null) localStorage.removeItem('spaceId')
    else localStorage.setItem('spaceId', cached)
    mocks.load.mockResolvedValue({ rows: [{ spaceId: 8, spaceName: '第一空间' }], hasMore: true, pageNum: 1 })
    await initializeChatSessionSpace()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('spaceId')).toBe('8')
  })

  it('gives an explicit link priority over a valid cached space', async () => {
    mocks.load.mockResolvedValue({ rows: [{ spaceId: 99, spaceName: '缓存空间' }, { spaceId: 7, spaceName: '链接空间' }] })
    await initializeChatSessionSpace('7')
    expect(localStorage.getItem('spaceId')).toBe('7')
    expect(localStorage.getItem('spaceName')).toBe('链接空间')
  })

  it('resolves an explicitly linked space, including its name on later pages', async () => {
    mocks.load.mockResolvedValueOnce({ rows: [{ spaceId: 8, spaceName: '第一空间' }], hasMore: true, pageNum: 1 })
      .mockResolvedValueOnce({ rows: [{ spaceId: 7, spaceName: '链接空间' }], hasMore: false, pageNum: 2 })
    await initializeChatSessionSpace('7')
    expect(localStorage.getItem('spaceId')).toBe('7')
    expect(localStorage.getItem('spaceName')).toBe('链接空间')
  })

  it('does not enter an inaccessible explicit space', async () => {
    mocks.load.mockResolvedValue({ rows: [], hasMore: false })
    await expect(initializeChatSessionSpace('99')).rejects.toThrow('指定空间不可访问')
    expect(localStorage.getItem('spaceId')).toBe('99')
  })

  it('clears stale names when no spaces are available', async () => {
    mocks.load.mockResolvedValue({ rows: [] })
    await initializeChatSessionSpace()
    expect(localStorage.getItem('spaceId')).toBeNull()
    expect(localStorage.getItem('spaceName')).toBeNull()
  })

  it('does not continue after a failed space request', async () => {
    mocks.load.mockRejectedValue(new Error('failed'))
    await expect(initializeChatSessionSpace()).rejects.toThrow('failed')
    expect(localStorage.getItem('spaceId')).toBe('99')
  })

  it('does not publish the cached space when a later page request fails', async () => {
    mocks.load.mockResolvedValueOnce({ rows: [{ spaceId: 8, spaceName: '第一空间' }], hasMore: true, pageNum: 1 })
      .mockRejectedValueOnce(new Error('failed'))
    await expect(initializeChatSessionSpace()).rejects.toThrow('failed')
    expect(localStorage.getItem('spaceId')).toBe('99')
    expect(localStorage.getItem('spaceName')).toBe('旧空间')
  })

  it('clears space caches and does not request spaces when unauthenticated', async () => {
    mocks.token = ''
    await initializeChatSessionSpace()
    expect(mocks.load).not.toHaveBeenCalled()
    expect(localStorage.getItem('spaceId')).toBeNull()
    expect(localStorage.getItem('spaceName')).toBeNull()
  })

  it('does not overwrite a newer account with a late response', async () => {
    mocks.load.mockImplementation(async () => {
      mocks.token = 'account-b'
      localStorage.setItem('spaceId', '7')
      localStorage.setItem('spaceName', '新账号空间')
      return { rows: [{ spaceId: 8, spaceName: '旧账号空间' }] }
    })
    await expect(initializeChatSessionSpace()).rejects.toThrow('登录账号已变更')
    expect(localStorage.getItem('spaceId')).toBe('7')
    expect(localStorage.getItem('spaceName')).toBe('新账号空间')
  })
})
