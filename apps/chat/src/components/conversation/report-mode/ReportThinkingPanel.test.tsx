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

  it('收起时保留两行正文视窗和渐变遮罩，展开后移除遮罩', () => {
    const report = createReport({
      thinkingOpen: false,
      thinkingPlan: {
        entryId: '2-0',
        id: 'step-plan',
        content: '第一行分析内容。\n第二行分析内容。\n第三行在收起时由视窗隐藏。',
      },
    })

    const collapsed = renderToStaticMarkup(<ReportThinkingPanel report={report} onToggle={() => undefined} />)
    const expanded = renderToStaticMarkup(<ReportThinkingPanel report={{ ...report, thinkingOpen: true }} onToggle={() => undefined} />)

    expect(collapsed).toContain('第一行分析内容。')
    expect(collapsed).toContain('data-testid="report-thinking-viewport"')
    expect(collapsed).toContain('data-collapsed="true"')
    expect(collapsed).toContain('data-testid="report-thinking-fade"')
    expect(collapsed).toContain('aria-expanded="false"')
    expect(expanded).toContain('data-collapsed="false"')
    expect(expanded).toContain('aria-expanded="true"')
    expect(expanded).not.toContain('data-testid="report-thinking-fade"')
  })

  it('没有 plan 正文时收起状态仍保留两行占位视窗', () => {
    const html = renderToStaticMarkup(<ReportThinkingPanel report={createReport({ thinkingOpen: false, status: 'thinking' })} onToggle={() => undefined} />)

    expect(html).toContain('正在分析问题')
    expect(html).toContain('data-collapsed="true"')
    expect(html).toContain('data-testid="report-thinking-fade"')
  })

  it('当前页面新提交任务的首条思考正文从空内容进入打字机状态', () => {
    const html = renderToStaticMarkup(
      <ReportThinkingPanel
        report={createReport({
          animateThinkingPlan: true,
          thinkingPlan: { entryId: 'live-2-0', id: 'step-plan', content: '先确认分析目标，再制定执行计划。' },
        })}
        onToggle={() => undefined}
      />,
    )

    expect(html).toContain('data-typewriter-active="true"')
    expect(html).not.toContain('先确认分析目标，再制定执行计划。')
  })

  it('历史和恢复任务的思考正文直接完整展示，不播放打字机', () => {
    const thinkingPlan = { entryId: 'history-2-0', id: 'step-plan', content: '历史思考总结直接展示。' }
    const history = renderToStaticMarkup(
      <ReportThinkingPanel report={createReport({ source: 'history', animateThinkingPlan: true, thinkingPlan })} onToggle={() => undefined} />,
    )
    const restored = renderToStaticMarkup(
      <ReportThinkingPanel report={createReport({ source: 'task', animateThinkingPlan: false, thinkingPlan })} onToggle={() => undefined} />,
    )

    expect(history).toContain('data-typewriter-active="false"')
    expect(history).toContain('历史思考总结直接展示。')
    expect(restored).toContain('data-typewriter-active="false"')
    expect(restored).toContain('历史思考总结直接展示。')
  })
})
