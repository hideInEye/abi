import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: { token: 'a', authSessionVersion: 1 }, reset: vi.fn(), dispatch: vi.fn(),
  syncAuth: vi.fn(() => 'sync-auth'),
}))
vi.mock('../store', () => ({ store: { dispatch: mocks.dispatch } }))
vi.mock('../store/slice/auth', () => ({ syncAuthFromStorage: mocks.syncAuth }))
vi.mock('../utils/auth', () => ({ resetLoginExpiredState: mocks.reset }))
vi.mock('../utils/storage', () => ({ localStg: { get: (key: keyof typeof mocks.session) => mocks.session[key] } }))
import { startAbiSessionSync } from './sessionSync'

let stop: () => void
beforeEach(() => {
  mocks.session = { token: 'a', authSessionVersion: 1 }
  vi.clearAllMocks()
  vi.stubEnv('VITE_STORAGE_PREFIX', 'SOY-REACT_')
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { pathname: '/workbench/ontology-kg', search: '', hash: '', reload: vi.fn(), replace: vi.fn() } }))
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
  stop = startAbiSessionSync()
})
afterEach(() => { stop(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('ABI cross-tab session integration', () => {
  it('syncs the current user without changing the page or theme after another app logs in', () => {
    mocks.session = { token: 'b', authSessionVersion: 2 }
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'SOY-REACT_authSessionVersion' }))
    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(mocks.syncAuth).toHaveBeenCalledWith({ resetTheme: false })
    expect(mocks.dispatch).toHaveBeenCalledWith('sync-auth')
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(mocks.session.token).toBe('b')
  })
  it('ignores remote logout and accepts the next completed login', () => {
    mocks.session.token = ''
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'SOY-REACT_token' }))
    window.dispatchEvent(Object.assign(new Event('storage'), { key: null }))
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mocks.dispatch).not.toHaveBeenCalled()
    expect(mocks.reset).not.toHaveBeenCalled()
    mocks.session = { token: 'b', authSessionVersion: 2 }
    window.dispatchEvent(new Event('focus'))
    expect(mocks.dispatch.mock.calls).toEqual([['sync-auth']])
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(window.location.reload).not.toHaveBeenCalled()
  })
  it('leaves the login page to its existing session restoration flow', () => {
    window.location.pathname = '/login'
    mocks.session = { token: 'b', authSessionVersion: 2 }
    window.dispatchEvent(new Event('focus'))
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })
})
