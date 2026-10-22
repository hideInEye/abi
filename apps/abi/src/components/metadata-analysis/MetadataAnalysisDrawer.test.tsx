import type { EffectCallback } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MetadataAnalysisDrawer from './MetadataAnalysisDrawer'

const harness = vi.hoisted(() => ({
  effects: [] as EffectCallback[],
  setters: Array.from({ length: 4 }, () => vi.fn()),
  index: 0,
  query: vi.fn(),
  error: vi.fn(),
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [initial, harness.setters[harness.index++]],
  useEffect: (effect: EffectCallback) => { harness.effects.push(effect) },
}))
vi.mock('antd', () => ({ Segmented: () => null, message: { error: harness.error } }))
vi.mock('./request', () => ({ queryMetadataRelations: harness.query }))
vi.mock('./LineageGraph', () => ({ default: () => null }))
vi.mock('./LineageTree', () => ({ default: () => null }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({ default: () => null }))

function render(open = true, nodeId = '1') {
  harness.effects = []
  harness.index = 0
  MetadataAnalysisDrawer({ open, context: { nodeType: 'DIMENSION', nodeId, spaceId: 164 }, onClose: vi.fn() })
  return harness.effects[0]()
}

const flush = async () => { await Promise.resolve(); await Promise.resolve() }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('ASpin', () => null)
  vi.stubGlobal('localStorage', { getItem: () => '164' })
})

describe('分析抽屉异步生命周期', () => {
  it('关闭状态不发请求', () => {
    render(false)
    expect(harness.query).not.toHaveBeenCalled()
  })

  it('请求成功后才展示数据', async () => {
    let resolve!: (value: unknown[]) => void
    harness.query.mockReturnValue(new Promise(done => { resolve = done }))
    render()
    expect(harness.setters[2]).toHaveBeenCalledWith(true)
    expect(harness.setters[3]).toHaveBeenCalledWith([])
    harness.setters[3].mockClear()
    await flush()
    expect(harness.setters[3]).not.toHaveBeenCalled()
    resolve([{ lineage_id: 'a' }])
    await flush()
    expect(harness.setters[3]).toHaveBeenCalledWith([{ lineage_id: 'a' }])
    expect(harness.setters[2]).toHaveBeenLastCalledWith(false)
  })

  it('查询失败只提示错误，不写入关系数据', async () => {
    harness.query.mockRejectedValue(new Error('查询失败'))
    render()
    harness.setters[3].mockClear()
    await flush()
    expect(harness.setters[3]).not.toHaveBeenCalled()
    expect(harness.error).toHaveBeenCalledWith('查询失败')
  })

  it('切换记录后忽略旧请求的迟到结果', async () => {
    let resolveOld!: (value: unknown[]) => void
    harness.query.mockReturnValueOnce(new Promise(done => { resolveOld = done }))
    const cleanup = render(true, 'old')
    if (typeof cleanup === 'function') cleanup()
    harness.query.mockResolvedValueOnce([{ lineage_id: 'new' }])
    render(true, 'new')
    await flush()
    harness.setters[3].mockClear()
    resolveOld([{ lineage_id: 'old' }])
    await flush()
    expect(harness.setters[3]).not.toHaveBeenCalled()
  })

  it('关闭或卸载后不再提示旧请求错误', async () => {
    let reject!: (error: Error) => void
    harness.query.mockReturnValue(new Promise((_, fail) => { reject = fail }))
    const cleanup = render()
    if (typeof cleanup === 'function') cleanup()
    reject(new Error('旧请求失败'))
    await flush()
    expect(harness.error).not.toHaveBeenCalled()
    expect(harness.setters[2]).not.toHaveBeenCalledWith(false)
  })
})
