import { describe, expect, it } from 'vitest'

import { markHistoryResponseOrder } from '../helpers/historyResponseOrder'

import { extractExploreHistoryItems } from './historyAdapter'

/** 构造探索历史轮次：human 问题 + view 结果（react-agent payload）。 */
function exploreRound(payload: unknown) {
  return [
    {
      roundIndex: 1,
      messages: [
        { roleType: 'human', context: JSON.stringify({ question: '统计2025年每月销售量' }) },
        { roleType: 'view', messageDetail: { chat_mode: 'chat_explore', data: { content: JSON.stringify(payload) } } },
      ],
    },
  ]
}

describe('extractExploreHistoryItems', () => {
  it('orders tasks by first step appearance when task_plan order diverges', () => {
    const [item] = extractExploreHistoryItems(
      exploreRound({
        type: 'react-agent',
        final_content: 'done',
        // task_plan 故意倒序，验证按 steps 执行顺序定序
        task_plan: [
          { todo_id: 'todo-51896150', content: '执行SQL并展示结果', status: 'completed' },
          { todo_id: 'todo-2f02b558', content: '使用 sql-generator 生成查询2025年每月销售量的SQL', status: 'completed' },
        ],
        steps: [
          { id: 'step-1', todo_id: 'todo-2f02b558', status: 'done' },
          { id: 'step-2', todo_id: 'todo-2f02b558', status: 'done' },
          { id: 'step-3', todo_id: 'todo-51896150', status: 'done' },
        ],
      }),
    )
    expect(item?.roundIndex).toBe(1)
    expect(item?.tasks.map((task) => task.todo_id)).toEqual(['todo-2f02b558', 'todo-51896150'])
  })

  it('keeps task_plan order when steps carry no todo_id', () => {
    const [item] = extractExploreHistoryItems(
      exploreRound({
        type: 'react-agent',
        final_content: 'done',
        task_plan: [
          { todo_id: 'todo-a', content: '任务一', status: 'completed' },
          { todo_id: 'todo-b', content: '任务二', status: 'completed' },
        ],
        steps: [{ id: 'step-1', status: 'done' }],
      }),
    )
    expect(item?.tasks.map((task) => task.todo_id)).toEqual(['todo-a', 'todo-b'])
  })

  it('keeps the source array position for cross-mode timeline rendering', () => {
    const rounds = markHistoryResponseOrder([
      { roundIndex: 30, messages: [] },
      ...exploreRound({ type: 'react-agent', final_content: 'done', task_plan: [], steps: [] }),
    ])

    const [item] = extractExploreHistoryItems(rounds)

    expect(item?.roundIndex).toBe(1)
    expect(item?.historySequence).toBe(1)
  })
})
