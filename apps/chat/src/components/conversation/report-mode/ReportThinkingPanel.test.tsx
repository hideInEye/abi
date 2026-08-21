import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ReportThinkingPanel from './ReportThinkingPanel'
import { createInitialReportStreamState } from './reportStreamReducer'
import type { ReportItem } from './types'

function createReport(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id: 'report-1',
    question: '生成报告',
    sortOrder: 1,
    createdAt: 1,
    source: 'task',
    ...overrides,
  }
}

describe('ReportThinkingPanel', () => {
  it('仅展示 step.plan 正文，不回退展示旧思考步骤', () => {
    const legacyStep = {
      id: 'legacy-step',
      title: '旧的技能调用思考',
      status: 'done' as const,
      chunks: [],
      firstEntryId: '1-0',
      lastEntryId: '1-0',
      entryIds: ['1-0'],
      scope: 'thinking' as const,
    }
    const withoutPlan = renderToStaticMarkup(
      <ReportThinkingPanel
        report={createReport({ thinkingOpen: true, thinkingStepIds: [legacyStep.id], stepsById: { [legacyStep.id]: legacyStep } })}
        onToggle={() => undefined}
      />,
    )
    const withPlan = renderToStaticMarkup(
      <ReportThinkingPanel
        report={createReport({
          thinkingOpen: true,
          thinkingPlan: { entryId: '2-0', id: 'step-7', content: '确认历史数据完整性后进入预测环节。' },
          thinkingStepIds: [legacyStep.id],
          stepsById: { [legacyStep.id]: legacyStep },
        })}
        onToggle={() => undefined}
      />,
    )

    expect(withoutPlan).toContain('正在分析问题')
    expect(withoutPlan).not.toContain('旧的技能调用思考')
    expect(withPlan).toContain('确认历史数据完整性后进入预测环节。')
    expect(withPlan).not.toContain('旧的技能调用思考')
  })
})
