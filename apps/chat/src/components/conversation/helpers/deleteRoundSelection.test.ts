import { describe, expect, it } from 'vitest'

import { buildDeleteRoundItems, groupDeleteRoundsBySource, normalizeDeleteRounds } from './deleteRoundSelection'

describe('delete round selection', () => {
  it('去除重复及无效轮次', () => {
    expect(normalizeDeleteRounds([2, 1, 2, -1, 1.5, Number.NaN])).toEqual([2, 1])
  })

  it('报告轮次与交互/探索轮次按接口 source 分组', () => {
    expect(groupDeleteRoundsBySource([1, 2, 3, 4], [2, 4])).toEqual({
      message: [1, 3],
      report: [2, 4],
    })
  })

  it('未标记为报告的轮次统一归入 message', () => {
    expect(groupDeleteRoundsBySource([5, 6], [])).toEqual({ message: [5, 6], report: [] })
  })

  it('构造单请求 items 并过滤空来源', () => {
    expect(buildDeleteRoundItems([1, 3, 7], [7])).toEqual([
      { source: 'message', roundIndex: [1, 3] },
      { source: 'report', roundIndex: [7] },
    ])
    expect(buildDeleteRoundItems([1, 3], [])).toEqual([
      { source: 'message', roundIndex: [1, 3] },
    ])
  })
})
