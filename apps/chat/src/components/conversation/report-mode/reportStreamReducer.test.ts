import { describe, expect, it } from 'vitest'

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
    expect(parseReportStreamEvent('{"type":"done"}')).toEqual({ type: 'done' })
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

  it('首个 plan 覆盖任务快照并自动切换思考和 ToDo 展开态', () => {
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
    const secondPlan = reduceReportStreamEntry(
      firstPlan,
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
    expect(firstPlan).toMatchObject({ status: 'running', thinkingOpen: false, todoOpen: true })
    expect(firstPlan.expandedTaskKeys).toEqual(['10-0:0'])
    expect(secondPlan.currentPlan?.version).toBe(2)
    expect(secondPlan.tasks.map((task) => task.status)).toEqual(['completed', 'in_progress'])
    expect(secondPlan.expandedTaskKeys).toEqual(['20-0:1'])
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

  it('任意阶段的 markdown/html chunk 都立即覆盖为最新报告候选', () => {
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

  it('done 有候选时完成，无候选时给出明确失败', () => {
    const completed = reduceReportStreamEntries([entry('1-0', { type: 'step.chunk', id: 'report', output_type: 'markdown', content: '# 报告' }), entry('2-0', { type: 'done' })])
    const failed = reduceReportStreamEntries([entry('1-0', { type: 'done' })])

    expect(completed).toMatchObject({ status: 'completed', doneEntryId: '2-0', lastEntryId: '2-0' })
    expect(failed).toMatchObject({
      status: 'failed',
      doneEntryId: '1-0',
      error: { code: 'report_content_missing', message: '未收到报告文件' },
    })
  })

  it('兼容真实数据中分段 text 包装的报告，并在 done 时收敛未闭合步骤', () => {
    const html = '<!DOCTYPE html>\n<html><head><title>测试报告</title></head><body>完成</body></html>'
    const toolResult = `${JSON.stringify({ chunks: [{ output_type: 'html', content: html }], report: { version: '1.0' } })}\n\n任务提示文字`
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
    expect(state.stepsById['dangling-step'].status).toBe('done')
    expect(Object.values(state.stepsById).some((step) => step.status === 'in_progress')).toBe(false)
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
