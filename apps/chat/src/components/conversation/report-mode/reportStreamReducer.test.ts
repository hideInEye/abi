import { describe, expect, it } from 'vitest'

import { getRenderableStepChunks } from './embeddedChunkPayload'
import { compareRedisEntryIds, parseRedisEntryId, sortAndDedupeRedisEntries } from './redisEntryId'
import { createInitialReportStreamState, getOrderedReportSteps, parseReportStreamEvent, reduceReportStreamEntries, reduceReportStreamEntry } from './reportStreamReducer'
import type { RawReportStreamEntry, ReportStreamEvent } from './types'

function entry(id: string, event: ReportStreamEvent): RawReportStreamEntry {
  return {
    id,
    data: JSON.stringify(event),
  }
}

describe('Redis Stream entry ID helpers', () => {
  it('按毫秒和序号的真实数值比较超大 ID', () => {
    expect(parseRedisEntryId('1784617210386-12')).toEqual({
      milliseconds: 1784617210386n,
      sequence: 12n,
    })
    expect(compareRedisEntryIds('90071992547409930-2', '90071992547409930-10')).toBeLessThan(0)
    expect(compareRedisEntryIds('90071992547409931-0', '90071992547409930-999')).toBeGreaterThan(0)
  })

  it('排序历史 entry 并保留首次出现的重复 ID', () => {
    const result = sortAndDedupeRedisEntries([
      { id: '10-2', data: 'late' },
      { id: '9-100', data: 'early' },
      { id: '10-2', data: 'duplicate' },
      { id: '10-1', data: 'middle' },
    ])

    expect(result).toEqual([
      { id: '9-100', data: 'early' },
      { id: '10-1', data: 'middle' },
      { id: '10-2', data: 'late' },
    ])
  })
})

