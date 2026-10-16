import { describe, expect, it } from 'vitest'

import { createExploreReplay, createReplayItem } from '../exploreReplay.fixture'
import { reduceExploreEvent } from '../exploreStreamReducer'
import { extractExploreHistoryItems } from '../historyAdapter'
import type { ExploreItem, ExploreStep } from '../types'

import { buildProcessBlocks, getFinalSummary, getToolLabel, normalizeActionInput, resolveDisclosure, splitStepSummary } from './displayModel'

const step = (id: string, todoId?: string): ExploreStep => ({ id, todoId, status: 'done', outputs: [], action: 'sql_query' })

describe('新版探索展示模型', () => {
  it('完成样例拥有三个任务分组，摘要位于任务详情外', () => {
    const item = createExploreReplay().reduce(reduceExploreEvent, createReplayItem())
    const blocks = buildProcessBlocks(item)
    expect(blocks.filter((block) => block.kind === 'task')).toHaveLength(3)
    expect(blocks.filter((block) => block.kind === 'summary')).toHaveLength(2)
    expect(blocks.flatMap((block) => block.kind === 'task' ? block.children.filter((child) => child.kind === 'step') : [])).toHaveLength(3)
    const visibleThoughts = blocks.flatMap((block) => block.kind === 'task' ? block.children : [block]).filter((block) => block.kind === 'thought')
    expect(visibleThoughts.every((block) => block.kind === 'thought' && !block.text.includes('Previous Result Summary:'))).toBe(true)
    expect(item.steps[1].thought).toContain('Previous Result Summary:')
  })

  it('仅连续同一待办归组，返工步骤保持收到顺序', () => {
    const item: ExploreItem = {
      ...createReplayItem(),
      tasks: [{ todo_id: 'a', content: '任务一', status: 'in_progress' }, { todo_id: 'b', content: '任务二', status: 'completed' }],
      steps: [step('s1', 'a'), step('s2', 'a'), step('s3', 'b'), { ...step('s4', 'a'), status: 'running' }],
    }
    const blocks = buildProcessBlocks(item)
    expect(blocks.map((block) => block.kind === 'task' ? block.task.todo_id : '')).toEqual(['a', 'b', 'a'])
    expect(blocks[0]).toMatchObject({ status: 'completed' })
    expect(blocks[2]).toMatchObject({ status: 'in_progress' })
    expect(new Set(blocks.map((block) => block.key)).size).toBe(blocks.length)
  })

  it('缺少待办或关联失效的步骤不丢失', () => {
    const blocks = buildProcessBlocks({ ...createReplayItem(), steps: [step('s1'), step('s2', 'missing')] })
    expect(blocks.map((block) => block.kind)).toEqual(['step', 'step'])
  })

  it('等待执行的待办仍可见，没有执行详情不造空子步骤', () => {
    const blocks = buildProcessBlocks({ ...createReplayItem(), tasks: [{ content: '等待任务', status: 'pending' }] })
    expect(blocks[0]).toMatchObject({ kind: 'task', children: [], status: 'pending' })
  })

  it('历史只恢复已保存的步骤说明，不伪造深度思考', () => {
    const [item] = extractExploreHistoryItems([{ roundIndex: 3, messages: [
      { roleType: 'human', context: '测试问题' },
      { roleType: 'view', context: JSON.stringify({ type: 'react-agent', steps: [{ id: 's1', thought: '已保存说明' }], final_content: '历史结论' }) },
    ] }])
    const blocks = buildProcessBlocks(item)
    expect(blocks[0]).toMatchObject({ kind: 'thought', text: '已保存说明', reasoning: '' })
    expect(getFinalSummary(item)).toBe('历史结论')
    expect(item.roundIndex).toBe(3)
  })

  it('阶段摘要只识别指定行标记，空 ID 不推测来源', () => {
    expect(splitStepSummary('说明\nSummarizes Step ID: \nPrevious Result Summary: 摘要')).toEqual({ text: '说明', summary: '摘要', stepId: '' })
    expect(splitStepSummary('说明\nSummarizes Step ID: s1\nPrevious Result Summary: 摘要')).toEqual({ text: '说明', summary: '摘要', stepId: 's1' })
    expect(splitStepSummary('正文提到 Previous Result Summary: 但不是标记行').summary).toBe('')
  })

  it('未知摘要关联保持原位置，不移到结尾', () => {
    const blocks = buildProcessBlocks({ ...createReplayItem(), steps: [step('s1')], processTimeline: [
      { kind: 'thought', key: 't', status: 'done', reasoning: '', text: '说明\nSummarizes Step ID: missing\nPrevious Result Summary: 摘要' },
      { kind: 'step', key: 'step:s1', stepId: 's1' },
    ] })
    expect(blocks.map((block) => block.kind)).toEqual(['summary', 'thought', 'step'])
  })

  it('最终摘要优先 summary，缺失或空白时回退 final', () => {
    const item = { ...createReplayItem(), finalContent: '简短回答', summary: '完整总结' }
    expect(getFinalSummary(item)).toBe('完整总结')
    expect(getFinalSummary({ ...item, summary: ' ' })).toBe('简短回答')
  })

  it('手动展开和收起均优先于自动状态', () => {
    expect(resolveDisclosure(true, false)).toBe(true)
    expect(resolveDisclosure(false, true)).toBe(false)
    expect(resolveDisclosure(undefined, true)).toBe(true)
    expect(resolveDisclosure(undefined, false)).toBe(false)
  })

  it('已知工具中文映射，未知工具使用原始标题', () => {
    expect(getToolLabel(step('s1'))).toBe('查询数据')
    expect(getToolLabel({ ...step('s1'), action: 'execute_skill_script_file' })).toBe('执行脚本')
    expect(getToolLabel({ ...step('s1'), action: 'custom', title: '自定义查询' })).toBe('自定义查询')
  })

  it('参数空对象不展示，非 JSON 文本不丢失', () => {
    expect(normalizeActionInput('{}')).toBe('')
    expect(normalizeActionInput('null')).toBe('')
    expect(normalizeActionInput('命令参数')).toBe('命令参数')
    expect(normalizeActionInput('{"id":1}')).toContain('"id": 1')
  })
})
