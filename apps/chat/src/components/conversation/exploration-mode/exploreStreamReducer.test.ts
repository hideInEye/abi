import { describe, expect, it } from 'vitest'

import { parseExploreStreamEvent, reduceExploreEvent } from './exploreStreamReducer'
import type { ExploreItem } from './types'

function baseItem(): ExploreItem {
  return {
    id: 'explore-test',
    question: '测试问题',
    sortOrder: 1,
    status: 'running',
    tasks: [],
    steps: [],
    createdAt: 0,
  }
}

describe('parseExploreStreamEvent', () => {
  it('accepts plan.thought.chunk events', () => {
    const event = parseExploreStreamEvent('{"type": "plan.thought.chunk", "round": 1, "delta": "", "thinking_delta": "用户"}')
    expect(event).toEqual({ type: 'plan.thought.chunk', round: 1, delta: '', thinking_delta: '用户' })
  })
})

describe('reduceExploreEvent plan.update', () => {
  it('preserves the incoming order of the first plan.update (todo_id is a random hash, not sortable)', () => {
    const item = reduceExploreEvent(baseItem(), {
      type: 'plan.update',
      tasks: [
        { todo_id: 'todo-fec68b39', content: '生成并执行SQL查询2020-2026年订单数据', status: 'in_progress' },
        { todo_id: 'todo-8b08d375', content: '使用归因分析技能分析最近订单总金额上涨的原因', status: 'pending' },
      ],
    })
    expect(item.tasks.map((task) => task.todo_id)).toEqual(['todo-fec68b39', 'todo-8b08d375'])
  })

  it('keeps the order stable when a later update arrives shuffled', () => {
    let item = reduceExploreEvent(baseItem(), {
      type: 'plan.update',
      tasks: [
        { todo_id: 'todo-fec68b39', content: '生成并执行SQL查询2020-2026年订单数据', status: 'pending' },
        { todo_id: 'todo-8b08d375', content: '使用归因分析技能分析最近订单总金额上涨的原因', status: 'pending' },
      ],
    })
    item = reduceExploreEvent(item, {
      type: 'plan.update',
      tasks: [
        { todo_id: 'todo-8b08d375', content: '使用归因分析技能分析最近订单总金额上涨的原因', status: 'in_progress' },
        { todo_id: 'todo-fec68b39', content: '生成并执行SQL查询2020-2026年订单数据', status: 'completed' },
      ],
    })
    expect(item.tasks.map((task) => task.todo_id)).toEqual(['todo-fec68b39', 'todo-8b08d375'])
    expect(item.tasks[0]?.status).toBe('completed')
    expect(item.tasks[1]?.status).toBe('in_progress')
  })

  it('appends newly arriving todo ids', () => {
    let item = reduceExploreEvent(baseItem(), {
      type: 'plan.update',
      tasks: [{ todo_id: 'todo-fec68b39', content: '生成并执行SQL查询2020-2026年订单数据', status: 'completed' }],
    })
    item = reduceExploreEvent(item, {
      type: 'plan.update',
      tasks: [
        { todo_id: 'todo-fec68b39', content: '生成并执行SQL查询2020-2026年订单数据', status: 'completed' },
        { todo_id: 'todo-8b08d375', content: '使用归因分析技能分析最近订单总金额上涨的原因', status: 'in_progress' },
      ],
    })
    expect(item.tasks.map((task) => task.todo_id)).toEqual(['todo-fec68b39', 'todo-8b08d375'])
  })

  it('falls back to whole replacement when tasks carry no todo_id', () => {
    const item = reduceExploreEvent(baseItem(), {
      type: 'plan.update',
      tasks: [
        { content: '分析数据', status: 'pending' },
        { content: '生成报告', status: 'pending' },
      ],
    })
    expect(item.tasks.map((task) => task.content)).toEqual(['分析数据', '生成报告'])
  })
})
