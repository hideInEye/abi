import type { EffectCallback } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MetadataAnalysisDrawer, { useMetadataAnalysis } from './index'
import type { MetadataAnalysisContext } from './types'

const state = vi.hoisted(() => ({
  context: null as MetadataAnalysisContext | null,
  spaceId: 164,
  effects: [] as EffectCallback[],
  warning: vi.fn(),
}))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: () => [state.context, (value: MetadataAnalysisContext | null) => { state.context = value }],
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: EffectCallback) => { state.effects.push(effect) },
}))
vi.mock('antd', () => ({ message: { warning: state.warning } }))
vi.mock('@/hooks/business/useStore', () => ({ useAppSelector: () => state.spaceId }))
vi.mock('@/store/slice/app', () => ({ getSpaceId: vi.fn() }))

beforeEach(() => {
  state.context = null
  state.spaceId = 164
  state.effects = []
  vi.clearAllMocks()
})

describe('公共分析入口状态', () => {
  it('关闭时不渲染按需加载的抽屉', () => {
    expect(MetadataAnalysisDrawer({ open: false, onClose: vi.fn() })).toBeNull()
    expect(MetadataAnalysisDrawer({ open: true, onClose: vi.fn() })).not.toBeNull()
  })

  it('打开时取当前 store 空间并保留字符串主键', () => {
    useMetadataAnalysis().openAnalysis({ nodeType: 'MCP', nodeId: '90071992547409931', nodeName: '插件' })
    expect(useMetadataAnalysis().analysisContext).toEqual({ nodeType: 'MCP', nodeId: '90071992547409931', nodeName: '插件', spaceId: 164 })
  })

  it.each([undefined, '', '  '])('缺少主键 %s 时不查询整类节点', nodeId => {
    useMetadataAnalysis().openAnalysis({ nodeType: 'SKILL', nodeId })
    expect(state.context).toBeNull()
    expect(state.warning).toHaveBeenCalledWith('未获取到元数据节点ID')
  })

  it('关闭清理选中节点', () => {
    const analysis = useMetadataAnalysis()
    analysis.openAnalysis({ nodeType: 'TOOL', nodeId: 1 })
    analysis.closeAnalysis()
    expect(state.context).toBeNull()
  })

  it('切换空间立即隐藏旧节点，并清理旧上下文', () => {
    useMetadataAnalysis().openAnalysis({ nodeType: 'ENTITY', nodeId: 1 })
    state.spaceId = 160
    const analysis = useMetadataAnalysis()
    expect(analysis.analysisContext).toBeNull()
    state.effects.at(-1)!()
    expect(state.context).toBeNull()
    analysis.openAnalysis({ nodeType: 'ENTITY', nodeId: 2 })
    expect(state.context?.spaceId).toBe(160)
  })
})
