import type { ReportItem } from './types'

export function getReportDeleteRoundIndex(report: Pick<ReportItem, 'sortOrder'>): number | undefined {
  const roundIndex = Number(report.sortOrder)
  if (!Number.isSafeInteger(roundIndex) || roundIndex < 0 || roundIndex === Number.MAX_SAFE_INTEGER) return undefined

  return roundIndex
}

export function getReportQuestionCopyText(report: Pick<ReportItem, 'question'>): string {
  return report.question
}
