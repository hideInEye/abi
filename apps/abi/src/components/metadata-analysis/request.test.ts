import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryLineageRelationList } from '@/service/api/data-preparation'

import { NODE_TYPE_LABELS } from './constants'
import { buildLineageQuery, queryMetadataRelations } from './request'

vi.mock('@/service/api/data-preparation', () => ({ queryLineageRelationList: vi.fn() }))

const query = vi.mocked(queryLineageRelationList)
const nodeTypes = ['DIMENSION', 'INDICATOR', 'LABLE', 'ENTITY', 'COPILOT', 'LLM', 'MCP', 'TOOL', 'SKILL']
const context = { nodeId: '90071992547409931', nodeName: '名称', nodeType: 'DIMENSION', spaceId: 164 }
const row = { sourceNodeType: 'TABLE_SEMANTIC', sourceNodeId: '11', targetNodeType: 'DIMENSION', targetNodeId: context.nodeId }

beforeEach(() => vi.resetAllMocks())

describe('元数据分析查询', () => {
  it.each(nodeTypes)('%s 的血缘与影响查询使用正确方向，且保留 Long ID', nodeType => {
    expect(buildLineageQuery({ ...context, nodeType }, 'lineage')).toEqual({ spaceId: 164, targetNodeType: nodeType, targetNodeId: context.nodeId })
    expect(buildLineageQuery({ ...context, nodeType }, 'impact')).toEqual({ spaceId: 164, sourceNodeType: nodeType, sourceNodeId: context.nodeId })
    expect(NODE_TYPE_LABELS[nodeType]).toBeTruthy()
  })

  it('保持数据准备原有类型、数值 ID 与空间缓存回退', () => {
    expect(buildLineageQuery({ nodeId: 21, nodeType: 'DATA_SOURCE' }, 'lineage', '138')).toEqual({ spaceId: 138, targetNodeType: 'Data_Source', targetNodeId: '21' })
    expect(buildLineageQuery({ ...context, nodeType: 'DATASET' }, 'impact', '138').spaceId).toBe(164)
    expect(buildLineageQuery({ nodeType: 'TABLE_SEMANTIC', spaceId: 138 }, 'lineage')).toEqual({ spaceId: 138, targetNodeType: 'TABLE_SEMANTIC' })
  })

  it.each([undefined, '', 'NaN', '-1'])('无有效空间 %s 时不调用接口', async cachedSpaceId => {
    await expect(queryMetadataRelations({ ...context, spaceId: undefined }, 'lineage', cachedSpaceId)).rejects.toThrow('未获取到空间ID')
    expect(query).not.toHaveBeenCalled()
  })

  it('等待接口明确成功后再返回关系数据', async () => {
    let resolve!: (value: unknown) => void
    query.mockReturnValue(new Promise(done => { resolve = done }) as ReturnType<typeof queryLineageRelationList>)
    const consume = vi.fn()
    const pending = queryMetadataRelations(context, 'lineage').then(consume)
    await Promise.resolve()
    expect(consume).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledWith({ spaceId: 164, targetNodeType: 'DIMENSION', targetNodeId: context.nodeId })
    resolve({ data: [row], error: null })
    await pending
    expect(consume.mock.calls[0][0][0]).toMatchObject({ source_node_id: '11', target_node_id: context.nodeId })
  })

  it.each([
    { error: new Error('失败'), data: [row] },
    { data: [row] },
    { error: null, data: { success: false, errMsg: '失败', data: [row] } },
  ])('失败响应不作为有效数据消费：%j', async response => {
    query.mockResolvedValue(response as Awaited<ReturnType<typeof queryLineageRelationList>>)
    const consume = vi.fn()
    await expect(queryMetadataRelations(context, 'lineage').then(consume)).rejects.toThrow()
    expect(consume).not.toHaveBeenCalled()
  })

  it('网络异常向上传递且不返回伪空列表', async () => {
    query.mockRejectedValue(new Error('网络失败'))
    await expect(queryMetadataRelations(context, 'impact')).rejects.toThrow('网络失败')
  })

  it('兼容既有 nodes/edges 信封和成功空数据', async () => {
    query.mockResolvedValue({ error: null, data: { success: true, data: { nodes: [{ nodeId: '11', nodeType: 'TOOL' }, { nodeId: context.nodeId, nodeType: 'SKILL' }], edges: [{ sourceNodeId: '11', targetNodeId: context.nodeId }] } } } as never)
    expect(await queryMetadataRelations(context, 'impact')).toEqual([expect.objectContaining({ source_node_type: 'TOOL', target_node_type: 'SKILL' })])
    query.mockResolvedValue({ error: null, data: [] } as never)
    expect(await queryMetadataRelations(context, 'lineage')).toEqual([])
  })
})
