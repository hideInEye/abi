import { describe, expect, it, vi } from 'vitest'

import { fetchAssistantBoundResources, mapAssistantBoundResources } from './assistantResources'
import { buildBoundSemanticTree } from './assistantResources'

vi.mock('../../../service/api/assistant', () => ({
  fetchAssistantDetail: vi.fn(),
}))

describe('mapAssistantBoundResources', () => {
  it('空 versions 时回退详情自身且各资源为空数组', () => {
    const result = mapAssistantBoundResources({ appId: 9, appName: '测试助手' }, 9)
    expect(result).toEqual({
      appId: '9',
      appName: '测试助手',
      prologue: '',
      description: '',
      semantics: [],
      skills: [],
      mcps: [],
    })
  })

  it('detail 为 null 时使用 fallbackAppId 且不抛错', () => {
    const result = mapAssistantBoundResources(null, 12)
    expect(result.appId).toBe('12')
    expect(result.semantics).toEqual([])
    expect(result.skills).toEqual([])
    expect(result.mcps).toEqual([])
  })

  it('优先选取 latestVersionId 对应版本，忽略其它版本的资源', () => {
    const detail = {
      appId: 7,
      latestVersionId: 202,
      versions: [
        {
          versionId: 201,
          schemaSemantics: [{ schemaConfig: [{ id: 1, name: '旧语义' }] }],
        },
        {
          versionId: 202,
          schemaSemantics: [{ schemaConfig: [{ id: 2, name: '新语义', groupPath: '财务 / 收入' }] }],
        },
      ],
    }
    const result = mapAssistantBoundResources(detail)
    expect(result.semantics).toEqual([
      { id: 'schema_2', schemaId: 2, name: '新语义', groupName: '财务 / 收入' },
    ])
  })

  it('缺字段的配置项被跳过，不产生脏候选', () => {
    const detail = {
      versions: [
        {
          versionId: 1,
          schemaSemantics: [{ schemaConfig: [{ name: '无 id' }, { id: 5 }] }],
          skills: [{ skillConfig: [{ id: 88, name: '技能A' }, { name: '无 id' }] }],
        },
      ],
    }
    const result = mapAssistantBoundResources(detail)
    expect(result.semantics).toEqual([{ id: 'schema_5', schemaId: 5, name: '', groupName: '' }])
    expect(result.skills).toEqual([
      { id: '88', bizName: '技能A', latestVersionId: '88', skillType: '1' },
    ])
  })

  it('仅 toolType=2 的工具进入 MCP 候选，内置工具被过滤', () => {
    const detail = {
      versions: [
        {
          versionId: 1,
          tools: [
            { toolType: '1', toolConfig: [{ id: 31, name: '内置工具' }] },
            {
              toolType: '2',
              toolConfig: [
                { id: 41, name: 'sse 服务', mcp_sse: ['1001'], mcp_streamable: [] },
                { id: 42, name: 'streamable 服务', mcp_sse: [], mcp_streamable: ['1002'] },
                { id: 43, name: '无协议信息', mcp_sse: [], mcp_streamable: [] },
              ],
            },
          ],
        },
      ],
    }
    const result = mapAssistantBoundResources(detail)
    expect(result.mcps).toEqual([
      { id: '41', name: 'sse 服务', protocol: 'sse', sseGroupIds: ['1001'] },
      { id: '42', name: 'streamable 服务', protocol: 'streamable', sseGroupIds: [] },
      { id: '43', name: '无协议信息', protocol: 'streamable', sseGroupIds: [] },
    ])
  })
})

describe('buildBoundSemanticTree', () => {
  it('输出扁平 schema 叶子，保留 schemaId 与分组名', () => {
    const tree = buildBoundSemanticTree([
      { id: 'schema_1', schemaId: 1, name: '收入表', groupName: '财务 / 收入' },
      { id: 'schema_2', schemaId: 2, name: '成本表', groupName: '财务 / 成本' },
    ])
    expect(tree).toEqual([
      { id: 'schema_1', type: 'schema', schemaId: 1, name: '收入表', groupName: '财务 / 收入' },
      { id: 'schema_2', type: 'schema', schemaId: 2, name: '成本表', groupName: '财务 / 成本' },
    ])
  })
})

describe('fetchAssistantBoundResources', () => {
  it('接口失败时返回 null，由调用方降级为不限制', async () => {
    const { fetchAssistantDetail } = await import('../../../service/api/assistant')
    vi.mocked(fetchAssistantDetail).mockRejectedValueOnce(new Error('network'))
    await expect(fetchAssistantBoundResources(1)).resolves.toBeNull()
  })

  it('解包 data.data 后映射绑定资源', async () => {
    const { fetchAssistantDetail } = await import('../../../service/api/assistant')
    vi.mocked(fetchAssistantDetail).mockResolvedValueOnce({
      data: { data: { appId: 6, appName: '助手', versions: [] } },
    } as never)
    const result = await fetchAssistantBoundResources(6)
    expect(result?.appId).toBe('6')
    expect(result?.appName).toBe('助手')
  })
})
