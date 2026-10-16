import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(), dispatch: vi.fn(), set: vi.fn(), redirect: vi.fn(), success: vi.fn(), error: vi.fn(), end: vi.fn(),
}))
vi.mock('@sa/hooks', () => ({ useLoading: () => ({ endLoading: mocks.end, startLoading: vi.fn(), loading: false }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/bootstrap/sessionSpace', () => ({ initializeSessionSpace: mocks.initialize }))
vi.mock('@/store/slice/auth', () => ({ login: () => 'login', getUerName: () => 'name' }))
vi.mock('@/store/slice/route', () => ({ initAuthRoute: () => 'route', resetRouteStore: () => 'reset' }))
vi.mock('@/utils/auth', () => ({ resetLoginExpiredState: vi.fn() }))
vi.mock('@/utils/storage', () => ({ localStg: { set: mocks.set } }))
vi.mock('../business/useStore', () => ({ useAppDispatch: () => mocks.dispatch }))
vi.mock('./routerPush', () => ({ useRouterPush: () => ({ redirectFromLogin: mocks.redirect }) }))
import { useLogin } from './login'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.dispatch.mockImplementation(action => action === 'login' ? Promise.resolve({ payload: true }) : action === 'name' ? 'new-user' : undefined)
  mocks.initialize.mockResolvedValue(undefined)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { $notification: { success: mocks.success }, $message: { error: mocks.error } }))
})
afterEach(() => vi.unstubAllGlobals())

describe('login space initialization ordering', () => {
  const params = { username: 'new-user', password: 'test' }
  it('waits for the initial space before notifying other apps and navigating', async () => {
    let finish!: () => void
    mocks.initialize.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const pending = useLogin().toLogin(params, { current: null })
    await vi.waitFor(() => expect(mocks.initialize).toHaveBeenCalledOnce())
    expect(mocks.set).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalledWith('route')
    finish()
    expect(await pending).toBe(true)
    expect(mocks.set).toHaveBeenCalledWith('authSessionVersion', expect.any(Number))
    expect(mocks.dispatch).toHaveBeenCalledWith('route')
    expect(mocks.redirect).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledOnce()
  })
  it('does not redirect or show success if loading the first space fails', async () => {
    mocks.initialize.mockRejectedValue(new Error('空间列表加载失败'))
    expect(await useLogin().toLogin(params, { current: null })).toBe(false)
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('空间列表加载失败')
    expect(mocks.end).toHaveBeenCalledOnce()
  })
  it('does not publish a login or load spaces after rejected credentials', async () => {
    mocks.dispatch.mockImplementation(action => action === 'login' ? Promise.resolve({ payload: false }) : undefined)
    expect(await useLogin().toLogin(params, { current: null })).toBe(false)
    expect(mocks.set).not.toHaveBeenCalled()
    expect(mocks.initialize).not.toHaveBeenCalled()
  })
})
