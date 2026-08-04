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
              final_content: '不应展示的内部思维文本',
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
                  outputs: [{ output_type: 'html', content: '<html><head><title>销售报告</title></head><body>完成</body></html>' }],
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
    expect(item.tasks.map((task) => task.status)).toEqual(['completed', 'completed'])
    expect(item.thinkingStepIds).toEqual(['step-thinking'])
    expect(item.executionGroups.map((group) => group.stepIds)).toEqual([['step-analysis'], ['step-report']])
    expect(item.reportCandidate).toMatchObject({ format: 'html', stepId: 'step-report' })
    expect(item.generatedImages).toEqual(['/images/chart.png'])
    expect(item.stepsById['step-analysis']?.actionReason).toBe('用于解释本次公开执行动作')
    expect(JSON.stringify(item)).not.toContain('内部推理')
    expect(JSON.stringify(item)).not.toContain('/private/path')
    expect(JSON.stringify(item)).not.toContain('不应展示的内部思维文本')
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
