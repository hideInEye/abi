import { describe, expect, it } from 'vitest'

import { areReportHistoryRoundsEqual, createReportItemFromHistory, mergeReportTimelineItems, splitConversationHistoryRounds } from './reportHistoryAdapter'
import { createInitialReportStreamState } from './reportStreamReducer'
import type { ReportHistoryRoundGroup, ReportItem } from './types'

function reportRound(): ReportHistoryRoundGroup {
  return {
    roundIndex: 2,
    messages: [
      {
        roundIndex: 2,
        chatMode: 'chat_report',
        roleType: 'human',
        createTime: '2026-07-24T14:05:30',
        messageDetail: { type: 'human', chat_mode: 'chat_report', data: { content: '生成销售报告' } },
      },
      {
        roundIndex: 2,
        chatMode: 'chat_report',
        roleType: 'view',
        messageDetail: {
          type: 'view',
          chat_mode: 'chat_report',
          data: {
            content: JSON.stringify({
              version: 1,
              type: 'react-agent',
              total_time: 125,
              final_content: '销售分析报告已生成完成，核心指标与趋势已经整理。',
              task_plan: [
                { content: '分析数据', status: 'completed', priority: 'high' },
                { content: '生成报告', status: 'completed', priority: 'high' },
              ],
              steps: [
                {
                  id: 'step-thinking',
                  title: 'load_skill',
                  thought: '内部推理',
                  action_input: '{"secret":true}',
                  action_intention: '加载分析技能',
                  action: 'load_skill',
                  outputs: [{ output_type: 'text', content: '技能已加载' }],
                  status: 'done',
                },
                { id: 'todo-init', title: 'TODO::init:0/2', action: 'todowrite', todo_meta: { state: 'init', done: 0, total: 2 }, status: 'done' },
                {
                  id: 'step-analysis',
                  title: 'execute_skill',
                  thought: '不可公开',
                  action_reason: '用于解释本次公开执行动作',
                  action_input: '/private/path',
                  outputs: [{ output_type: 'code', content: 'result = analyze()' }],
                  status: 'done',
                },
                { id: 'todo-progress', title: 'TODO::progress:1/2', action: 'todowrite', todo_meta: { state: 'progress', done: 1, total: 2 }, status: 'done' },
                {
                  id: 'step-report',
                  title: 'html_interpreter',
                  action_intention: '生成可视化报告',
                  outputs: [
                    { output_type: 'html', content: '<html><head><title>销售报告</title></head><body>完成</body></html>' },
                    { output_type: 'pdf', content: '/reports/sales.pdf' },
                    { output_type: 'word', content: '/reports/sales.docx' },
                  ],
                  status: 'done',
                },
              ],
              generated_images: ['/images/chart.png'],
            }),
          },
        },
      },
    ],
  }
}

function taskItem(sortOrder: number, id = `task-${sortOrder}`): ReportItem {
  return {
    ...createInitialReportStreamState(),
    id,
    taskId: id,
    conversationId: 'conv-1',
    sessionId: 'session-1',
    streamKey: `report:conv-1:${sortOrder}`,
    question: `问题 ${sortOrder}`,
    sortOrder,
    createdAt: sortOrder,
    source: 'task',
    status: 'waiting_stream',
  }
}

