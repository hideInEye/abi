export interface HistoryResponseOrdered {
  historySequence: number
}

/** 将接口数组位置附加到历史轮次，供分流后的统一时间线恢复原始顺序。 */
export function markHistoryResponseOrder<T extends object>(rounds: T[]): Array<T & HistoryResponseOrdered> {
  return rounds.map((round, historySequence) => ({
    ...round,
    historySequence,
  }))
}
