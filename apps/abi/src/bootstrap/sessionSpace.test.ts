import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ load: vi.fn(), dispatch: vi.fn(), token: 'account-a' }))
vi.mock('../resources/spaceListResource', () => ({ loadSpaceListPage: mocks.load, invalidateSpaceListPages: vi.fn() }))
vi.mock('../store', () => ({ store: { dispatch: mocks.dispatch } }))
vi.mock('../store/slice/app', () => ({ setCurrentSpaceInfo: (value: unknown) => ({ type: 'space', value }), setSpaceHidden: (value: boolean) => ({ type: 'hidden', value }) }))
vi.mock('../utils/storage', () => ({ localStg: { get: () => mocks.token } }))

import { initializeSessionSpace } from './sessionSpace'

beforeEach(() => {
  mocks.token = 'account-a'
  mocks.dispatch.mockReset().mockImplementation(action => {
    if (action.type === 'space') {
      if (action.value) {
        localStorage.setItem('spaceId', String(action.value.spaceId))
        localStorage.setItem('spaceName', action.value.spaceName)
      } else {
        localStorage.removeItem('spaceId')
        localStorage.removeItem('spaceName')
      }
    }
  })
  mocks.load.mockReset()
  const storage = new Map<string, string>([['spaceId', '99'], ['spaceName', '旧空间']])
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
})
afterEach(() => vi.unstubAllGlobals())

describe('ABI session space initialization', () => {
  it('selects the first server space and updates its name and ID before continuing', async () => {
    mocks.load.mockResolvedValue({ rows: [{ spaceId: 8, spaceName: '第一空间' }, { spaceId: 99, spaceName: '旧空间' }] })
    await initializeSessionSpace()
    expect(mocks.load).toHaveBeenCalledWith(1, '', true)
    expect(localStorage.getItem('spaceId')).toBe('8')
    expect(localStorage.getItem('spaceName')).toBe('第一空间')
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'space', value: { spaceId: 8, spaceName: '第一空间' } })
  })

  it('does not keep a cached space when the account has no spaces', async () => {
    mocks.load.mockResolvedValue({ rows: [] })
    await initializeSessionSpace()
    expect(localStorage.getItem('spaceId')).toBeNull()
    expect(localStorage.getItem('spaceName')).toBeNull()
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'space', value: null })
  })

  it('rejects failures instead of continuing with the cached space', async () => {
    mocks.load.mockRejectedValue(new Error('failed'))
    await expect(initializeSessionSpace()).rejects.toThrow('failed')
    expect(localStorage.getItem('spaceName')).toBeNull()
    expect(mocks.dispatch).not.toHaveBeenCalledWith({ type: 'space', value: expect.objectContaining({ spaceId: 99 }) })
  })

  it('ignores a delayed old-account response and shares concurrent initialization', async () => {
    let finish!: (value: unknown) => void
    mocks.load.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const first = initializeSessionSpace()
    expect(initializeSessionSpace()).toBe(first)
    mocks.token = 'account-b'
    localStorage.setItem('spaceId', '7')
    localStorage.setItem('spaceName', '新账号空间')
    finish({ rows: [{ spaceId: 8, spaceName: '旧账号空间' }] })
    await expect(first).rejects.toThrow('登录账号已变更')
    expect(localStorage.getItem('spaceId')).toBe('7')
    expect(localStorage.getItem('spaceName')).toBe('新账号空间')
  })

  it('does not request spaces without a token', async () => {
    mocks.token = ''
    await initializeSessionSpace()
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
