import { describe, expect, it } from 'vitest'

import { finalizeStreamText } from './service'

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
