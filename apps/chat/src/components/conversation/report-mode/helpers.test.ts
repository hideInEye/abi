import { describe, expect, it } from 'vitest'

import {
  canRevealReport,
  completeReportThinkingTypewriter,
  formatReportDuration,
  getCollapsedTodoExecutionSummary,
  getCompletedTaskCount,
  getCurrentTaskTitle,
  getPublicStepLines,
  getReportStatusTone,
  getReportDownloadDescriptor,
  getReportDownloadOptions,
  getReportPresentationStage,
  getReportTaskProgressText,
  getReportTitle,
  getStepSummary,
  getTaskKey,
  isReportGenerationTask,
  isVisibleReportStep,
  shouldAnimateReportPreview,
  shouldShowReportEstimate,
  toggleReportTaskKey,
  toReportChunkMarkdown,
} from './helpers'
import type { ReportItem, ReportPublicStep } from './types'

describe('report-mode UI helpers', () => {
  it('只在报告仍处于生成阶段时展示固定预计耗时', () => {
    expect(['submitting', 'waiting_stream', 'thinking', 'running'].every((status) => shouldShowReportEstimate(status as ReportItem['status']))).toBe(true)
    expect(['syncing_history', 'completed', 'failed'].some((status) => shouldShowReportEstimate(status as ReportItem['status']))).toBe(false)
  })

  it('只把 completed 计入完成数量', () => {
    const tasks = [
      { content: '读取数据', status: 'completed' as const },
      { content: '生成报告', status: 'in_progress' as const },
      { content: '旧任务', status: 'cancelled' as const },
    ]

    expect(getCompletedTaskCount(tasks)).toBe(1)
    expect(getCurrentTaskTitle(tasks)).toBe('生成报告')
  })

  it('为 Todo 的四类主要状态返回稳定的视觉语义', () => {
    expect(getReportStatusTone('pending')).toBe('pending')
    expect(getReportStatusTone('in_progress')).toBe('running')
    expect(getReportStatusTone('completed')).toBe('done')
    expect(getReportStatusTone('failed')).toBe('failed')
  })

  it('只用当前执行任务的公开步骤生成折叠摘要', () => {
    const currentStep: ReportPublicStep = {
      id: 'step-2',
      title: 'execute_skill_script_file',
      action: 'execute_skill_script_file',
      actionIntention: '生成订单查询 SQL',
      status: 'in_progress',
      chunks: [{ entryId: '3-0', outputType: 'text', content: 'Skill: sql-generator' }],
      firstEntryId: '2-0',
      lastEntryId: '3-0',
      entryIds: ['2-0', '3-0'],
      scope: 'todo',
      executionGroupKey: 'plan-1:0',
    }
    const report = {
      tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' as const }],
      currentPlan: { entryId: 'plan-1', tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' as const }] },
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '生成订单查询 SQL', stepIds: ['step-2'] }],
      stepsById: { 'step-2': currentStep },
      stepOrder: ['step-2'],
    }

    expect(getCollapsedTodoExecutionSummary(report)).toBe('当前正在执行 生成订单查询 SQL 步骤，调用 sql-generator 技能')
    expect(getCollapsedTodoExecutionSummary({ ...report, stepsById: { 'step-2': { ...currentStep, chunks: [] } } })).toBe('当前正在执行 生成订单查询 SQL 步骤')
    expect(getCollapsedTodoExecutionSummary({ ...report, tasks: [{ content: '生成订单查询 SQL', status: 'pending' }] })).toBeUndefined()
  })

  it('重规划后仍按相同任务内容读取旧计划中的公开 Skill', () => {
    const step: ReportPublicStep = {
      id: 'step-old-plan',
      title: 'load_skill',
      actionIntention: '加载 sql-generator 技能',
      status: 'done',
      chunks: [],
      firstEntryId: '2-0',
      lastEntryId: '3-0',
      entryIds: ['2-0', '3-0'],
      scope: 'todo',
      executionGroupKey: 'old-plan:0',
    }

    expect(getCollapsedTodoExecutionSummary({
      tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' }],
      currentPlan: { entryId: 'new-plan', tasks: [{ content: '生成订单查询 SQL', status: 'in_progress' }] },
      executionGroups: [{ key: 'old-plan:0', planEntryId: 'old-plan', taskIndex: 0, taskContent: '生成订单查询 SQL', stepIds: ['step-old-plan'] }],
      stepsById: { 'step-old-plan': step },
      stepOrder: ['step-old-plan'],
    })).toBe('当前正在执行 加载 sql-generator 技能 步骤，调用 sql-generator 技能')
  })

  it('同时存在已完成与执行中步骤时优先展示执行中步骤', () => {
    const doneStep: ReportPublicStep = {
      id: 'step-done',
      actionIntention: '整理历史数据',
      status: 'done',
      chunks: [{ entryId: '4-0', outputType: 'text', content: 'Skill: sql-generator' }],
      firstEntryId: '4-0',
      lastEntryId: '4-0',
      entryIds: ['4-0'],
      scope: 'todo',
      executionGroupKey: 'plan-1:0',
    }
    const runningStep: ReportPublicStep = {
      id: 'step-running',
      actionIntention: '生成趋势预测',
      status: 'in_progress',
      chunks: [{ entryId: '3-0', outputType: 'text', content: 'Skill: time-series-predictor' }],
      firstEntryId: '3-0',
      lastEntryId: '3-0',
      entryIds: ['3-0'],
      scope: 'todo',
      executionGroupKey: 'plan-1:0',
    }

    expect(getCollapsedTodoExecutionSummary({
      tasks: [{ content: '预测未来趋势', status: 'in_progress' }],
      currentPlan: { entryId: 'plan-1', tasks: [{ content: '预测未来趋势', status: 'in_progress' }] },
      executionGroups: [{ key: 'plan-1:0', planEntryId: 'plan-1', taskIndex: 0, taskContent: '预测未来趋势', stepIds: ['step-running', 'step-done'] }],
      stepsById: { 'step-running': runningStep, 'step-done': doneStep },
      // 已完成步骤在 Redis 顺序中更新得更晚，也应优先展示真实的 in_progress 步骤。
      stepOrder: ['step-running', 'step-done'],
    })).toBe('当前正在执行 生成趋势预测 步骤，调用 time-series-predictor 技能')
  })

  it('只把明确的中英文报告任务识别为报告产物阶段', () => {
    expect(isReportGenerationTask({ content: '生成最终 Markdown 报告' })).toBe(true)
    expect(isReportGenerationTask({ content: 'Generate final report' })).toBe(true)
    expect(isReportGenerationTask({ content: '加载 SQL 技能' })).toBe(false)
  })

  it('用 plan entry 和任务下标生成稳定展开 key', () => {
    expect(getTaskKey('1730000000000-0', 2)).toBe('1730000000000-0:2')
  })

  it('允许当前执行任务在默认展开后手动收起并再次展开', () => {
    const taskKey = getTaskKey('1730000000000-0', 0)

    expect(toggleReportTaskKey([taskKey], taskKey)).toEqual([])
    expect(toggleReportTaskKey([], taskKey)).toEqual([taskKey])
  })

  it('从 HTML 或 Markdown 中提取报告标题', () => {
    expect(getReportTitle({ format: 'html', content: '<html><head><title>销售报告</title></head></html>' })).toBe('销售报告')
    expect(getReportTitle({ format: 'markdown', content: '# 趋势分析\n内容' })).toBe('趋势分析')
  })

  it('按报告格式生成安全的下载文件信息', () => {
    expect(getReportDownloadDescriptor({ format: 'html', content: '<title>销售/趋势:报告?.html</title>' })).toEqual({
      fileName: '销售_趋势_报告_.html',
      mimeType: 'text/html',
    })
    expect(getReportDownloadDescriptor({ format: 'markdown', content: '# 月度分析.md\n内容' })).toEqual({
      fileName: '月度分析.md',
      mimeType: 'text/markdown',
    })
  })

  it('只聚合真实返回的报告下载格式，并使用同格式最后一个附件', () => {
    const candidate = { entryId: '1-0', stepId: 'report', format: 'html' as const, content: '<title>经营分析</title>' }
    const options = getReportDownloadOptions(candidate, [
      { entryId: '2-0', stepId: 'report', format: 'pdf', url: '/old/report.pdf' },
      { entryId: '3-0', stepId: 'report', format: 'pdf', url: '/latest/report.pdf' },
      { entryId: '4-0', stepId: 'report', format: 'word', url: 'https://files.example.com/report.docx' },
    ])

    expect(options.map(({ format, kind }) => ({ format, kind }))).toEqual([
      { format: 'html', kind: 'content' },
      { format: 'pdf', kind: 'url' },
      { format: 'word', kind: 'url' },
    ])
    expect(options.find((option) => option.format === 'pdf')?.url).toBe('/latest/report.pdf')
    expect(options.find((option) => option.format === 'word')?.fileName).toBe('report.docx')
  })

  it('将 done 秒数转换为完成耗时，缺失或非法值不展示', () => {
    expect(formatReportDuration(125)).toBe('耗时2分5秒')
    expect(formatReportDuration(0)).toBe('耗时0分0秒')
    expect(formatReportDuration(undefined)).toBeUndefined()
    expect(formatReportDuration(Number.NaN)).toBeUndefined()
    expect(formatReportDuration(-1)).toBeUndefined()
  })

  it('严格按照思考、ToDo、报告三个阶段渐进展示', () => {
    const createView = (overrides: Partial<Pick<ReportItem, 'currentPlan' | 'tasks' | 'status' | 'reportCandidate' | 'thinkingCompleted' | 'thinkingAnimationCompleted'>> = {}) => ({
      currentPlan: undefined,
      tasks: [],
      status: 'thinking' as const,
      reportCandidate: undefined,
      thinkingCompleted: false,
      ...overrides,
    })
    const plan = { entryId: '1730000000000-0', tasks: [] }
    const candidate = { entryId: '1730000001000-0', stepId: 'report', format: 'html' as const, content: '<h1>报告</h1>' }

    expect(getReportPresentationStage(createView({ reportCandidate: candidate }))).toBe('thinking')
    expect(getReportPresentationStage(createView({ currentPlan: plan, tasks: [{ content: '分析', status: 'in_progress' }], reportCandidate: candidate }))).toBe('thinking')
    expect(getReportPresentationStage(createView({ currentPlan: plan, thinkingCompleted: true, thinkingAnimationCompleted: false, tasks: [{ content: '分析', status: 'in_progress' }], reportCandidate: candidate }))).toBe('thinking')
    expect(getReportPresentationStage(createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '分析', status: 'in_progress' }], reportCandidate: candidate }))).toBe('todo')
    expect(getReportPresentationStage(createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '分析', status: 'pending' }], status: 'completed', reportCandidate: candidate }))).toBe('todo')
    expect(canRevealReport(createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '分析', status: 'completed' }], status: 'completed', reportCandidate: candidate }))).toBe(true)
    expect(canRevealReport(createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '旧步骤', status: 'cancelled' }], status: 'completed', reportCandidate: candidate }))).toBe(true)
    expect(canRevealReport(createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '生成 Markdown 报告', status: 'completed' }], status: 'completed', reportCandidate: { ...candidate, format: 'markdown', content: '# 最终报告' } }))).toBe(true)
    expect(canRevealReport({ ...createView({ currentPlan: plan, thinkingCompleted: true, tasks: [{ content: '导出 PDF', status: 'completed' }], status: 'completed' }), reportAttachments: [{ entryId: '3-0', stepId: 'report', format: 'pdf', url: '/report.pdf' }] })).toBe(true)
  })

  it('打字机结束后仅在后端思考步骤已完成时收起思考并展开 Todo', () => {
    const baseReport = {
      animateThinkingPlan: true,
      thinkingAnimationCompleted: false,
      thinkingOpen: true,
      thinkingCompleted: false,
      todoOpen: false,
      currentPlan: { entryId: 'plan-1', tasks: [] },
    } as ReportItem

    expect(completeReportThinkingTypewriter(baseReport)).toMatchObject({
      animateThinkingPlan: false,
      thinkingAnimationCompleted: true,
      thinkingOpen: true,
      todoOpen: false,
    })
    expect(completeReportThinkingTypewriter({ ...baseReport, thinkingCompleted: true })).toMatchObject({
      animateThinkingPlan: false,
      thinkingAnimationCompleted: true,
      thinkingOpen: false,
      todoOpen: true,
    })
  })

  it('只有报告产物上下文才过滤 HTML 或 Markdown 正文', () => {
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

    expect(getPublicStepLines(step)).toEqual(['正在整理关键结论', '<html>完整报告</html>'])
    expect(getStepSummary(step, true)).toBe('正在整理关键结论')
    expect(getPublicStepLines(step, true)).toEqual(['正在整理关键结论'])
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
      thinkingCompleted: true,
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
