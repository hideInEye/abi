import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 覆盖调用文件与接口函数清单：
// 1. pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx -> openAkList -> fetchShareApiKeyListApi
// 2. pages/component/applications/api-key/components/ShareAssistantDrawer.tsx -> loadList -> fetchShareListByApiKeyApi

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../request', () => ({ apiRequest }))

import { fetchShareApiKeyListApi, fetchShareListByApiKeyApi } from './share'

describe('share API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('queries bound API-Keys by share_code via the sharelist path', () => {
    fetchShareApiKeyListApi('share-code-1')

    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', url: '/api/dashboard/api/v1/project/sharelist/share-code-1' })
  })

  it('queries shares by shareKey via the shareByApiKey path', () => {
    fetchShareListByApiKeyApi({ shareKey: 'ak-1' })

    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', url: '/api/dashboard/api/v1/project/shareByApiKey', params: { shareKey: 'ak-1' } })
  })

  it('supports comma-separated multi-select type filters', () => {
    fetchShareListByApiKeyApi({ shareKey: 'ak-1', type: 'react,workflow' })

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: '/api/dashboard/api/v1/project/shareByApiKey',
      params: { shareKey: 'ak-1', type: 'react,workflow' },
    })
  })
})

const shareRecordListSource = readFileSync(new URL('../../pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx', import.meta.url), 'utf8')
const shareAssistantDrawerSource = readFileSync(new URL('../../pages/component/applications/api-key/components/ShareAssistantDrawer.tsx', import.meta.url), 'utf8')