describe('report history adapter', () => {
  it('按 chatMode 分流普通与报告轮次，并兼容嵌套 chat_mode', () => {
    const normalRound: ReportHistoryRoundGroup = { roundIndex: 1, messages: [{ chatMode: null }] }
    const nestedReportRound: ReportHistoryRoundGroup = { roundIndex: 3, messages: [{ messageDetail: { chat_mode: 'chat_report' } }] }

    const result = splitConversationHistoryRounds([normalRound, reportRound(), nestedReportRound])

    expect(result.interactionRounds).toEqual([normalRound])
    expect(result.reportRounds).toHaveLength(2)
  })

  it('相同报告历史视为稳定结果，内容或消息标识变化时才触发恢复更新', () => {
    const current = reportRound()
    const same = JSON.parse(JSON.stringify(current)) as ReportHistoryRoundGroup
    const changed = JSON.parse(JSON.stringify(current)) as ReportHistoryRoundGroup
    changed.messages![1].messageDetail!.data!.content = '{"type":"react-agent","version":2}'

    expect(areReportHistoryRoundsEqual([current], [same])).toBe(true)
    expect(areReportHistoryRoundsEqual([current], [changed])).toBe(false)
  })

  it('从 react-agent payload 恢复任务、步骤和最后一个 HTML，且丢弃内部字段', () => {
    const item = createReportItemFromHistory(reportRound(), 'conv-1', 'session-1')

    expect(item.question).toBe('生成销售报告')
    expect(item.sortOrder).toBe(2)
    expect(item.status).toBe('completed')
    expect(item.thinkingCompleted).toBe(true)
    expect(item.todoOpen).toBe(false)
    expect(item.tasks.map((task) => task.status)).toEqual(['completed', 'completed'])
    expect(item.thinkingStepIds).toEqual(['step-thinking'])
    expect(item.executionGroups.map((group) => group.stepIds)).toEqual([['step-analysis'], ['step-report']])
    expect(item.reportCandidate).toMatchObject({ format: 'html', stepId: 'step-report' })
    expect(item.reportAttachments.map(({ format, url }) => ({ format, url }))).toEqual([
      { format: 'pdf', url: '/reports/sales.pdf' },
      { format: 'word', url: '/reports/sales.docx' },
    ])
    expect(item.durationSeconds).toBe(125)
    expect(item.generatedImages).toEqual(['/images/chart.png'])
    expect(item.final).toEqual({
      entryId: 'history:2:final',
      content: '销售分析报告已生成完成，核心指标与趋势已经整理。',
    })
    expect(item.stepsById['step-analysis']?.actionReason).toBe('用于解释本次公开执行动作')
    expect(JSON.stringify(item)).not.toContain('内部推理')
    expect(JSON.stringify(item)).not.toContain('/private/path')
  })

  it('历史 text 包装的 chunks 展开为公开输出并过滤内部提示', () => {
    const round = reportRound()
    const chartUrl = 'http://example.test/monthly-order-count.png?signature=complete'
    round.messages![1].messageDetail!.data!.content = JSON.stringify({
      version: 1,
      type: 'react-agent',
      final_content: '订单趋势分析报告已生成。',
      task_plan: [
        { content: '生成趋势图', status: 'completed' },
        { content: '生成最终 HTML 报告', status: 'completed' },
      ],
      steps: [
        {
          id: 'todo-init',
          title: 'TODO::init:0/2',
          action: 'todowrite',
          todo_meta: { state: 'init', done: 0, total: 2 },
          status: 'done',
        },
        {
          id: 'chart-step',
          title: 'generate_chart_image',
          outputs: [{
            output_type: 'text',
            content: `${JSON.stringify({
              chunks: [
                { output_type: 'image', content: chartUrl, title: '月度订单数量趋势' },
                { output_type: 'text', content: '图表已生成：柱状图。' },
                { output_type: 'text', content: '生成报告时使用的内部地址', emit_to_client: false },
              ],
              chart: { image_url: chartUrl, storage_type: 'minio' },
            })}\n\n⚠️ Reminder: update the todo list`,
          }],
          status: 'done',
        },
        {
          id: 'todo-progress',
          title: 'TODO::progress:1/2',
          action: 'todowrite',
          todo_meta: { state: 'progress', done: 1, total: 2 },
          status: 'done',
        },
        {
          id: 'report-step',
          title: 'generate_report_html',
          outputs: [{ output_type: 'html', content: '<html><body>最终报告</body></html>' }],
          status: 'done',
        },
      ],
    })

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')
    const chartChunks = item.stepsById['chart-step']?.chunks

    expect(chartChunks).toMatchObject([
      { outputType: 'image', content: chartUrl, title: '月度订单数量趋势' },
      { outputType: 'text', content: '图表已生成：柱状图。' },
    ])
    expect(JSON.stringify(chartChunks)).not.toContain('emit_to_client')
    expect(JSON.stringify(chartChunks)).not.toContain('内部地址')
    expect(JSON.stringify(chartChunks)).not.toContain('Reminder')
    expect(item.reportCandidate).toMatchObject({ stepId: 'report-step', format: 'html' })
  })

  it('历史只有 Markdown 技能文档且无 HTML/PDF/Word 时不兜底生成报告', () => {
    const round = reportRound()
    round.messages![1].messageDetail!.data!.content = JSON.stringify({
      version: 1,
      type: 'react-agent',
      final_content: '大模型对话生成错误!(Connection error.)',
      task_plan: [
        { content: '加载 SQL 技能', status: 'cancelled' },
        { content: '生成查询 SQL', status: 'cancelled' },
      ],
      steps: [
        {
          id: 'skill-doc',
          title: 'load_skill',
          outputs: [{ output_type: 'markdown', content: '# SQL 生成技能\n这是过程中的技能说明。' }],
          status: 'done',
        },
      ],
      pdf_urls: [],
      word_urls: [],
    })

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')

    expect(item.status).toBe('failed')
    expect(item.reportCandidate).toBeUndefined()
    expect(item.reportAttachments).toEqual([])
    expect(item.final?.content).toBe('大模型对话生成错误!(Connection error.)')
    expect(item.error).toEqual({ code: 'report_generation_failed', message: '报告生成失败，请稍后重试。' })
  })

  it('历史中已完成报告 Todo 的 Markdown 可作为最终报告', () => {
    const round = reportRound()
    round.messages![1].messageDetail!.data!.content = JSON.stringify({
      version: 1,
      type: 'react-agent',
      task_plan: [
        { content: '加载分析技能', status: 'completed' },
        { content: '生成 Markdown 报告', status: 'completed' },
      ],
      steps: [
        { id: 'todo-init', title: 'TODO::init:0/2', action: 'todowrite', todo_meta: { state: 'init', done: 0, total: 2 }, status: 'done' },
        { id: 'skill-doc', title: 'load_skill', outputs: [{ output_type: 'markdown', content: '# 分析技能说明' }], status: 'done' },
        { id: 'todo-report', title: 'TODO::progress:1/2', action: 'todowrite', todo_meta: { state: 'progress', done: 1, total: 2 }, status: 'done' },
        { id: 'report-step', title: 'generate_report_markdown', outputs: [{ output_type: 'markdown', content: '# 最终经营分析报告' }], status: 'done' },
      ],
    })

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')

    expect(item.status).toBe('completed')
    expect(item.reportCandidate).toMatchObject({ stepId: 'report-step', format: 'markdown', content: '# 最终经营分析报告' })
  })

  it('历史 steps 的第一条 plan 恢复为思考总结，后续 plan 归到前一个已完成 Todo', () => {
    const round = reportRound()
    round.messages![1].messageDetail!.data!.content = JSON.stringify({
      version: 1,
      type: 'react-agent',
      task_plan: [
        { content: '加载 SQL 技能', status: 'completed' },
        { content: '生成查询 SQL', status: 'completed' },
        { content: '执行 SQL 获取数据', status: 'completed' },
        { content: '分析数据', status: 'completed' },
        { content: '生成最终报告', status: 'completed' },
      ],
      steps: [
        {
          id: 'step-1',
          title: 'TODO::init:1/5',
          action: 'todowrite',
          todo_meta: { state: 'init', done: 0, started: 1, total: 5 },
          outputs: [{ output_type: 'plan', content: '先理解用户目标并制定完整执行计划。' }],
          status: 'done',
        },
        {
          id: 'step-2',
          title: 'load_skill',
          outputs: [{ output_type: 'text', content: 'SQL 技能已加载' }],
          status: 'done',
        },
        {
          id: 'step-3',
          title: 'TODO::progress:2/5',
          action: 'todowrite',
          todo_meta: { state: 'progress', done: 1, started: 2, total: 5 },
          outputs: [{ output_type: 'plan', content: '技能加载完成，接下来生成查询 SQL。' }],
          status: 'done',
        },
        {
          id: 'step-4',
          title: 'execute_sql',
          outputs: [{ output_type: 'code', content: 'SELECT SUM(total_amount) FROM orders' }],
          status: 'done',
        },
        {
          id: 'step-5',
          title: 'TODO::progress:4/5',
          action: 'todowrite',
          todo_meta: { state: 'progress', done: 3, started: 4, total: 5 },
          outputs: [{ output_type: 'plan', content: '查询已经执行完成，接下来分析数据。' }],
          status: 'done',
        },
        {
          id: 'step-6',
          title: 'generate_report_html',
          outputs: [{ output_type: 'html', content: '<html><body>报告完成</body></html>' }],
          status: 'done',
        },
      ],
    })

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')

    expect(item.tasks).toHaveLength(5)
    expect(item.thinkingPlan?.content).toBe('先理解用户目标并制定完整执行计划。')
    expect(item.todoSummaries.map(({ stepId, taskIndex, taskContent, content }) => ({ stepId, taskIndex, taskContent, content }))).toEqual([
      { stepId: 'step-2', taskIndex: 0, taskContent: '加载 SQL 技能', content: '技能加载完成，接下来生成查询 SQL。' },
      { stepId: 'step-4', taskIndex: 1, taskContent: '生成查询 SQL', content: '查询已经执行完成，接下来分析数据。' },
    ])
    expect(Object.values(item.stepsById).flatMap((step) => step.chunks).some((chunk) => chunk.outputType === 'plan')).toBe(false)
  })

  it('历史后续 plan 缺少可靠的已完成 Todo 时跳过归属', () => {
    const round = reportRound()
    round.messages![1].messageDetail!.data!.content = JSON.stringify({
      version: 1,
      type: 'react-agent',
      task_plan: [{ content: '生成报告', status: 'completed' }],
      steps: [
        {
          id: 'thinking-plan',
          title: 'TODO::init:1/1',
          action: 'todowrite',
          todo_meta: { state: 'init', done: 0, started: 1, total: 1 },
          outputs: [{ output_type: 'plan', content: '先制定报告计划。' }],
          status: 'done',
        },
        {
          id: 'no-previous-step',
          title: 'TODO::done:1/1',
          action: 'todowrite',
          todo_meta: { state: 'done', done: 1, started: 1, total: 1 },
          outputs: [{ output_type: 'plan', content: '没有前置执行步骤，不能猜测归属。' }],
          status: 'done',
        },
        {
          id: 'report-step',
          outputs: [{ output_type: 'html', content: '<html><body>完成</body></html>' }],
          status: 'done',
        },
      ],
    })

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')

    expect(item.thinkingPlan?.content).toBe('先制定报告计划。')
    expect(item.todoSummaries).toEqual([])
  })

  it('query 完成历史覆盖同序号缓存任务，并保留 taskId 作为稳定 key', () => {
    const history = createReportItemFromHistory(reportRound(), 'conv-1', 'session-1')
    const result = mergeReportTimelineItems([history], [taskItem(3), taskItem(2, 'persisted-task-2'), taskItem(1)])

    expect(result.map((item) => item.sortOrder)).toEqual([1, 2, 3])
    expect(result[1].source).toBe('history')
    expect(result[1].id).toBe('persisted-task-2')
  })

  it('坏 JSON 只标记当前报告历史失败', () => {
    const round = reportRound()
    round.messages![1].messageDetail!.data!.content = '{invalid'

    const item = createReportItemFromHistory(round, 'conv-1', 'session-1')

    expect(item.status).toBe('failed')
    expect(item.error?.code).toBe('report_history_parse_failed')
  })
})
