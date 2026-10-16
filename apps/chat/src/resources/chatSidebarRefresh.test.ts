import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import { getChatBootstrapKeys } from './chatBootstrapKeys'
import { RequestResource } from './requestResource'

// Execute the real resource/hook code with hook subscriptions exposed; no separate DOM dependency is required.
function loadSource(path: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const exports: Record<string, any> = {}
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  runInNewContext(code, {
    exports,
    AbortController,
    window: { location: { hash: '#/chat/task/new' } },
    require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
      return dependencies[name]
    },
  })
  return exports
}

function createHarness() {
  let contextValue: any
  let userName = 'tester'
  let spaceId = 1
  const effects: Array<() => unknown> = []
  const subscriptions: Array<{ notify: ReturnType<typeof vi.fn>; stop: () => void }> = []
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => contextValue,
    useCallback: (callback: unknown) => callback,
    useMemo: (callback: () => unknown) => callback(),
    useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
    useEffect: (effect: () => unknown) => effects.push(effect),
    useSyncExternalStore: (subscribe: (listener: () => void) => () => void, getSnapshot: () => unknown) => {
      const notify = vi.fn()
      subscriptions.push({ notify, stop: subscribe(notify) })
      return getSnapshot()
    },
  }
  const api = {
    fetchAppList: vi.fn().mockResolvedValue({ data: [{ chat_id: 'a', title: 'old' }] }),
    fetchSessionGroupList: vi.fn().mockResolvedValue({ data: [{ groupId: 'g' }] }),
    fetchModelList: vi.fn().mockResolvedValue({ data: [] }),
    fetchSemanticTree: vi.fn().mockResolvedValue({ data: [] }),
  }
  const bootstrap = loadSource('./chatBootstrap.tsx', {
    react,
    'react/jsx-runtime': { jsx: (_type: unknown, props: any) => { contextValue = props.value; return props } },
    '@/constant': { CHAT_MODE: 'chat_normal' },
    '@/components/performance/useAfterFirstPaint': { useAfterFirstPaint: () => true },
    '@/utils/runtime': { getSpaceId: () => spaceId },
    '@/utils/identity': { getCurrentUser: () => ({ userName }), subscribeCurrentUser: vi.fn() },
    './chatBootstrapKeys': { getChatBootstrapKeys },
    './requestResource': { RequestResource },
    '@/service/api/app': api,
    '@/service/api/abi-system': api,
    '@/service/api/semantic': api,
  })
  bootstrap.ChatBootstrapProvider({ children: null })
  const history = loadSource('../hooks/layout/useHistoryTopics.ts', {
    react,
    '@/resources/chatBootstrap': bootstrap,
    '@/constant/layout': { fallbackTopics: [] },
    '@/utils/layout': { normalizeTopicsFromApi: (data: unknown) => data },
  })
  return {
    api, bootstrap, effects, subscriptions,
    actions: () => bootstrap.useChatBootstrap(),
    history: () => history.useHistoryTopics(),
    switchIdentity: (name: string, nextSpace: number) => {
      userName = name
      spaceId = nextSpace
      bootstrap.ChatBootstrapProvider({ children: null })
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('Chat sidebar loading boundaries', () => {
  it('keeps sidebar and space-selector lazy boundaries independent of route readiness', () => {
    const source = readFileSync(new URL('../pages/chat/route.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('useAfterFirstPaint')
    expect(source).not.toContain('chromeReady')
    for (const loader of ['loadWorkbenchSidebarPanels', 'loadSpaceSelector', 'loadScheduleTaskDrawer']) {
      expect(source).toContain(`loader={${loader}}`)
    }
    expect(source).toContain("import('@/components/layout/WorkbenchSidebarPanels')")
    expect(source).toContain('{scheduleOpen && (')
  })

  it('starts bootstrap requests without a fixed delay', () => {
    const source = readFileSync(new URL('./chatBootstrap.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('1200')
    expect(source).not.toContain('useAfterFirstPaint')
  })
})

describe('Chat resource subscriptions', () => {
  it('does not subscribe the shared provider or action-only consumers to resource snapshots', () => {
    const harness = createHarness()
    harness.actions()
    expect(harness.subscriptions).toHaveLength(0)
    expect(harness.actions()).not.toHaveProperty('conversations')
    expect(harness.actions()).not.toHaveProperty('models')
  })

  it('notifies only the subscribers of the resource that changed', async () => {
    const harness = createHarness()
    const cases = [
      ['useChatConversations', 'loadConversations'],
      ['useChatGroups', 'loadGroups'],
      ['useChatModels', 'loadModels'],
      ['useChatSemantic', 'loadSemantic'],
    ]
    for (const [hook] of cases) harness.bootstrap[hook]()
    expect(harness.subscriptions).toHaveLength(4)
    for (const [index, [, load]] of cases.entries()) {
      harness.subscriptions.forEach(subscription => subscription.notify.mockClear())
      await harness.actions()[load]()
      harness.subscriptions.forEach((subscription, position) => {
        expect(subscription.notify).toHaveBeenCalledTimes(position === index ? 2 : 0)
      })
    }
    harness.subscriptions.forEach(subscription => subscription.stop())
  })

  it('retains list request deduplication and success caching', async () => {
    const harness = createHarness()
    const load = harness.actions().loadConversations
    const first = load()
    const second = load()
    expect(first).toBe(second)
    await first
    await load()
    expect(harness.api.fetchAppList).toHaveBeenCalledOnce()
    expect(harness.api.fetchAppList).toHaveBeenCalledWith(
      { chat_mode: 'chat_normal', space_id: 1, create_by: 'tester' }, expect.any(AbortSignal),
    )
  })

  it('does not show another space or user list while the new identity loads', async () => {
    const harness = createHarness()
    await harness.actions().loadConversations()
    harness.switchIdentity('tester', 2)
    expect(harness.history().historyApps).toEqual([])
    expect(harness.history().historyLoading).toBe(true)
    harness.switchIdentity('other-user', 1)
    expect(harness.history().historyApps).toEqual([])
    expect(harness.history().historyLoading).toBe(true)
  })
})

describe('Recent conversations background refresh', () => {
  it('shows a local loading indicator before the first list response', async () => {
    const harness = createHarness()
    expect(harness.history().historyLoading).toBe(true)
    const request = harness.history().loadHistoryTopics()
    expect(harness.history().historyLoading).toBe(true)
    await request
    expect(harness.history().historyLoading).toBe(false)
  })

  it.each([{ rows: [] }, { rows: [{ chat_id: 'old' }] }])('keeps an existing list visible while refreshing: $rows', async ({ rows }) => {
    const harness = createHarness()
    harness.actions().updateConversations(() => rows)
    const pending = deferred<{ data: unknown[] }>()
    harness.api.fetchAppList.mockReturnValueOnce(pending.promise)
    const request = harness.history().loadHistoryTopics({ force: true })
    expect(harness.history().historyLoading).toBe(false)
    expect(harness.history().historyApps).toBe(rows)
    pending.resolve({ data: [{ chat_id: 'new' }] })
    await request
    expect(harness.history().historyApps).toEqual([{ chat_id: 'new' }])
  })

  it('preserves the old list and rejects the refresh when the request fails', async () => {
    const harness = createHarness()
    const oldRows = [{ chat_id: 'old' }]
    harness.actions().updateConversations(() => oldRows)
    harness.api.fetchAppList.mockRejectedValueOnce(new Error('network failed'))
    await expect(harness.history().loadHistoryTopics({ force: true })).rejects.toThrow('network failed')
    expect(harness.history().historyApps).toBe(oldRows)
    expect(harness.history().historyLoading).toBe(false)
  })
})
