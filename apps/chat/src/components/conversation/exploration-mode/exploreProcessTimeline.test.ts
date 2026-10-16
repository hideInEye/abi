import { describe, expect, it } from 'vitest'

import { interruptExploreItem, settleExploreItem } from './exploreProcessTimeline'
import { createExploreReplay, createReplayItem } from './exploreReplay.fixture'
import { parseExploreStreamEvent, reduceExploreEvent } from './exploreStreamReducer'
import type { ExploreStreamEvent, ExploreThoughtNode } from './types'

function replay(events: ExploreStreamEvent[]) {
  return events.reduce(reduceExploreEvent, createReplayItem())
}

const chunk = (round?: number): ExploreStreamEvent => ({ type: 'plan.thought.chunk', round, delta: '说明', thinking_delta: '详细思考' })

describe('探索过程保序累计', () => {
  it('完整样例保留八轮思考、三个工具与四次计划更新', () => {
    const item = replay(createExploreReplay())
    const thoughts = item.processTimeline?.filter((node): node is ExploreThoughtNode => node.kind === 'thought') || []
    expect(thoughts.map((node) => node.round)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(thoughts.every((node) => node.reasoning.includes('结合已有结果') && node.status === 'done')).toBe(true)
    expect(thoughts.filter((node) => node.stepId).map((node) => node.stepId)).toEqual(['step-1', 'step-2', 'step-3'])
    expect(item.processTimeline?.filter((node) => node.kind === 'step')).toHaveLength(3)
    expect(item.steps).toHaveLength(3)
    expect(item.tasks.every((task) => task.status === 'completed')).toBe(true)
    expect(item.planVersion).toBe(4)
    expect(item.status).toBe('completed')
  })

  it('空 reasoning 不擦掉增量思考，快照替换而非追加', () => {
    const item = replay([chunk(1), { type: 'plan.thought', thought: '完整说明', reasoning: '' }])
    expect(item.processTimeline?.[0]).toMatchObject({ text: '完整说明', reasoning: '详细思考', status: 'done' })
  })

  it('无 round 的连续增量属于同轮，快照之后建立新轮', () => {
    const item = replay([chunk(), chunk(), { type: 'plan.thought', thought: '第一轮' }, chunk()])
    expect(item.processTimeline).toHaveLength(2)
    expect(item.processTimeline?.[0]).toMatchObject({ text: '第一轮', reasoning: '详细思考详细思考' })
    expect(item.processTimeline?.[1]).toMatchObject({ text: '说明', status: 'running' })
  })

  it('空增量与心跳不产生节点', () => {
    expect(parseExploreStreamEvent(': heartbeat')).toBeUndefined()
    const item = replay([{ type: 'plan.thought.chunk', round: 1, delta: '', thinking_delta: '' }])
    expect(item.processTimeline || []).toEqual([])
  })

  it('步骤快照固化关联思考，重复 meta 和 start 不重复建步骤', () => {
    const item = replay([
      chunk(1),
      { type: 'step.start', id: 's1', todo_id: 't1' },
      { type: 'step.meta', id: 's1', thought: '完整步骤说明' },
      { type: 'step.meta', id: 's1', thought: '完整步骤说明' },
      { type: 'step.start', id: 's1' },
    ])
    expect(item.processTimeline).toHaveLength(2)
    expect(item.processTimeline?.[0]).toMatchObject({ text: '完整步骤说明', reasoning: '详细思考', stepId: 's1', todoId: 't1', status: 'done' })
  })

  it('空步骤快照保留原说明，重复 start 不重开已结束步骤', () => {
    const item = replay([
      { type: 'step.meta', id: 's1', thought: '完整说明' },
      { type: 'step.meta', id: 's1', thought: '' },
      { type: 'step.done', id: 's1' },
      { type: 'step.start', id: 's1' },
    ])
    expect(item.steps[0]).toMatchObject({ thought: '完整说明', status: 'done' })
    expect(item.processTimeline).toHaveLength(1)
  })

  it('迟到的旧轮增量不会重新打开已固化的轮次', () => {
    const item = replay([chunk(1), { type: 'plan.thought', thought: '快照' }, chunk(2), chunk(1)])
    expect(item.processTimeline?.[0]).toMatchObject({ text: '快照', reasoning: '详细思考', status: 'done' })
    expect(item.processTimeline).toHaveLength(2)
  })

  it('没有 start 的孤儿 chunk 仍保留步骤并按首次出现排序', () => {
    const item = replay([
      { type: 'step.chunk', id: 'z', content: '输出' },
      { type: 'step.meta', id: 'a', thought: '说明' },
      { type: 'step.done', id: 'z', status: 'done' },
    ])
    expect(item.processTimeline?.map((node) => node.key)).toEqual(['step:z', 'step:a'])
    expect(item.steps[0].outputs[0].content).toBe('输出')
  })

  it('旧版本计划不覆盖当前任务或结算新思考', () => {
    const item = replay([
      { type: 'plan.update', version: 2, tasks: [{ todo_id: 't1', content: '新计划', status: 'in_progress' }] },
      chunk(2),
      { type: 'plan.update', version: 1, tasks: [] },
    ])
    expect(item.tasks[0].content).toBe('新计划')
    expect(item.processTimeline?.[0]).toMatchObject({ status: 'running' })
  })
})

describe('探索终态收尾', () => {
  it('final 和全部待办完成不提前结束，summary 可继续到达', () => {
    const item = replay(createExploreReplay().slice(0, -1))
    expect(item.status).toBe('running')
    expect(item.summary).toContain('关键依据')
    expect(reduceExploreEvent(item, { type: 'done' }).status).toBe('completed')
  })

  it('取消保留结果并结束所有运行中的节点', () => {
    const item = replay([chunk(1), { type: 'step.chunk', id: 's', content: '部分输出' }])
    const stopped = settleExploreItem(item, 'cancelled', 'user_cancelled')
    expect(stopped.status).toBe('cancelled')
    expect(stopped.steps[0]).toMatchObject({ status: 'cancelled', outputs: [{ content: '部分输出', outputType: 'text' }] })
    expect(stopped.processTimeline?.[0]).toMatchObject({ status: 'done' })
    expect(reduceExploreEvent(stopped, chunk(2))).toBe(stopped)
  })

  it('意外断流不伪装完成，已结束的消息不被再次覆盖', () => {
    const failed = interruptExploreItem(replay([chunk(1)]))
    expect(failed.status).toBe('failed')
    expect(failed.error?.message).toContain('连接已中断')
    expect(interruptExploreItem(failed)).toBe(failed)
    const completed = replay(createExploreReplay())
    expect(interruptExploreItem(completed)).toBe(completed)
  })

  it('失败状态不会被随后 done 改成成功', () => {
    const item = replay([{ type: 'failed', message: '工具执行失败' }, { type: 'done', finish_reason: 'completed' }])
    expect(item.status).toBe('failed')
    expect(item.error?.message).toBe('工具执行失败')
  })
})
