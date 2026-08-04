import { describe, expect, it } from 'vitest'

import { createInitialReportStreamState } from './reportStreamReducer'
import { mergeConversationAndReportGroups } from './reportTimeline'
import type { ReportItem } from './types'

function report(sortOrder: number): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id: `report-${sortOrder}`,
    question: `报告问题 ${sortOrder}`,
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
})
