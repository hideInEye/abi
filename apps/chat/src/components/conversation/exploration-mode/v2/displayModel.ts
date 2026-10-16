import type { ExploreItem, ExploreProcessNode, ExploreStep, ExploreTask, ExploreThoughtNode } from '../types'

export type ProcessContent = ExploreThoughtNode | { key: string; kind: 'step'; step: ExploreStep }
export type ProcessBlock = ProcessContent
  | { key: string; kind: 'summary'; text: string }
  | { children: ProcessContent[]; key: string; kind: 'task'; status: string; task: ExploreTask }

export function splitStepSummary(text: string) {
  const match = /(?:^|\r?\n)[ \t]*(?:Summarizes Step ID:[ \t]*([^\r\n]*)\r?\n[ \t]*)?Previous Result Summary:[ \t]*([\s\S]*)$/.exec(text)
  if (!match) return { text, summary: '', stepId: '' }
  return { text: text.slice(0, match.index).trimEnd(), summary: match[2].trim(), stepId: (match[1] || '').trim() }
}

function getSourceNodes(item: ExploreItem): ExploreProcessNode[] {
  const nodes = [...(item.processTimeline || [])]
  if (nodes.length === 0 && (item.planThought?.thought || item.planThought?.reasoning || item.thoughtStream || item.reasoningStream)) {
    nodes.push({
      kind: 'thought', key: 'legacy-thought', text: item.thoughtStream || item.planThought?.thought || '',
      reasoning: item.reasoningStream || item.planThought?.reasoning || '', status: item.status === 'running' ? 'running' : 'done',
    })
  }
  const known = new Set(nodes.flatMap((node) => node.kind === 'step' ? [node.stepId] : []))
  item.steps.forEach((step) => {
    if (!known.has(step.id)) nodes.push({ kind: 'step', key: `step:${step.id}`, stepId: step.id })
  })
  return nodes
}

function containsStep(block: ProcessBlock, stepId: string): boolean {
  if (block.kind === 'step') return block.step.id === stepId
  return block.kind === 'task' && block.children.some((child) => child.kind === 'step' && child.step.id === stepId)
}

export function buildProcessBlocks(item: ExploreItem): ProcessBlock[] {
  const blocks: ProcessBlock[] = []
  const steps = new Map(item.steps.map((step) => [step.id, step]))
  const tasks = new Map(item.tasks.filter((task) => task.todo_id).map((task) => [task.todo_id, task]))
  const nodes = getSourceNodes(item)
  const linkedThoughts = new Set(nodes.flatMap((node) => node.kind === 'thought' && node.stepId ? [node.stepId] : []))
  const summaries: Array<{ key: string; stepId: string; text: string }> = []

  const append = (node: ProcessContent, step?: ExploreStep) => {
    const task = step?.todoId ? tasks.get(step.todoId) : undefined
    if (!task) {
      blocks.push(node)
      return
    }
    const previous = blocks[blocks.length - 1]
    if (previous?.kind === 'task' && previous.task.todo_id === task.todo_id) {
      previous.children.push(node)
    } else {
      blocks.push({ kind: 'task', key: `task:${task.todo_id}:${step!.id}`, task, status: task.status, children: [node] })
    }
  }

  const appendThought = (thought: ExploreThoughtNode, step?: ExploreStep) => {
    const parts = splitStepSummary(thought.text)
    if (parts.summary) {
      const summary = { kind: 'summary' as const, key: `summary:${thought.key}`, text: parts.summary }
      blocks.push(summary)
      if (parts.stepId) summaries.push({ ...summary, stepId: parts.stepId })
    }
    if (parts.text || thought.reasoning) append({ ...thought, text: parts.text }, step)
  }

  for (const node of nodes) {
    if (node.kind === 'thought') {
      appendThought(node, node.stepId ? steps.get(node.stepId) : undefined)
      continue
    }
    const step = steps.get(node.stepId)
    if (!step) continue
    if (!linkedThoughts.has(step.id) && step.thought) {
      appendThought({ kind: 'thought', key: `step-thought:${step.id}`, text: step.thought, reasoning: '', status: 'done', stepId: step.id }, step)
    }
    append({ kind: 'step', key: node.key, step }, step)
  }

  // 只有明确的步骤 ID 才把后续收到的摘要放回该步骤之后。
  for (const summary of summaries) {
    if (!blocks.some((block) => containsStep(block, summary.stepId))) continue
    const source = blocks.findIndex((block) => block.key === summary.key)
    const [block] = blocks.splice(source, 1)
    let insert = blocks.findIndex((candidate) => containsStep(candidate, summary.stepId)) + 1
    while (blocks[insert]?.kind === 'summary') insert++
    blocks.splice(insert, 0, block)
  }

  const represented = new Set(blocks.flatMap((block) => block.kind === 'task' && block.task.todo_id ? [block.task.todo_id] : []))
  item.tasks.forEach((task, index) => {
    if (!task.todo_id || !represented.has(task.todo_id)) blocks.push({ kind: 'task', key: `pending:${task.todo_id || index}`, task, status: task.status, children: [] })
  })
  blocks.forEach((block, index) => {
    if (block.kind !== 'task') return
    const groupSteps = block.children.flatMap((child) => child.kind === 'step' ? [child.step] : [])
    const laterGroup = blocks.slice(index + 1).some((candidate) => candidate.kind === 'task' && candidate.task.todo_id === block.task.todo_id)
    if (groupSteps.some((step) => step.status === 'failed')) block.status = 'failed'
    else if (groupSteps.some((step) => step.status === 'running') && item.status === 'running') block.status = 'in_progress'
    else if (laterGroup && groupSteps.length) block.status = groupSteps.every((step) => step.status === 'done') ? 'completed' : groupSteps[groupSteps.length - 1].status
    else if (item.status !== 'running' && block.status === 'in_progress') block.status = item.status
  })
  return blocks
}

const TOOL_LABELS: Record<string, string> = { execute_skill_script_file: '执行脚本', sql_query: '查询数据', generate_summary: '生成总结' }

export function getToolLabel(step: ExploreStep): string {
  return TOOL_LABELS[step.action || ''] || TOOL_LABELS[step.title || ''] || step.title || step.action || `步骤 ${step.step ?? step.id}`
}

export function getFinalSummary(item: ExploreItem): string {
  return item.summary?.trim() || item.finalContent?.trim() || ''
}

export function resolveDisclosure(manual: boolean | undefined, automatic: boolean): boolean {
  return manual ?? automatic
}

export function normalizeActionInput(input?: string | null): string {
  const raw = (input || '').trim()
  if (!raw || raw === 'null') return ''
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) return ''
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}
