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

describe('reduceExploreEvent plan.thought.chunk', () => {
  it('accumulates thinking_delta into reasoningStream within the same round', () => {
    let item = baseItem()
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 1, thinking_delta: '用户' })
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 1, thinking_delta: '需要查询' })
    expect(item.reasoningStream).toBe('用户需要查询')
    expect(item.thoughtStream).toBe('')
  })

  it('accumulates delta into thoughtStream within the same round', () => {
    let item = baseItem()
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 2, delta: 'SQL已生成，' })
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 2, delta: '现在执行该SQL查询' })
    expect(item.thoughtStream).toBe('SQL已生成，现在执行该SQL查询')
  })

  it('resets streams when the round changes', () => {
    let item = baseItem()
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 1, thinking_delta: '上一轮思考' })
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 2, thinking_delta: '新一轮' })
    expect(item.reasoningStream).toBe('新一轮')
    expect(item.thoughtRound).toBe(2)
  })

  it('ignores empty chunks', () => {
    const item = reduceExploreEvent(baseItem(), { type: 'plan.thought.chunk', round: 1, delta: '', thinking_delta: '' })
    expect(item.reasoningStream).toBeUndefined()
    expect(item.thoughtStream).toBeUndefined()
  })

  it('clears streams when plan.thought finalizes the round', () => {
    let item = baseItem()
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 1, thinking_delta: '流式思考' })
    item = reduceExploreEvent(item, { type: 'plan.thought', thought: '固化思考', reasoning: '流式思考' })
    expect(item.planThought?.thought).toBe('固化思考')
    expect(item.thoughtStream).toBe('')
    expect(item.reasoningStream).toBe('')
    expect(item.thoughtRound).toBeUndefined()
  })

  it('clears streams when step.meta finalizes the round', () => {
    let item = baseItem()
    item = reduceExploreEvent(item, { type: 'plan.thought.chunk', round: 3, delta: 'SQL已生成' })
    item = reduceExploreEvent(item, { type: 'step.meta', id: 'step-2', thought: '固化步骤思考', action_intention: '执行SQL查询获取数据' })
    expect(item.steps[0]?.thought).toBe('固化步骤思考')
    expect(item.thoughtStream).toBe('')
    expect(item.reasoningStream).toBe('')
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
