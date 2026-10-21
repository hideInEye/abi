import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const paths: Record<string, string> = { home: '/home', 'ai-assistant_conversational-analysis': '/ai-assistant/conversational-analysis' }
  return {
    query: 'redirect=%2Fhome',
    push: vi.fn(),
    paths,
    nameForPath: (pathname: string) => Object.keys(paths).find(name => paths[name] === pathname),
  }
})
vi.mock('@sa/simple-router', () => ({
  useRoute: () => ({ fullPath: '/login' }),
  useRouter: () => ({
    push: mocks.push,
    resolve: ({ pathname }: { pathname: string }) => ({ name: mocks.nameForPath(pathname) }),
    getRouteByName: (name: string) => mocks.paths[name] ? { name, path: mocks.paths[name] } : undefined,
  }),
}))
vi.mock('@/router/elegant/transform', () => ({ getRouteName: mocks.nameForPath, getRoutePath: (name: string) => mocks.paths[name] }))
vi.mock('@/store', () => ({ store: { getState: () => ({}) } }))
vi.mock('@/store/slice/route', () => ({
  getAuthRoutes: () => Object.keys(mocks.paths).map(name => ({ name })),
  getConstantRoutes: () => [],
  getRouteHome: () => 'ai-assistant_conversational-analysis',
}))
vi.mock('@/utils/chatWindow', () => ({ getChatStandaloneUrl: () => '/chat-ui/#/chat' }))
vi.mock('@/utils/storage', () => ({ localStg: { get: () => ({ roles: [] }) } }))

import { useRouterPush } from './routerPush'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.query = 'redirect=%2Fhome'
  vi.stubGlobal('window', { location: { origin: 'http://localhost:9527', replace: vi.fn() } })
  vi.stubGlobal('localStorage', { getItem: () => null })
  vi.stubGlobal('useSearchParams', () => [new URLSearchParams(mocks.query)])
})
afterEach(() => vi.unstubAllGlobals())

describe('Chat logout login destination', () => {
  it('honors the explicit ABI home destination even when the role defaults to Chat', async () => {
    await useRouterPush().redirectFromLogin()
    expect(mocks.push).toHaveBeenCalledWith('/home')
    expect(window.location.replace).not.toHaveBeenCalled()
  })

  it('does not change the existing login return behavior for other Chat entry flows', async () => {
    mocks.query = 'redirect=%2Fchat-ui%2F%23%2Fchat%2Fconversation%2F123'
    await useRouterPush().redirectFromLogin()
    expect(window.location.replace).toHaveBeenCalledWith('/chat-ui/#/chat/conversation/123')
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
