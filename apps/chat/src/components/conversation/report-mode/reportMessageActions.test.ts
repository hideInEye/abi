import { describe, expect, it } from 'vitest'

import { getReportDeleteRoundIndex, getReportQuestionCopyText } from './reportMessageActions'

describe('report message actions', () => {
  it('复制内容只取当前问题', () => {
    expect(getReportQuestionCopyText({ question: '当前问题' })).toBe('当前问题')
  })

  it('只接受可持久化的安全整数轮次', () => {
    expect(getReportDeleteRoundIndex({ sortOrder: 12 })).toBe(12)
    expect(getReportDeleteRoundIndex({ sortOrder: Number.MAX_SAFE_INTEGER })).toBeUndefined()
    expect(getReportDeleteRoundIndex({ sortOrder: -1 })).toBeUndefined()
    expect(getReportDeleteRoundIndex({ sortOrder: 1.5 })).toBeUndefined()
  })
})
