import { describe, expect, it } from 'vitest'

import { formatTime, mapShareHistory } from './history'

describe('mapShareHistory', () => {
  const human = {
    roleType: 'human',
    messageDetail: { type: 'human', data: { content: '你好' } },
    createTime: '2026-08-27T10:05:00',
  }
  const ai = {
    roleType: 'ai',
    messageDetail: { type: 'ai', data: { content: '你好，有什么可以帮你' } },
    createTime: '2026-08-27T10:06:00',
  }
  const view = { roleType: 'view', messageDetail: { type: 'view', data: { content: '{"x":1}' } } }

  it('仅保留 human 与 ai 并提取 content（view 过滤）', () => {
    expect(mapShareHistory([human, view, ai])).toEqual([
      { role: 'human', content: '你好', time: '10:05' },
      { role: 'ai', content: '你好，有什么可以帮你', time: '10:06' },
    ])
  })

  it('roleType 缺失时回退 messageDetail.type', () => {
    const mapped = mapShareHistory([{ messageDetail: { type: 'ai', data: { content: 'x' } } }])
    expect(mapped).toHaveLength(1)
    expect(mapped[0].role).toBe('ai')
  })

  it('空内容与非数组输入返回空数组', () => {
    expect(mapShareHistory([{ roleType: 'ai', messageDetail: { data: { content: '   ' } } }])).toEqual([])
    expect(mapShareHistory(null)).toEqual([])
  })
})

describe('formatTime', () => {
  it('合法时间格式化为 HH:mm', () => {
    expect(formatTime('2026-08-27T09:07:00')).toBe('09:07')
  })

  it('非法时间返回空串', () => {
    expect(formatTime('')).toBe('')
    expect(formatTime('not-a-date')).toBe('')
  })
})
