import { describe, expect, it } from 'vitest'

import { finalizeStreamText, mapAssistantBoundToolResources, mapProjectSemantics, parseAiRaw } from './service'

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

  it('内联思考段（## 1. 🧠 思考过程 … ## 3. 🔧 查询模式）：包装为思考、正文只保留结束标记后内容', () => {
    const raw = '## 1. 🧠 思考过程\n分析用户意图\n## 3. 🔧 查询模式\n描述分析内容'
    const { thinking, text } = parseAiRaw(raw)
    expect(thinking).toBe('分析用户意图')
    expect(text).toBe('\n描述分析内容')
  })

  it('内联思考段未闭合（流式进行中）：归入思考、正文不闪现', () => {
    const raw = '## 1. 🧠 思考过程\n正在分析'
    const { thinking, text } = parseAiRaw(raw)
    expect(thinking).toBe('正在分析')
    expect(text).toBe('')
  })

  it('```json 围栏 thoughts JSON（知识模式）：thoughts 归入思考、desc 作为正文', () => {
    const raw = '```json\n{"thoughts": "检索数据知识", "desc": "知识正文"}\n```'
    const { thinking, text, json } = parseAiRaw(raw)
    expect(thinking).toBe('检索数据知识')
    expect(text).toBe('知识正文')
    expect(json?.desc).toBe('知识正文')
  })

  it('正文含 { 代码片段：尾部合法 JSON 仍提取且不吞正文', () => {
    const raw = '示例 {"code": 1} 结论 {"sql": "select 3", "type": "response_bar_chart"}'
    const { text, json } = parseAiRaw(raw)
    expect(json?.sql).toBe('select 3')
    expect(text).toBe('示例 {"code": 1} 结论 ')
  })

  it('分享流变体内联标记（## 1. 💡 分析思路 … ## 2. 🔧 查询模式）：标记前未闭合 JSON 头丢弃', () => {
    const raw =
      '{\n  "thought\n\n用户问题为X。\\## 1. 💡 分析思路\n\n分析内容\n\n---\n\n## 2. 🔧 查询模式\n\nchat_with_db_execute 查询模式'
    const { thinking, text } = parseAiRaw(raw)
    expect(thinking).toBe('分析内容\n\n---')
    expect(text).toBe('\n\nchat_with_db_execute 查询模式')
  })

  it('整段以 { 开头但提取不到字段（退化流）：保留原文不清空正文', () => {
    const raw = '{\n  "thought\n\n普通正文'
    const { thinking, text, json } = parseAiRaw(raw)
    expect(thinking).toBe('')
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

describe('mapAssistantBoundToolResources', () => {
  it('保留 SSE MCP 配置的真实分组 ID', () => {
    const detail = {
      versions: [{
        tools: [{
          toolType: '2',
          toolConfig: JSON.stringify([
            { id: 41, name: 'sse 服务', mcp_sse: [1001, '1002', 1001] },
            { id: 42, name: 'streamable 服务', mcp_streamable: [2001] },
          ]),
        }],
      }],
    }

    expect(mapAssistantBoundToolResources(detail).mcps).toEqual([
      { id: '41', name: 'sse 服务', protocol: 'sse', sseGroupIds: [1001, '1002'] },
      { id: '42', name: 'streamable 服务', protocol: 'streamable', sseGroupIds: [] },
    ])
  })
})
