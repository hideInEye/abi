import { describe, expect, it } from 'vitest'

import { createInitialReportStreamState } from './reportStreamReducer'
import { mergeConversationAndReportGroups } from './reportTimeline'
import type { ReportItem } from './types'

function report(sortOrder: number, historySequence?: number): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id: `report-${sortOrder}`,
    question: `报告问题 ${sortOrder}`,
    historySequence,
    sortOrder,
    createdAt: sortOrder,
    source: 'task',
  }
}

describe('unified conversation timeline', () => {
  it('按 roundIndex/sortOrder 交错普通轮次与报告轮次，并保留 opening 在最前', () => {
    const opening = [[{ role: 'first' }]]
    const normalRound1 = [[{ role: 'human', roundIndex: 1 }], [{ role: 'view', roundIndex: 1 }]]
    const normalRound3 = [[{ role: 'human', roundIndex: 3 }], [{ role: 'view', roundIndex: 3 }]]

    const result = mergeConversationAndReportGroups([opening, normalRound1, normalRound3], [report(2)])

    expect(result.map((group) => group.flat()[0]?.role)).toEqual(['first', 'human', 'report', 'human'])
    expect(result[2].flat()[0].report.id).toBe('report-2')
  })

  it('历史 roundIndex 乱序时仍按接口数组顺序合并三种模式', () => {
    const opening = [[{ role: 'first' }]]
    const interaction = [[{ role: 'human', roundIndex: 30, historySequence: 0 }]]
    const exploration = [[{ role: 'exploration', roundIndex: 20, historySequence: 2 }]]

    const result = mergeConversationAndReportGroups(
      [opening, exploration, interaction],
      [{ ...report(10, 1), source: 'history' }],
    )

    expect(result.map((group) => group.flat()[0]?.role)).toEqual(['first', 'human', 'report', 'exploration'])
    expect(result.slice(1).map((group) => group.flat()[0]?.historySequence)).toEqual([0, 1, 2])
  })

  it('实时新增项显示在接口历史之后', () => {
    const history = [[{ role: 'human', roundIndex: 100, historySequence: 0 }]]

    const result = mergeConversationAndReportGroups([history], [report(1)])

    expect(result.map((group) => group.flat()[0]?.role)).toEqual(['human', 'report'])
  })
})
