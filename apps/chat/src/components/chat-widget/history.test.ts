import { describe, expect, it } from 'vitest'

import { formatTime, mapShareHistory, parseViewChart } from './history'

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

describe('parseViewChart', () => {
  it('chart-view 标签前前缀文本即 desc（同主对话 parseContext），response_table 标记表格视图', () => {
    const content =
      '用户意图为查询订单状态。最终采用表格形式兜底展示查询结果。\n' +
      '<chart-view content="{"type": "response_table", "sql": "SELECT 1;", "data": [{"订单状态": "已付款"}]}" />'
    const chart = parseViewChart(content)
    expect(chart?.desc).toBe('用户意图为查询订单状态。最终采用表格形式兜底展示查询结果。')
    expect(chart?.data).toEqual([{ 订单状态: '已付款' }])
    expect(chart?.sql).toBe('SELECT 1;')
    expect(chart?.type).toBe('response_table')
    expect(chart?.tableView).toBe(true)
  })

  it('无 chart-view 标签时兜底 JSON desc 字段', () => {
    const chart = parseViewChart('{"desc":"纯描述无图表","data":[]}')
    expect(chart?.desc).toBe('纯描述无图表')
    expect(chart?.data).toEqual([])
    expect(chart?.tableView).toBeUndefined()
  })

  it('describe 占位与空内容返回 null', () => {
    expect(parseViewChart('describe')).toBeNull()
    expect(parseViewChart('  ')).toBeNull()
  })
})