function parse(source: string) {
  return ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function findNodes<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const matches: T[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(root)
  return matches
}

function evaluate(expression: string, context: Record<string, unknown> = {}) {
  const script = ts.transpileModule(`const result = ${expression}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return runInNewContext(`${script}; result`, context)
}

function getCallback(source: string, name: string, context: Record<string, unknown>) {
  const file = parse(source)
  const declaration = findNodes(file, ts.isVariableDeclaration).find(node => node.name.getText(file) === name)
  expect(declaration?.initializer).toBeDefined()
  return evaluate(declaration!.initializer!.getText(file), context) as (...args: unknown[]) => Promise<void>
}

/** 与 ShareRecordList.tsx 内 parseApiKeys 相同的兼容实现 */
function parseApiKeys(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function createOpenAkList(overrides: Record<string, unknown> = {}) {
  const context = {
    fetchShareApiKeyListApi: vi.fn(),
    parseApiKeys,
    setAkList: vi.fn(),
    setAkLoading: vi.fn(),
    setAkRecord: vi.fn(),
    ...overrides,
  }
  return { ...context, openAkList: getCallback(shareRecordListSource, 'openAkList', context) }
}

describe('ShareRecordList openAkList', () => {
  it('reuses inline apiKeys without calling the sharelist endpoint', async () => {
    const ctx = createOpenAkList()
    await ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: ['ak-inline'] })

    expect(ctx.fetchShareApiKeyListApi).not.toHaveBeenCalled()
    expect(ctx.setAkList).toHaveBeenCalledWith(['ak-inline'])
    expect(ctx.setAkLoading).not.toHaveBeenCalled()
  })

  it('waits for the sharelist response before showing bound keys', async () => {
    const ctx = createOpenAkList()
    let resolve!: (result: unknown) => void
    ctx.fetchShareApiKeyListApi.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const pending = ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: [] })

    expect(ctx.setAkList).toHaveBeenCalledWith([])
    expect(ctx.setAkLoading).toHaveBeenCalledWith(true)
    expect(ctx.setAkList).toHaveBeenCalledTimes(1)

    resolve({ data: ['ak-1', 'ak-2'], error: null })
    await pending
    expect(ctx.setAkList).toHaveBeenLastCalledWith(['ak-1', 'ak-2'])
    expect(ctx.setAkLoading).toHaveBeenLastCalledWith(false)
  })

  it('parses object payloads containing apiKeys strings or record lists', async () => {
    const ctx = createOpenAkList()
    ctx.fetchShareApiKeyListApi.mockResolvedValueOnce({ data: { apiKeys: 'ak-1, ak-2' }, error: null })
    await ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: undefined })
    expect(ctx.setAkList).toHaveBeenLastCalledWith(['ak-1', 'ak-2'])

    ctx.fetchShareApiKeyListApi.mockResolvedValueOnce({ data: { records: ['ak-3'] }, error: null })
    await ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: undefined })
    expect(ctx.setAkList).toHaveBeenLastCalledWith(['ak-3'])
  })

  it.each([
    ['backend error', { data: null, error: new Error('backend failure') }],
    ['error without data', { error: new Error('backend failure') }],
  ])('blocks stale key display on %s', async (_label, result) => {
    const ctx = createOpenAkList()
    ctx.fetchShareApiKeyListApi.mockResolvedValueOnce(result)
    await ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: [] })
    expect(ctx.setAkList).toHaveBeenLastCalledWith([])
    expect(ctx.setAkLoading).toHaveBeenLastCalledWith(false)
  })

  it('keeps loading reset and empty list when the request rejects', async () => {
    const ctx = createOpenAkList()
    ctx.fetchShareApiKeyListApi.mockRejectedValueOnce(new Error('network failure'))
    await ctx.openAkList({ id: '1', shareCode: 'c1', apiKeys: [] })
    expect(ctx.setAkList).toHaveBeenLastCalledWith([])
    expect(ctx.setAkLoading).toHaveBeenLastCalledWith(false)
  })
})

function createLoadList(overrides: Record<string, unknown> = {}) {
  const context = {
    currentSpaceId: 10,
    fetchAppListApi: vi.fn().mockResolvedValue({
      data: { rows: [{ appId: 'p1', appName: '助手A', createBy: 'u1', createTime: '2026-10-01T10:00:00' }] },
    }),
    fetchShareListByApiKeyApi: vi.fn().mockResolvedValue({ data: [{ projectId: 'p1', shareUrl: 'http://x/s/1', createTime: '2026-10-02T10:00:00' }] }),
    setLoading: vi.fn(),
    setRows: vi.fn(),
    useCallback: (fn: unknown) => fn,
    ...overrides,
  }
  return { ...context, loadList: getCallback(shareAssistantDrawerSource, 'loadList', context) }
}

describe('ShareAssistantDrawer loadList', () => {
  it('waits for both requests before mapping bound assistants', async () => {
    const ctx = createLoadList()
    let resolveShare!: (result: unknown) => void
    ctx.fetchShareListByApiKeyApi.mockReturnValueOnce(new Promise(done => { resolveShare = done }))
    const pending = ctx.loadList('ak-1')

    expect(ctx.setRows).not.toHaveBeenCalled()
    resolveShare({ data: [{ projectId: 'p1', shareUrl: 'http://x/s/1' }], error: null })
    await pending

    expect(ctx.fetchShareListByApiKeyApi).toHaveBeenCalledWith({ shareKey: 'ak-1', type: 'react' })
    expect(ctx.setRows).toHaveBeenCalledWith([
      { id: 'p1', name: '助手A', shareUrl: 'http://x/s/1', createBy: 'u1', createTime: '2026-10-01 10:00:00' },
    ])
    expect(ctx.setLoading).toHaveBeenLastCalledWith(false)
  })

  it('dedupes assistants by projectId and falls back to share record fields', async () => {
    const ctx = createLoadList({
      fetchAppListApi: vi.fn().mockResolvedValue({ data: { rows: [] } }),
      fetchShareListByApiKeyApi: vi.fn().mockResolvedValue({
        data: [
          { projectId: 'p1', appName: '助手B', shareUrl: 'http://x/s/1', createTime: '2026-10-02T10:00:00' },
          { projectId: 'p1', appName: '助手B', shareUrl: 'http://x/s/2' },
        ],
      }),
    })
    await ctx.loadList('ak-1')

    expect(ctx.setRows).toHaveBeenCalledWith([
      { id: 'p1', name: '助手B', shareUrl: 'http://x/s/1', createBy: '-', createTime: '2026-10-02 10:00:00' },
    ])
  })

  it('blocks row display when the share request fails', async () => {
    const ctx = createLoadList({
      fetchShareListByApiKeyApi: vi.fn().mockRejectedValue(new Error('network failure')),
    })
    await ctx.loadList('ak-1')
    expect(ctx.setRows).toHaveBeenCalledWith([])
    expect(ctx.setLoading).toHaveBeenLastCalledWith(false)
  })

  it('shows an empty list when the share response carries an error', async () => {
    const ctx = createLoadList({
      fetchShareListByApiKeyApi: vi.fn().mockResolvedValue({ data: undefined, error: new Error('backend failure') }),
    })
    await ctx.loadList('ak-1')
    expect(ctx.setRows).toHaveBeenCalledWith([])
    expect(ctx.setLoading).toHaveBeenLastCalledWith(false)
  })
})
