import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  current: { spaceId: 160, spaceName: '第一空间' } as { spaceId: number; spaceName: string } | null,
  token: 'account-a',
  dispatch: vi.fn(),
  permission: vi.fn(),
  details: vi.fn(),
  clear: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('react', () => ({ useCallback: (fn: unknown) => fn, useRef: (value: unknown) => ({ current: value }) }))
vi.mock('@/hooks/business/useStore', () => ({ useAppDispatch: () => mocks.dispatch }))
vi.mock('@/store', () => ({ store: { getState: () => mocks.current } }))
vi.mock('@/store/slice/app', () => ({
  getCurrentSpaceInfo: (state: unknown) => state,
  setCurrentSpaceInfo: (space: unknown) => ({ type: 'space', space }),
  setSpaceHidden: (hidden: boolean) => ({ type: 'hidden', hidden }),
}))
vi.mock('@/resources/currentSpaceInfo', () => ({ loadCurrentSpaceInfo: mocks.details }))
vi.mock('@/utils/cache', () => ({ clearConversationCache: mocks.clear }))
vi.mock('@/utils/chatWindow', () => ({ getChatStandaloneUrl: () => '/chat-ui/' }))
vi.mock('@/utils/storage', () => ({ localStg: { get: () => mocks.token, remove: mocks.remove } }))
vi.mock('@/service/api', () => ({ getSpaceMenuBySpaceIdApi: mocks.permission }))
import { useSpaceSwitch } from './useSpaceSwitch'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.current = { spaceId: 160, spaceName: '第一空间' }
  mocks.token = 'account-a'
  mocks.permission.mockReset().mockResolvedValue({ error: null, data: [] })
  mocks.details.mockReset().mockResolvedValue({ spaceId: 200, spaceName: '第二空间' })
  mocks.dispatch.mockImplementation((action) => {
    if (action.type === 'space') mocks.current = action.space
  })
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), open: vi.fn() })
  vi.stubGlobal(
    'CustomEvent',
    class {
      constructor(
        public type: string,
        public options: unknown,
      ) {}
    },
  )
  vi.stubGlobal('localStorage', { setItem: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

describe('space switch workflow (getSpaceMenuBySpaceIdApi / loadCurrentSpaceInfo)', () => {
  it('waits for permission success before committing both fields and opening Chat', async () => {
    let resolve!: (result: unknown) => void
    mocks.permission.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { switchToSpace } = useSpaceSwitch()
    const pending = switchToSpace(200, undefined, { spaceName: '第二空间', chatId: 10 })
    expect(mocks.dispatch).not.toHaveBeenCalled()
    expect(mocks.clear).not.toHaveBeenCalled()
    resolve({ error: null, data: [] })
    await expect(pending).resolves.toBe(true)
    expect(mocks.current).toEqual({ spaceId: 200, spaceName: '第二空间' })
    expect(mocks.details).not.toHaveBeenCalled()
    expect(localStorage.setItem).toHaveBeenCalledWith('chatId', '10')
    expect(window.open).toHaveBeenCalledWith('/chat-ui/', '_blank', 'noopener,noreferrer')
  })

  it('resolves the name for an ID-only business entry before committing', async () => {
    await expect(useSpaceSwitch().switchToSpace(200)).resolves.toBe(true)
    expect(mocks.details).toHaveBeenCalledWith(200)
    expect(mocks.current).toEqual({ spaceId: 200, spaceName: '第二空间' })
  })

  it.each(['permission', 'network', 'details'])('does not commit, clear caches or navigate after %s failure', async (kind) => {
    if (kind === 'permission') mocks.permission.mockResolvedValueOnce({ error: new Error('拒绝'), data: [] })
    if (kind === 'network') mocks.permission.mockRejectedValueOnce(new Error('网络失败'))
    if (kind === 'details') mocks.details.mockRejectedValueOnce(new Error('名称缺失'))
    await expect(useSpaceSwitch().switchToSpace(200, '/chat-ui/')).resolves.toBe(false)
    expect(mocks.dispatch).not.toHaveBeenCalled()
    expect(mocks.clear).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })

  it.each(['account', 'selection'])('does not overwrite a newer %s while permissions are pending', async (change) => {
    let resolve!: (result: unknown) => void
    mocks.permission.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = useSpaceSwitch().switchToSpace(200, undefined, { spaceName: '第二空间' })
    if (change === 'account') mocks.token = 'account-b'
    if (change === 'selection') mocks.current = { spaceId: 300, spaceName: '第三空间' }
    resolve({ error: null, data: [] })
    await expect(pending).resolves.toBe(false)
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('keeps the latest choice when two switches finish out of order', async () => {
    let resolve!: (result: unknown) => void
    mocks.permission.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { switchToSpace } = useSpaceSwitch()
    const old = switchToSpace(200, undefined, { spaceName: '第二空间' })
    await expect(switchToSpace(300, undefined, { spaceName: '第三空间' })).resolves.toBe(true)
    resolve({ error: null, data: [] })
    await expect(old).resolves.toBe(false)
    expect(mocks.current).toEqual({ spaceId: 300, spaceName: '第三空间' })
  })
})
