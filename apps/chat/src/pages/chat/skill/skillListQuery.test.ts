import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// 调用清单：技能商店 index.tsx -> querySkillList、fetchFavoriteList。
const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

function setup() {
  const initializers: Record<string, string> = {}
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ['fetchList', 'fetchMyIds'].includes(node.name.getText(ast))) {
      initializers[node.name.getText(ast)] = node.initializer!.getText(ast)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const context = {
    getSpaceId: vi.fn(() => 164),
    querySkillList: vi.fn().mockResolvedValue({ code: 200, data: [] }),
    fetchFavoriteList: vi.fn().mockResolvedValue({ code: 200, rows: [] }),
    setLoading: vi.fn(),
    setFavLoading: vi.fn(),
    setMyIds: vi.fn(),
    setCards: vi.fn(),
    setRawMap: vi.fn(),
    mapSkillToCard: vi.fn((item: { id: string }) => ({ key: item.id })),
    useCallback: (callback: () => Promise<void>) => callback,
  }
  const script = ts.transpileModule(`({ fetchList: ${initializers.fetchList}, fetchMyIds: ${initializers.fetchMyIds} })`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  const handlers = runInNewContext(script, context) as { fetchList: () => Promise<void>; fetchMyIds: () => Promise<void> }
  return { ...context, ...handlers }
}

describe('技能商店列表的空间参数', () => {
  it('技能列表不传空间，仅我的技能收藏列表传当前 spaceId', async () => {
    const h = setup()
    await h.fetchList()
    await h.fetchMyIds()
    expect(h.querySkillList).toHaveBeenCalledWith({})
    expect(h.fetchFavoriteList).toHaveBeenCalledWith({ favorType: 'skill', spaceId: 164 })
  })

  it('我的技能每次查询读取最新空间，技能列表仍不传空间', async () => {
    const h = setup()
    await h.fetchList()
    await h.fetchMyIds()
    h.getSpaceId.mockReturnValue(160)
    await h.fetchList()
    await h.fetchMyIds()
    expect(h.querySkillList).toHaveBeenLastCalledWith({})
    expect(h.fetchFavoriteList).toHaveBeenLastCalledWith({ favorType: 'skill', spaceId: 160 })
  })

  it('技能列表等待成功后才映射卡片与详情，保持原数据结构', async () => {
    const h = setup()
    let resolve!: (value: unknown) => void
    h.querySkillList.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = h.fetchList()
    expect(h.setCards).not.toHaveBeenCalled()
    const item = { id: '9', bizName: '测试技能' }
    resolve({ code: 200, data: [item] })
    await pending
    expect(h.mapSkillToCard).toHaveBeenCalledWith(item, 0, [item])
    expect(h.setCards).toHaveBeenCalledWith([{ key: '9' }])
    expect(h.setRawMap).toHaveBeenCalledWith({ '9': item })
  })

  it('收藏列表等待成功后才生成已收藏集合', async () => {
    const h = setup()
    let resolve!: (value: unknown) => void
    h.fetchFavoriteList.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = h.fetchMyIds()
    expect(h.setMyIds.mock.lastCall?.[0].size).toBe(0)
    resolve({ code: 200, rows: [{ favorId: '9' }, { skillId: '10' }] })
    await pending
    expect([...h.setMyIds.mock.lastCall![0]]).toEqual(['9', '10'])
  })

  it.each(['fetchList', 'fetchMyIds'] as const)('%s 不消费业务失败响应中的列表', async (handler) => {
    const h = setup()
    const failed = { code: 500, rows: [{ favorId: 'bad' }], data: [{ id: 'bad' }] }
    h.querySkillList.mockResolvedValueOnce(failed)
    h.fetchFavoriteList.mockResolvedValueOnce(failed)
    await h[handler]()
    expect(h.setCards).not.toHaveBeenCalled()
    expect(h.setRawMap).not.toHaveBeenCalled()
    expect(h.mapSkillToCard).not.toHaveBeenCalled()
    expect(h.setMyIds.mock.calls.every(([ids]) => ids.size === 0)).toBe(true)
  })

  it.each(['fetchList', 'fetchMyIds'] as const)('%s 网络失败停止加载且不生成成功数据', async (handler) => {
    const h = setup()
    h.querySkillList.mockRejectedValueOnce(new Error('offline'))
    h.fetchFavoriteList.mockRejectedValueOnce(new Error('offline'))
    await h[handler]()
    expect(h.mapSkillToCard).not.toHaveBeenCalled()
    expect(h.setMyIds.mock.calls.every(([ids]) => ids.size === 0)).toBe(true)
    const loading = handler === 'fetchList' ? h.setLoading : h.setFavLoading
    expect(loading).toHaveBeenLastCalledWith(false)
  })
})
