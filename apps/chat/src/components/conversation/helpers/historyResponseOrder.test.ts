import { describe, expect, it } from 'vitest'

import { markHistoryResponseOrder } from './historyResponseOrder'

describe('markHistoryResponseOrder', () => {
  it('records the API array order without sorting by roundIndex or mutating the response', () => {
    const rounds = [{ roundIndex: 30 }, { roundIndex: 10 }, { roundIndex: 20 }]

    const result = markHistoryResponseOrder(rounds)

    expect(result.map(({ roundIndex, historySequence }) => ({ roundIndex, historySequence }))).toEqual([
      { roundIndex: 30, historySequence: 0 },
      { roundIndex: 10, historySequence: 1 },
      { roundIndex: 20, historySequence: 2 },
    ])
    expect(rounds).toEqual([{ roundIndex: 30 }, { roundIndex: 10 }, { roundIndex: 20 }])
  })
})
