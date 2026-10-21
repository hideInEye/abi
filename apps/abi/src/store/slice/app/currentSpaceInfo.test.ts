import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/locales', () => ({ setLng: vi.fn() }))
vi.mock('@/utils/storage', () => ({ localStg: { get: vi.fn(), set: vi.fn() } }))
vi.mock('../theme', () => ({ getThemeSettings: vi.fn() }))

import { appSlice, getCurrentSpaceInfo, getSpaceId, setCurrentSpaceInfo } from './index'

beforeEach(() => {
  const cache = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: string) => cache.set(key, value),
    removeItem: (key: string) => cache.delete(key),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('current space store and cache', () => {
  it('starts without restoring a historical space before session initialization', () => {
    localStorage.setItem('spaceId', '200')
    localStorage.setItem('spaceName', '旧空间')
    const app = appSlice.getInitialState()
    expect(getCurrentSpaceInfo({ app })).toBeNull()
    expect(getSpaceId({ app })).toBe(0)
  })

  it('keeps one selected space object and projects the legacy ID selector', () => {
    const selected = { spaceId: 160, spaceName: '账户交易风控分析空间' }
    const app = appSlice.reducer(undefined, setCurrentSpaceInfo(selected))
    expect(getCurrentSpaceInfo({ app })).toEqual(selected)
    expect(getSpaceId({ app })).toBe(160)
    expect(app).not.toHaveProperty('spaceId')
    expect(localStorage.getItem('spaceId')).toBe('160')
    expect(localStorage.getItem('spaceName')).toBe(selected.spaceName)
  })

  it('updates ID and name together and repairs stale name cache even for the same selection', () => {
    let app = appSlice.reducer(undefined, setCurrentSpaceInfo({ spaceId: 200, spaceName: '风控测试' }))
    app = appSlice.reducer(app, setCurrentSpaceInfo({ spaceId: 160, spaceName: '账户交易风控分析空间' }))
    localStorage.setItem('spaceName', '风控测试')
    const next = appSlice.reducer(app, setCurrentSpaceInfo({ spaceId: 160, spaceName: '账户交易风控分析空间' }))
    expect(next).toBe(app)
    expect(localStorage.getItem('spaceName')).toBe('账户交易风控分析空间')
    expect(getSpaceId({ app: next })).toBe(160)
  })

  it('clears the selected space and both compatibility cache keys', () => {
    const app = appSlice.reducer(undefined, setCurrentSpaceInfo({ spaceId: 160, spaceName: '空间' }))
    const next = appSlice.reducer(app, setCurrentSpaceInfo(null))
    expect(getCurrentSpaceInfo({ app: next })).toBeNull()
    expect(getSpaceId({ app: next })).toBe(0)
    expect(localStorage.getItem('spaceId')).toBeNull()
    expect(localStorage.getItem('spaceName')).toBeNull()
  })

  it.each([
    { spaceId: 0, spaceName: '无效' },
    { spaceId: NaN, spaceName: '无效' },
    { spaceId: 200, spaceName: ' ' },
  ])('does not replace the selection with incomplete data: %j', (invalid) => {
    const app = appSlice.reducer(undefined, setCurrentSpaceInfo({ spaceId: 160, spaceName: '空间' }))
    expect(appSlice.reducer(app, setCurrentSpaceInfo(invalid))).toBe(app)
    expect(localStorage.getItem('spaceId')).toBe('160')
  })

  it('keeps the in-memory selection usable when localStorage cannot be written', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const app = appSlice.reducer(undefined, setCurrentSpaceInfo({ spaceId: 160, spaceName: '空间' }))
    expect(getCurrentSpaceInfo({ app })).toEqual({ spaceId: 160, spaceName: '空间' })
  })
})
