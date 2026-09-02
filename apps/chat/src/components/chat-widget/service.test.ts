import { describe, expect, it } from 'vitest'

import { finalizeStreamText, mapProjectSemantics, parseAiRaw } from './service'

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

describe('parseAiRaw', () => {
  it('think 段拼接进 thinking，正文剥离思考段', () => {
    const raw = '<think>第一步</think>中间文本<think>第二步</think>结尾'
    const { thinking, text, json } = parseAiRaw(raw)
    expect(thinking).toBe('第一步\n\n第二步')
    expect(text).toBe('中间文本结尾')
    expect(json).toBeNull()
  })

  it('尾部图表 JSON（含 sql 无 task_type）：json 提取、裸 JSON 不进入正文', () => {
    const raw = '分析结论{"type":"response_bar_chart","sql":"select 1"}'
    const { text, json } = parseAiRaw(raw)
    expect(json).toEqual({ type: 'response_bar_chart', sql: 'select 1' })
    expect(text).toBe('分析结论')
  })

  it('伪 JSON（字符串值内字面换行）：thought 归入思考、正文剥离、sql 可用于图表', () => {
    const raw = '{\n"thought": "字段验证\n匹配依据",\n"sql": "select 2",\n"type": "response_bar_chart"\n}'
    const { thinking, text, json } = parseAiRaw(raw)
    expect(thinking).toBe('字段验证\n匹配依据')
    expect(text).toBe('')
    expect(json?.sql).toBe('select 2')
    expect(json?.type).toBe('response_bar_chart')
  })

  it('含 task_type 的结构化 JSON：提取回复文本且 json 仍可用', () => {
    const raw = '{"task_type":"development","development":{"text":"回答"},"sql":"select 2"}'
    const { text, json } = parseAiRaw(raw)
    expect(text).toBe('回答')
    expect(json?.sql).toBe('select 2')
  })

  it('尾部非法 JSON（流式到达中）保持原文且 json 为 null', () => {
    const raw = '前缀 {"task_type":"dev'
    const { text, json } = parseAiRaw(raw)
    expect(text).toBe(raw)
    expect(json).toBeNull()
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

  it('分享查询：顶层 schemaSemantics 且 schemaConfig 为 JSON 字符串时正确解析', () => {
    const detail = {
      schemaSemantics: [
        { schemaConfig: '[{"id": 396, "name": "test_bank_db", "type": "schema", "groupPath": "动账交易测试"}]' },
      ],
    }
    expect(mapProjectSemantics(detail)).toEqual([
      { id: 'schema_396', type: 'schema', schemaId: 396, name: 'test_bank_db', groupName: '动账交易测试' },
    ])
  })
})