describe('report stream reducer', () => {
  it('解析已知事件并拒绝坏 JSON 或未知类型', () => {
    expect(parseReportStreamEvent('{bad json')).toBeUndefined()
    expect(parseReportStreamEvent('{"type":"unknown"}')).toBeUndefined()
    expect(parseReportStreamEvent('{"type":"done","time":125}')).toEqual({ type: 'done', time: 125 })
    expect(parseReportStreamEvent(JSON.stringify({ data: { type: 'step.plan', id: 'step-plan', content: '制定执行计划' } }))).toEqual({
      type: 'step.plan',
      id: 'step-plan',
      content: '制定执行计划',
    })
  })

  it('首个 step.plan 固定为思考总结，并在同一步骤 done 后进入 ToDo 阶段', () => {
    const beforeThinkingDone = reduceReportStreamEntries([
      entry('1-0', { type: 'step.start', id: 'step-1', title: '思考中' }),
      entry('2-0', { type: 'step.start', id: 'step-1', title: 'TODO::init:0/2', todo_meta: { state: 'init', done: 0, total: 2 } }),
      entry('3-0', { type: 'plan.update', tasks: [{ content: '确认数据完整性', status: 'in_progress' }, { content: '生成报告', status: 'pending' }], version: 1 }),
      {
        id: '4-0',
        data: JSON.stringify({
          data: {
            type: 'step.plan',
            id: 'step-1',
            content: '先确认历史数据完整性，再加载预测技能。',
          },
        }),
      },
      entry('5-0', { type: 'step.meta', id: 'step-1', action: 'todowrite', todo_meta: { state: 'init', done: 0, total: 2 } }),
    ])
    const state = reduceReportStreamEntry(beforeThinkingDone, entry('6-0', { type: 'step.done', id: 'step-1', status: 'done' }))
    const waitingForTypewriter = reduceReportStreamEntry(
      { ...beforeThinkingDone, thinkingAnimationCompleted: false },
      entry('6-0', { type: 'step.done', id: 'step-1', status: 'done' }),
    )
    const typewriterAlreadyCompleted = reduceReportStreamEntry(
      { ...beforeThinkingDone, thinkingAnimationCompleted: true },
      entry('6-0', { type: 'step.done', id: 'step-1', status: 'done' }),
    )

    expect(beforeThinkingDone.thinkingPlan).toEqual({
      entryId: '4-0',
      id: 'step-1',
      content: '先确认历史数据完整性，再加载预测技能。',
    })
    expect(beforeThinkingDone).toMatchObject({ status: 'thinking', thinkingOpen: true, thinkingCompleted: false })
    expect(beforeThinkingDone.currentPlan?.version).toBe(1)
    expect(state).toMatchObject({ status: 'running', thinkingOpen: false, thinkingCompleted: true })
    expect(waitingForTypewriter).toMatchObject({ status: 'running', thinkingOpen: true, thinkingCompleted: true, thinkingAnimationCompleted: false, todoOpen: false })
    expect(typewriterAlreadyCompleted).toMatchObject({ status: 'running', thinkingOpen: false, thinkingCompleted: true, thinkingAnimationCompleted: true, todoOpen: true })
    expect(state.todoSummaries).toEqual([])
  })

  it('plan.update 后的 step.plan 总结前一个已完成 Todo，且不会增加计划中的任务数量', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'step.start', id: 'step-1', title: '思考中' }),
      entry('2-0', { type: 'step.start', id: 'step-1', title: 'TODO::init:0/5', todo_meta: { state: 'init', done: 0, started: 1, total: 5 } }),
      entry('3-0', {
        type: 'plan.update',
        tasks: [
          { content: '加载 sql-generator 技能，了解SQL生成流程', status: 'in_progress' },
          { content: '生成订单总金额查询SQL', status: 'pending' },
          { content: '执行SQL查询获取数据', status: 'pending' },
          { content: '分析数据并生成可视化图表', status: 'pending' },
          { content: '生成最终HTML报告', status: 'pending' },
        ],
        version: 1,
      }),
      entry('4-0', { type: 'step.plan', id: 'step-1', content: '先明确分析目标和执行计划。' }),
      entry('5-0', { type: 'step.done', id: 'step-1', status: 'done' }),
      entry('6-0', { type: 'step.start', id: 'step-3', step: 3, title: '思考中', detail: 'Thought/Action/Observation' }),
      entry('7-0', { type: 'step.start', id: 'step-3', step: 3, title: 'TODO::progress:2/5', detail: 'todowrite', todo_meta: { state: 'progress', done: 1, started: 2, total: 5 } }),
      entry('8-0', {
        type: 'plan.update',
        source: 'llm',
        tasks: [
          { content: '加载 sql-generator 技能，了解SQL生成流程', status: 'completed' },
          { content: '生成订单总金额查询SQL', status: 'in_progress' },
          { content: '执行SQL查询获取数据', status: 'pending' },
          { content: '分析数据并生成可视化图表', status: 'pending' },
          { content: '生成最终HTML报告', status: 'pending' },
        ],
        version: 2,
      }),
      entry('9-0', { type: 'step.plan', id: 'step-3', content: 'sql-generator技能已加载，现在需要生成查询订单总金额的SQL。' }),
      entry('10-0', { type: 'step.meta', id: 'step-3', title: 'TODO::progress:2/5', action: 'todowrite', todo_meta: { state: 'progress', done: 1, started: 2, total: 5 } }),
      entry('11-0', { type: 'step.done', id: 'step-3', status: 'done' }),
    ])

    expect(state.thinkingPlan?.content).toBe('先明确分析目标和执行计划。')
    expect(state.tasks).toHaveLength(5)
    expect(state.tasks.map((task) => task.content)).toEqual([
      '加载 sql-generator 技能，了解SQL生成流程',
      '生成订单总金额查询SQL',
      '执行SQL查询获取数据',
      '分析数据并生成可视化图表',
      '生成最终HTML报告',
    ])
    expect(state.todoSummaries.map(({ taskIndex, taskContent, content }) => ({ taskIndex, taskContent, content }))).toEqual([
      { taskIndex: 0, taskContent: '加载 sql-generator 技能，了解SQL生成流程', content: 'sql-generator技能已加载，现在需要生成查询订单总金额的SQL。' },
    ])
    expect(state.stepsById['step-3'].todoMeta).toMatchObject({ state: 'progress', done: 1, started: 2, total: 5 })
  })

  it('空内容或无法可靠映射的 Todo 总结只记录 warning，不猜测归属', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'step.start', id: 'step-1', title: '思考中' }),
      entry('2-0', { type: 'step.plan', id: 'step-1', content: '初始思考总结' }),
      entry('3-0', { type: 'step.done', id: 'step-1', status: 'done' }),
      entry('4-0', { type: 'plan.update', tasks: [{ content: '任务 A', status: 'in_progress' }, { content: '任务 B', status: 'pending' }] }),
      entry('5-0', { type: 'step.start', id: 'step-2', title: 'TODO::init:0/2', todo_meta: { state: 'init', done: 0, total: 2 } }),
      entry('6-0', { type: 'step.plan', id: 'step-2', content: '没有前一个已完成任务，不能归到当前执行项' }),
      entry('7-0', { type: 'step.plan', id: 'step-empty', content: '   ' }),
    ])

    expect(state.todoSummaries).toEqual([])
    expect(state.warnings.some((warning) => warning.includes('无法可靠归属'))).toBe(true)
    expect(state.warnings).toContain('entry 7-0 的 step.plan.content 无效，已跳过')
  })

  it('将首个 plan 前的同 id 步骤合并为思考，且不暴露内部推理字段', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'question', content: '生成销售报告' }),
      entry('2-0', { type: 'step.start', step: 1, id: 'step-1', title: '思考中', detail: 'Thought/Action/Observation' }),
      entry('3-0', { type: 'step.start', step: 0, id: 'step-1', title: 'load_skill' }),
      entry('4-0', {
        type: 'step.meta',
        id: 'step-1',
        title: 'load_skill',
        thought: 'internal thought',
        action_reason: '公开执行原因',
        action_input: '{"secret":true}',
        action: 'load_skill',
        action_intention: '加载销售分析 Skill',
      }),
      entry('5-0', { type: 'step.chunk', id: 'step-1', output_type: 'text', content: 'Skill loaded' }),
      entry('6-0', { type: 'step.done', id: 'step-1', status: 'done' }),
    ])

    const step = state.stepsById['step-1']
    expect(state.streamQuestion).toBe('生成销售报告')
    expect(state.thinkingStepIds).toEqual(['step-1'])
    expect(state.stepOrder).toEqual(['step-1'])
    expect(step).toMatchObject({
      ordinal: 1,
      title: 'load_skill',
      action: 'load_skill',
      actionIntention: '加载销售分析 Skill',
      actionReason: '公开执行原因',
      status: 'done',
      scope: 'thinking',
    })
    expect(JSON.stringify(step)).not.toContain('internal thought')
    expect(JSON.stringify(step)).not.toContain('secret')
  })

  it('首个 plan 保持 ToDo 默认收起，后续计划更新保留用户的展开状态', () => {
    const initial = createInitialReportStreamState()
    const firstPlan = reduceReportStreamEntry(
      initial,
      entry('10-0', {
        type: 'plan.update',
        tasks: [
          { content: '查询数据', status: 'in_progress', priority: 'high' },
          { content: '生成报告', status: 'pending', priority: 'low' },
        ],
        version: 1,
      }),
    )
    // 页面加载后的手动展开属于 UI 状态，后续接口快照不能覆盖用户选择。
    const userOpenedTodo = { ...firstPlan, todoOpen: true }
    const secondPlan = reduceReportStreamEntry(
      userOpenedTodo,
      entry('20-0', {
        type: 'plan.update',
        tasks: [
          { content: '查询数据', status: 'completed', priority: 'high' },
          { content: '生成报告', status: 'in_progress', priority: 'low' },
        ],
        version: 2,
      }),
    )

    expect(initial).toMatchObject({ thinkingOpen: true, todoOpen: false })
    expect(firstPlan).toMatchObject({ status: 'thinking', thinkingOpen: true, thinkingCompleted: false, todoOpen: false })
    expect(firstPlan.expandedTaskKeys).toEqual(['10-0:0'])
    expect(secondPlan.todoOpen).toBe(true)
    expect(secondPlan.currentPlan?.version).toBe(2)
    expect(secondPlan.tasks.map((task) => task.status)).toEqual(['completed', 'in_progress'])
    expect(secondPlan.expandedTaskKeys).toEqual(['20-0:1'])
  })

  it('静默忽略已完成任务落在未完成任务之后的异常计划，并继续接收后续有效计划', () => {
    const validPlan = reduceReportStreamEntry(
      createInitialReportStreamState(),
      entry('10-0', {
        type: 'plan.update',
        tasks: [
          { content: '读取交易数据', status: 'completed' },
          { content: '分析交易趋势', status: 'in_progress' },
          { content: '生成报告', status: 'pending' },
        ],
        version: 1,
      }),
    )
    const malformedPlan = reduceReportStreamEntry(
      validPlan,
      entry('20-0', {
        type: 'plan.update',
        tasks: [
          { content: '读取交易数据', status: 'completed' },
          { content: '分析交易趋势', status: 'in_progress' },
          { content: '生成报告', status: 'pending' },
          { content: '加载补充数据', status: 'completed' },
        ],
        version: 2,
      }),
    )
    const recoveredPlan = reduceReportStreamEntry(
      malformedPlan,
      entry('30-0', {
        type: 'plan.update',
        tasks: [
          { content: '读取交易数据', status: 'completed' },
          { content: '分析交易趋势', status: 'completed' },
          { content: '生成报告', status: 'in_progress' },
        ],
        version: 3,
      }),
    )

    expect(malformedPlan.tasks).toEqual(validPlan.tasks)
    expect(malformedPlan.currentPlan).toEqual(validPlan.currentPlan)
    expect(malformedPlan.warnings).toEqual(validPlan.warnings)
    expect(malformedPlan.lastEntryId).toBe('20-0')
    expect(malformedPlan.processedEntryIds['20-0']).toBe(true)
    expect(recoveredPlan.currentPlan?.version).toBe(3)
    expect(recoveredPlan.tasks.map((task) => task.status)).toEqual(['completed', 'completed', 'in_progress'])
  })

  it('首份计划顺序异常时保持空 Todo，且不产生提示', () => {
    const state = reduceReportStreamEntry(
      createInitialReportStreamState(),
      entry('10-0', {
        type: 'plan.update',
        tasks: [
          { content: '等待数据', status: 'pending' },
          { content: '已提前完成的异常任务', status: 'completed' },
        ],
      }),
    )

    expect(state.tasks).toEqual([])
    expect(state.currentPlan).toBeUndefined()
    expect(state.warnings).toEqual([])
    expect(state.lastEntryId).toBe('10-0')
    expect(state.processedEntryIds['10-0']).toBe(true)
  })

  it('按 plan 时间片把步骤归入唯一 in_progress 项，并保留旧执行记录', () => {
    const state = reduceReportStreamEntries([
      entry('10-0', {
        type: 'plan.update',
        tasks: [
          { content: '查询数据', status: 'in_progress' },
          { content: '生成报告', status: 'pending' },
        ],
        version: 1,
      }),
      entry('11-0', { type: 'step.start', step: 2, id: 'query-step', title: 'code_interpreter' }),
      entry('12-0', { type: 'step.done', id: 'query-step', status: 'done' }),
      entry('20-0', {
        type: 'plan.update',
        tasks: [
          { content: '查询数据', status: 'completed' },
          { content: '生成报告', status: 'in_progress' },
        ],
        version: 2,
      }),
      entry('21-0', { type: 'step.start', step: 3, id: 'report-step', title: 'html_interpreter' }),
      entry('30-0', {
        type: 'plan.update',
        tasks: [
          { content: '查询数据', status: 'completed' },
          { content: '生成报告', status: 'completed' },
        ],
        version: 3,
      }),
      entry('31-0', { type: 'step.start', step: 4, id: 'orphan-step', title: 'terminate' }),
    ])

    expect(state.executionGroups).toEqual([
      {
        key: '10-0:0',
        planEntryId: '10-0',
        taskIndex: 0,
        taskContent: '查询数据',
        stepIds: ['query-step'],
      },
      {
        key: '20-0:1',
        planEntryId: '20-0',
        taskIndex: 1,
        taskContent: '生成报告',
        stepIds: ['report-step'],
      },
    ])
    expect(state.unassignedStepIds).toEqual(['orphan-step'])
    expect(state.stepsById['orphan-step'].scope).toBe('unassigned')
  })

  it('多个 in_progress 项时不猜测任务下标', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', {
        type: 'plan.update',
        tasks: [
          { content: '任务 A', status: 'in_progress' },
          { content: '任务 B', status: 'in_progress' },
        ],
      }),
      entry('2-0', { type: 'step.start', id: 'ambiguous', title: 'tool' }),
    ])

    expect(state.executionGroups).toHaveLength(0)
    expect(state.unassignedStepIds).toEqual(['ambiguous'])
  })

  it('把无执行中计划之后的步骤回填到下一份计划中新进入执行中的唯一任务', () => {
    const state = reduceReportStreamEntries([
      entry('1787017831447-0', {
        type: 'plan.update',
        source: 'llm',
        version: 3,
        tasks: [
          { content: '加载 sql-generator 技能', status: 'completed' },
          { content: '生成订单总额查询 SQL', status: 'pending' },
          { content: '执行 SQL 获取订单数据', status: 'pending' },
        ],
      }),
      entry('1787017874528-0', { type: 'step.start', id: 'step-6', step: 6, title: '思考中' }),
      entry('1787017902145-0', { type: 'step.start', id: 'step-6', step: 6, title: 'execute_skill_script_file' }),
      entry('1787017902149-0', { type: 'step.meta', id: 'step-6', action: 'execute_skill_script_file', action_intention: '生成订单总额查询SQL' }),
      entry('1787017902149-1', { type: 'step.chunk', id: 'step-6', output_type: 'text', content: 'SQL 查询完成' }),
      entry('1787017902150-0', { type: 'step.done', id: 'step-6', status: 'done' }),
      entry('1787017902152-0', {
        type: 'plan.update',
        source: 'framework',
        version: 4,
        tasks: [
          { content: '加载 sql-generator 技能', status: 'completed' },
          { content: '生成订单总额查询 SQL', status: 'in_progress' },
          { content: '执行 SQL 获取订单数据', status: 'pending' },
        ],
      }),
    ])

    expect(state.unassignedStepIds).toEqual([])
    expect(state.stepsById['step-6']).toMatchObject({
      scope: 'todo',
      executionGroupKey: '1787017902152-0:1',
    })
    expect(state.executionGroups).toContainEqual({
      key: '1787017902152-0:1',
      planEntryId: '1787017902152-0',
      taskIndex: 1,
      taskContent: '生成订单总额查询 SQL',
      stepIds: ['step-6'],
    })
  })

  it('后置计划存在多个执行中任务时仍保留未归属步骤', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', {
        type: 'plan.update',
        tasks: [
          { content: '任务 A', status: 'pending' },
          { content: '任务 B', status: 'pending' },
        ],
      }),
      entry('2-0', { type: 'step.start', id: 'ambiguous-late-step', title: 'tool' }),
      entry('3-0', {
        type: 'plan.update',
        tasks: [
          { content: '任务 A', status: 'in_progress' },
          { content: '任务 B', status: 'in_progress' },
        ],
      }),
    ])

    expect(state.executionGroups).toHaveLength(0)
    expect(state.unassignedStepIds).toEqual(['ambiguous-late-step'])
    expect(state.stepsById['ambiguous-late-step'].scope).toBe('unassigned')
  })

  it('忽略思考阶段技能 Markdown，只保留报告 Todo 的 HTML 候选', () => {
    const prePlanMarkdown = entry('2-0', {
      type: 'step.chunk',
      id: 'skill-step',
      output_type: 'markdown',
      content: '# Skill 文档',
    })
    const finalHtml = entry('9-0', {
      type: 'step.chunk',
      id: 'html-step',
      output_type: 'html',
      content: '<!doctype html><html></html>',
    })
    const state = reduceReportStreamEntries([
      finalHtml,
      entry('1-0', { type: 'step.start', id: 'skill-step', title: 'load_skill' }),
      prePlanMarkdown,
      entry('3-0', { type: 'plan.update', tasks: [{ content: '生成报告', status: 'in_progress' }] }),
    ])

    expect(state.reportCandidate).toEqual({
      entryId: '9-0',
      stepId: 'html-step',
      format: 'html',
      content: '<!doctype html><html></html>',
    })
    expect(state.stepsById['skill-step'].scope).toBe('thinking')
  })

  it('保留 PDF/Word 下载附件且不覆盖 HTML 预览候选', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成经营分析报告', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'report', title: 'generate_report_html' }),
      entry('3-0', { type: 'step.chunk', id: 'report', output_type: 'html', content: '<html><title>经营报告</title></html>' }),
      entry('4-0', { type: 'step.chunk', id: 'report', output_type: 'pdf', content: 'https://files.example.com/report.pdf' }),
      entry('5-0', { type: 'step.chunk', id: 'report', output_type: 'word', content: '/downloads/report.docx' }),
      entry('6-0', { type: 'plan.update', tasks: [{ content: '生成经营分析报告', status: 'completed' }] }),
      entry('7-0', { type: 'done', time: 125 }),
    ])

    expect(state.reportCandidate).toMatchObject({ entryId: '3-0', format: 'html' })
    expect(state.reportAttachments).toEqual([
      { entryId: '4-0', stepId: 'report', format: 'pdf', url: 'https://files.example.com/report.pdf' },
      { entryId: '5-0', stepId: 'report', format: 'word', url: '/downloads/report.docx' },
    ])
    expect(state.durationSeconds).toBe(125)
    expect(state.status).toBe('completed')
  })

  it('只有实际 PDF 附件时仍识别为已生成文件', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成并导出 PDF 报告', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'report', title: 'generate_report_pdf' }),
      entry('3-0', { type: 'step.chunk', id: 'report', output_type: 'pdf', content: '/downloads/report.pdf' }),
      entry('4-0', { type: 'plan.update', tasks: [{ content: '生成并导出 PDF 报告', status: 'completed' }] }),
      entry('5-0', { type: 'done' }),
    ])

    expect(state.status).toBe('completed')
    expect(state.reportCandidate).toBeUndefined()
    expect(state.reportAttachments).toHaveLength(1)
    expect(state.currentPlan).toBeDefined()
  })

  it('done 后只接纳已完成报告 Todo 的 HTML/Markdown，不用技能 Markdown 兜底', () => {
    const completed = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成 HTML 报告', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'html-report', title: 'generate_report_html' }),
      entry('3-0', { type: 'step.chunk', id: 'html-report', output_type: 'html', content: '<html><body>报告</body></html>' }),
      entry('4-0', { type: 'plan.update', tasks: [{ content: '生成 HTML 报告', status: 'completed' }] }),
      entry('5-0', { type: 'done' }),
    ])
    const completedMarkdown = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成 Markdown 报告', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'markdown-report', title: 'generate_report_markdown' }),
      entry('3-0', { type: 'step.chunk', id: 'markdown-report', output_type: 'markdown', content: '# 最终报告' }),
      entry('4-0', { type: 'plan.update', tasks: [{ content: '生成 Markdown 报告', status: 'completed' }] }),
      entry('5-0', { type: 'done' }),
    ])
    const markdownOnly = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '加载 SQL 技能', status: 'in_progress' }, { content: '生成最终报告', status: 'pending' }] }),
      entry('2-0', { type: 'step.start', id: 'skill-doc', title: 'load_skill' }),
      entry('3-0', { type: 'step.chunk', id: 'skill-doc', output_type: 'markdown', content: '# SQL 生成技能' }),
      entry('4-0', { type: 'plan.update', tasks: [{ content: '加载 SQL 技能', status: 'completed' }, { content: '生成最终报告', status: 'cancelled' }] }),
      entry('5-0', { type: 'done' }),
    ])
    const failed = reduceReportStreamEntries([entry('1-0', { type: 'done' })])

    expect(completed).toMatchObject({ status: 'completed', doneEntryId: '5-0', lastEntryId: '5-0' })
    expect(completedMarkdown).toMatchObject({ status: 'completed', reportCandidate: { format: 'markdown', content: '# 最终报告' } })
    expect(markdownOnly).toMatchObject({
      status: 'failed',
      doneEntryId: '5-0',
      error: { code: 'report_content_missing', message: '未收到报告文件' },
    })
    expect(markdownOnly.reportCandidate).toBeUndefined()
    expect(failed).toMatchObject({
      status: 'failed',
      doneEntryId: '1-0',
      error: { code: 'report_content_missing', message: '未收到报告文件' },
    })
  })

  it('错误 final 立即收敛为失败，后续 done 不得覆盖失败终态', () => {
    const finalError = "大模型对话生成错误!(Error code: 429 - {'error': {'message': 'rpm exhausted'}})"
    const failedAtFinal = reduceReportStreamEntries([
      entry('1-0', {
        type: 'plan.update',
        tasks: [
          { content: '获取订单数据', status: 'completed' },
          { content: '生成最终 HTML 分析报告', status: 'in_progress' },
          { content: '更新任务状态并结束', status: 'pending' },
        ],
      }),
      entry('2-0', { type: 'step.start', id: 'html-step', title: '思考中' }),
      // 即使此前误把技能说明识别成候选，也不能在错误终态展示成成功报告。
      entry('3-0', { type: 'step.chunk', id: 'skill-step', output_type: 'markdown', content: '# Skill 文档' }),
      entry('4-0', { type: 'final', content: finalError }),
    ])
    const state = reduceReportStreamEntry(failedAtFinal, entry('5-0', { type: 'done', time: 326 }))

    expect(failedAtFinal).toMatchObject({
      status: 'failed',
      lastEntryId: '4-0',
      final: { entryId: '4-0', content: finalError },
      error: {
        code: 'report_generation_failed',
        message: '报告生成失败，请稍后重试。',
      },
    })
    expect(failedAtFinal.tasks.map((task) => task.status)).toEqual(['completed', 'cancelled', 'cancelled'])
    expect(failedAtFinal.stepsById['html-step'].status).toBe('failed')

    expect(state).toMatchObject({
      status: 'failed',
      doneEntryId: '5-0',
      durationSeconds: 326,
      final: { entryId: '4-0', content: finalError },
      error: {
        code: 'report_generation_failed',
        message: '报告生成失败，请稍后重试。',
      },
    })
    expect(state.currentPlan?.tasks.map((task) => task.status)).toEqual(['completed', 'cancelled', 'cancelled'])
  })

  it('兼容真实数据中分段 text 包装的报告，并在 done 时收敛未闭合步骤', () => {
    const html = '<!DOCTYPE html>\n<html><head><title>测试报告</title></head><body>完成</body></html>'
    const toolResult = `${JSON.stringify({ chunks: [{ output_type: 'html', content: html }, { output_type: 'pdf', content: '/reports/test.pdf' }, { output_type: 'word', content: '/reports/test.docx' }], report: { version: '1.0' } })}\n\n任务提示文字`
    const splitAt = Math.floor(toolResult.length / 2)
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成报告', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'report-step', title: 'html_interpreter' }),
      entry('3-0', { type: 'step.meta', id: 'report-step', title: 'html_interpreter', action: 'html_interpreter' }),
      entry('4-0', { type: 'step.chunk', id: 'report-step', output_type: 'text', content: toolResult.slice(0, splitAt) }),
      entry('5-0', { type: 'step.chunk', id: 'report-step', output_type: 'text', content: toolResult.slice(splitAt) }),
      entry('6-0', { type: 'step.done', id: 'report-step', status: 'done' }),
      entry('7-0', { type: 'step.start', id: 'dangling-step', title: '思考中', detail: 'Thought/Action/Observation' }),
      entry('8-0', { type: 'plan.update', tasks: [{ content: '生成报告', status: 'completed' }], source: 'terminate' }),
      entry('9-0', { type: 'final', content: '报告已生成' }),
      entry('10-0', { type: 'done' }),
    ])

    expect(state).toMatchObject({
      status: 'completed',
      doneEntryId: '10-0',
      reportCandidate: {
        entryId: '5-0',
        stepId: 'report-step',
        format: 'html',
        content: html,
      },
    })
    expect(state.stepsById['report-step'].chunks.every((chunk) => chunk.outputType === 'report_payload')).toBe(true)
    expect(state.reportAttachments.map(({ format, url }) => ({ format, url }))).toEqual([
      { format: 'pdf', url: '/reports/test.pdf' },
      { format: 'word', url: '/reports/test.docx' },
    ])
    expect(state.stepsById['dangling-step'].status).toBe('done')
    expect(Object.values(state.stepsById).some((step) => step.status === 'in_progress')).toBe(false)
  })

  it('同一步骤的三段工具 JSON 完整后才展开公开 chunks', () => {
    const imageUrl = 'http://192.168.1.195:9000/messageimg/monthly_order_count_trend.png?X-Amz-Credential=test&X-Amz-Signature=complete'
    const payload = `${JSON.stringify({
      chunks: [
        { output_type: 'image', content: imageUrl, title: '月度订单数量趋势' },
        { output_type: 'text', content: '图表已生成：柱状图；选择原因：用户指定图表类型。' },
        { output_type: 'text', content: `已生成的图片URL：${imageUrl}`, emit_to_client: false },
      ],
      chart: { image_url: imageUrl },
    })}\n\n⚠️ Reminder: update todo list`
    const firstBreak = Math.floor(payload.length / 3)
    const secondBreak = Math.floor((payload.length * 2) / 3)
    const base = reduceReportStreamEntries([
      entry('1-0', { type: 'plan.update', tasks: [{ content: '生成月度订单数量图表', status: 'in_progress' }] }),
      entry('2-0', { type: 'step.start', id: 'step-8', title: 'generate_chart_image' }),
    ])
    const afterFirst = reduceReportStreamEntry(base, entry('3-0', { type: 'step.chunk', id: 'step-8', output_type: 'text', content: payload.slice(0, firstBreak) }))
    const afterSecond = reduceReportStreamEntry(afterFirst, entry('4-0', { type: 'step.chunk', id: 'step-8', output_type: 'text', content: payload.slice(firstBreak, secondBreak) }))
    const completed = reduceReportStreamEntry(afterSecond, entry('5-0', { type: 'step.chunk', id: 'step-8', output_type: 'text', content: payload.slice(secondBreak) }))

    expect(getRenderableStepChunks(afterFirst.stepsById['step-8'].chunks)).toEqual([])
    expect(getRenderableStepChunks(afterSecond.stepsById['step-8'].chunks)).toEqual([])
    expect(completed.stepsById['step-8'].chunks.every((chunk) => chunk.outputType === 'report_payload')).toBe(true)
    expect(getRenderableStepChunks(completed.stepsById['step-8'].chunks)).toEqual([
      {
        entryId: '3-0:embedded:0:0',
        outputType: 'image',
        content: imageUrl,
        title: '月度订单数量趋势',
      },
      {
        entryId: '3-0:embedded:0:1',
        outputType: 'text',
        content: '图表已生成：柱状图；选择原因：用户指定图表类型。',
        title: undefined,
      },
    ])
    expect(completed.reportCandidate).toBeUndefined()
  })

  it('实时 reducer 拒绝重复和比 lastEntryId 更旧的事件并保留最后 ID', () => {
    const first = reduceReportStreamEntry(createInitialReportStreamState(), entry('10-2', { type: 'question', content: '新问题' }))
    const duplicate = reduceReportStreamEntry(first, entry('10-2', { type: 'question', content: '重复问题' }))
    const old = reduceReportStreamEntry(duplicate, entry('9-99', { type: 'question', content: '旧问题' }))

    expect(duplicate).toBe(first)
    expect(old).toBe(first)
    expect(old.streamQuestion).toBe('新问题')
    expect(old.lastEntryId).toBe('10-2')
  })

  it('按首次出现顺序返回合并后的公开步骤', () => {
    const state = reduceReportStreamEntries([
      entry('1-0', { type: 'step.start', id: 'a', title: 'A' }),
      entry('2-0', { type: 'step.start', id: 'b', title: 'B' }),
      entry('3-0', { type: 'step.meta', id: 'a', title: 'A updated' }),
    ])

    expect(getOrderedReportSteps(state).map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'a', title: 'A updated' },
      { id: 'b', title: 'B' },
    ])
  })
})
