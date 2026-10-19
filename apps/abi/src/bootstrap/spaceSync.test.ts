import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  token: 'account-a',
  current: { spaceId: 160, spaceName: '第一空间' } as { spaceId: number; spaceName: string } | null,
  load: vi.fn(),
  dispatch: vi.fn(),
}))
vi.mock('../resources/currentSpaceInfo', () => ({ loadCurrentSpaceInfo: mocks.load }))
vi.mock('../store', () => ({ store: { getState: () => mocks.current, dispatch: mocks.dispatch } }))
vi.mock('../store/slice/app', () => ({ getCurrentSpaceInfo: (state: unknown) => state, setCurrentSpaceInfo: (space: unknown) => space }))
vi.mock('../utils/storage', () => ({ localStg: { get: () => mocks.token } }))
import { startAbiSpaceSync } from './spaceSync'

let stop: (() => void) | undefined
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
const emitStorage = () => window.dispatchEvent(Object.assign(new Event('storage'), { key: 'spaceId' }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.token = 'account-a'
  mocks.current = { spaceId: 160, spaceName: '第一空间' }
  const cache = new Map([
    ['spaceId', '160'],
    ['spaceName', '第一空间'],
  ])
  vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) ?? null, setItem: (key: string, value: string) => cache.set(key, value), removeItem: (key: string) => cache.delete(key) })
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { pathname: '/workbench' } }))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
  mocks.dispatch.mockImplementation((space) => {
    mocks.current = space
  })
  mocks.load.mockReset().mockResolvedValue({ spaceId: 200, spaceName: '第二空间' })
  stop = startAbiSpaceSync()
})
afterEach(() => {
  stop?.()
  vi.unstubAllGlobals()
})

describe('ABI space synchronization', () => {
  it('does not read stale cache on ordinary clicks or dropdown close clicks', async () => {
    localStorage.setItem('spaceName', '旧名称')
    document.dispatchEvent(new Event('click'))
    window.dispatchEvent(new Event('click'))
    await flush()
    expect(mocks.load).not.toHaveBeenCalled()
    expect(mocks.current).toEqual({ spaceId: 160, spaceName: '第一空间' })
  })

  it('resolves external IDs before setting a complete selection and deduplicates concurrent events', async () => {
    let resolve!: (space: unknown) => void
    mocks.load.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    localStorage.setItem('spaceId', '200')
    emitStorage()
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(mocks.dispatch).not.toHaveBeenCalled()
    resolve({ spaceId: 200, spaceName: '第二空间' })
    await flush()
    expect(mocks.dispatch).toHaveBeenCalledWith({ spaceId: 200, spaceName: '第二空间' })
  })

  it('repairs a mismatched name using details, not the cached name', async () => {
    localStorage.setItem('spaceName', '第二空间')
    mocks.load.mockResolvedValueOnce({ spaceId: 160, spaceName: '第一空间' })
    window.dispatchEvent(new Event('focus'))
    await flush()
    expect(mocks.dispatch).toHaveBeenCalledWith({ spaceId: 160, spaceName: '第一空间' })
  })

  it('does not clear another window on logout or cache removal', async () => {
    localStorage.removeItem('spaceId')
    mocks.token = ''
    emitStorage()
    window.dispatchEvent(new Event('focus'))
    expect(mocks.load).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it.each(['account', 'selection', 'cache', 'stop'])('ignores a stale response after %s changes', async (change) => {
    let resolve!: (space: unknown) => void
    mocks.load.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    localStorage.setItem('spaceId', '200')
    emitStorage()
    if (change === 'account') mocks.token = 'account-b'
    if (change === 'selection') mocks.current = { spaceId: 300, spaceName: '手工选择' }
    if (change === 'cache') localStorage.setItem('spaceId', '300')
    if (change === 'stop') stop?.()
    resolve({ spaceId: 200, spaceName: '第二空间' })
    await flush()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('keeps the selection on failure and retries on the next focus', async () => {
    mocks.load.mockRejectedValueOnce(new Error('failed'))
    localStorage.setItem('spaceId', '200')
    emitStorage()
    await flush()
    expect(mocks.dispatch).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('focus'))
    await flush()
    expect(mocks.dispatch).toHaveBeenCalledWith({ spaceId: 200, spaceName: '第二空间' })
  })

  it('leaves the login page to session initialization', () => {
    localStorage.setItem('spaceId', '200')
    window.location.pathname = '/login'
    emitStorage()
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
