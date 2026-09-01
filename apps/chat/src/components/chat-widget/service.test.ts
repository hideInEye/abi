import { describe, expect, it } from 'vitest'

import { finalizeStreamText, mapProjectSemantics } from './service'

describe('finalizeStreamText', () => {
  it('剥离 think 思考段保留正文', () => {
    expect(finalizeStreamText('<think>推理过程</think>最终答案')).toBe('最终答案')
  })

  it('尾部含 task_type 的 JSON 提取回复文本', () => {
    const raw = '{"task_type":"development","development":{"text":"生成的回答"}}'
    expect(finalizeStreamText(raw)).toBe('生成的回答')
  })

  it('尾部非法 JSON 保持原文（流式到达中）', () => {
    expect(finalizeStreamText('前缀 {"task_type":"dev')).toBe('前缀 {"task_type":"dev')
  })

  it('普通文本原样返回', () => {
    expect(finalizeStreamText('你好，有什么可以帮你')).toBe('你好，有什么可以帮你')
  })
})

describe('mapProjectSemantics', () => {
  it('从 latestVersionId 对应版本提取绑定语义叶子', () => {
    const detail = {
      latestVersionId: 2,
      versions: [
        { versionId: 1, schemaSemantics: [{ schemaConfig: [{ id: 1, name: '旧语义' }] }] },
        {
          versionId: 2,
          schemaSemantics: [{ schemaConfig: [{ id: 2, name: '新语义', groupPath: '财务 / 收入' }] }],
        },
      ],
    }
    expect(mapProjectSemantics(detail)).toEqual([
      { id: 'schema_2', type: 'schema', schemaId: 2, name: '新语义', groupName: '财务 / 收入' },
    ])
  })

  it('缺 id 的配置项被跳过；无 versions 回退详情自身', () => {
    const detail = {
      schemaSemantics: [{ schemaConfig: [{ name: '无 id' }, { id: 5 }] }],
    }
    expect(mapProjectSemantics(detail)).toEqual([
      { id: 'schema_5', type: 'schema', schemaId: 5, name: '', groupName: '' },
    ])
  })

  it('后端未加字段时返回空列表（降级展示“暂无数据语义”）', () => {
    expect(mapProjectSemantics({ appId: 50, appName: '助手' })).toEqual([])
    expect(mapProjectSemantics(null)).toEqual([])
  })
})
