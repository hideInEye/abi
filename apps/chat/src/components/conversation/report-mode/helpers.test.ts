import { describe, expect, it } from 'vitest'

import {
  canRevealReport,
  getCompletedTaskCount,
  getCurrentTaskTitle,
  getPublicStepLines,
  getReportPresentationStage,
  getReportTaskProgressText,
  getReportTitle,
  getStepSummary,
  getTaskKey,
  isVisibleReportStep,
  shouldAnimateReportPreview,
  toReportChunkMarkdown,
} from './helpers'
import type { ReportItem, ReportPublicStep } from './types'

describe('report-mode UI helpers', () => {
  it('只把 completed 计入完成数量', () => {
    const tasks = [
      { content: '读取数据', status: 'completed' as const },
      { content: '生成报告', status: 'in_progress' as const },
      { content: '旧任务', status: 'cancelled' as const },
    ]

    expect(getCompletedTaskCount(tasks)).toBe(1)
    expect(getCurrentTaskTitle(tasks)).toBe('生成报告')
  })

  it('用 plan entry 和任务下标生成稳定展开 key', () => {
    expect(getTaskKey('1730000000000-0', 2)).toBe('1730000000000-0:2')
  })

  it('从 HTML 或 Markdown 中提取报告标题', () => {
    expect(getReportTitle({ format: 'html', content: '<html><head><title>销售报告</title></head></html>' })).toBe('销售报告')
    expect(getReportTitle({ format: 'markdown', content: '# 趋势分析\n内容' })).toBe('趋势分析')
  })

  it('严格按照思考、ToDo、报告三个阶段渐进展示', () => {
    const createView = (overrides: Partial<Pick<ReportItem, 'currentPlan' | 'tasks' | 'status' | 'reportCandidate'>> = {}) => ({
      currentPlan: undefined,
      tasks: [],
      status: 'thinking' as const,
      reportCandidate: undefined,
      ...overrides,
    })
    const plan = { entryId: '1730000000000-0', tasks: [] }
    const candidate = { entryId: '1730000001000-0', stepId: 'report', format: 'html' as const, content: '<h1>报告</h1>' }

    expect(getReportPresentationStage(createView({ reportCandidate: candidate }))).toBe('thinking')
    expect(getReportPresentationStage(createView({ currentPlan: plan, tasks: [{ content: '分析', status: 'in_progress' }], reportCandidate: candidate }))).toBe('todo')
    expect(getReportPresentationStage(createView({ currentPlan: plan, tasks: [{ content: '分析', status: 'pending' }], status: 'completed', reportCandidate: candidate }))).toBe('todo')
    expect(canRevealReport(createView({ currentPlan: plan, tasks: [{ content: '分析', status: 'completed' }], status: 'completed', reportCandidate: candidate }))).toBe(true)
    expect(canRevealReport(createView({ currentPlan: plan, tasks: [{ content: '旧步骤', status: 'cancelled' }], status: 'completed', reportCandidate: candidate }))).toBe(true)
  })

  it('公开执行摘要不会提前暴露 HTML 或 Markdown 报告正文', () => {
    const step: ReportPublicStep = {
      id: 'step-report',
      status: 'done',
      chunks: [
        { entryId: '1-0', outputType: 'text', content: '正在整理关键结论' },
        { entryId: '2-0', outputType: 'html', content: '<html>完整报告</html>' },
      ],
      firstEntryId: '1-0',
      lastEntryId: '2-0',
      entryIds: ['1-0', '2-0'],
      scope: 'todo',
    }

    expect(getStepSummary(step)).toBe('正在整理关键结论')
    expect(getPublicStepLines(step)).toEqual(['正在整理关键结论'])
  })

  it('终态计划分别显示完成和取消数量', () => {
    expect(getReportTaskProgressText([{ status: 'completed' }, { status: 'completed' }, { status: 'cancelled' }, { status: 'cancelled' }, { status: 'cancelled' }])).toBe('2 已完成 · 3 已取消')
  })

  it('隐藏没有公开内容的思考占位步骤', () => {
    const placeholder: ReportPublicStep = {
      id: 'dangling',
      title: '思考中',
      detail: 'Thought/Action/Observation',
      status: 'done',
      chunks: [],
      firstEntryId: '1-0',
      lastEntryId: '1-0',
      entryIds: ['1-0'],
      scope: 'unassigned',
    }

    expect(isVisibleReportStep(placeholder)).toBe(false)
    expect(isVisibleReportStep({ ...placeholder, actionIntention: '正在整理结论' })).toBe(true)
  })

  it('将 text/code 内容标准化为可渲染的 Markdown', () => {
    expect(toReportChunkMarkdown({ entryId: '1-0', outputType: 'text', content: '第一行\\n**第二行**' })).toBe('第一行\n**第二行**')
    expect(toReportChunkMarkdown({ entryId: '2-0', outputType: 'code', content: 'const value = 1\\nconsole.log(value)' })).toBe('```\nconst value = 1\nconsole.log(value)\n```')
  })

  it('只在实时 HTML 报告首次自动打开时播放打字机', () => {
    const report = {
      currentPlan: { entryId: '1-0', tasks: [] },
      tasks: [{ content: '生成报告', status: 'completed' as const }],
      status: 'completed' as const,
      reportCandidate: { entryId: '2-0', stepId: 'report', format: 'html' as const, content: '<html><body>报告</body></html>' },
      source: 'task' as const,
    }

    expect(shouldAnimateReportPreview(report, 'auto')).toBe(true)
    expect(shouldAnimateReportPreview(report, 'manual')).toBe(false)
    expect(shouldAnimateReportPreview({ ...report, source: 'history' }, 'auto')).toBe(false)
    expect(shouldAnimateReportPreview({ ...report, reportCandidate: { ...report.reportCandidate, format: 'markdown' } }, 'auto')).toBe(false)
  })
})
