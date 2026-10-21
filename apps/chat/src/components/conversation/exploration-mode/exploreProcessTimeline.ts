import type { ExploreItem, ExploreProcessNode, ExploreStatus, ExploreStreamEvent, ExploreThoughtNode } from './types'

function closeThoughts(nodes: ExploreProcessNode[]): ExploreProcessNode[] {
  return nodes.map((node) => node.kind === 'thought' && node.status === 'running' ? { ...node, status: 'done' } : node)
}

function activeThought(nodes: ExploreProcessNode[]): ExploreThoughtNode | undefined {
  return [...nodes].reverse().find((node): node is ExploreThoughtNode => node.kind === 'thought' && node.status === 'running')
}

function updateThought(nodes: ExploreProcessNode[], thought: ExploreThoughtNode): ExploreProcessNode[] {
  return nodes.map((node) => node.key === thought.key ? thought : node)
}

function createThought(nodes: ExploreProcessNode[], round?: number): ExploreThoughtNode {
  return { kind: 'thought', key: `thought-${nodes.length}`, round, text: '', reasoning: '', status: 'running' }
}

export function reduceExploreProcess(item: ExploreItem, event: ExploreStreamEvent): ExploreProcessNode[] {
  let nodes = item.processTimeline || []
  if (event.type === 'plan.thought.chunk') {
    if (!event.delta && !event.thinking_delta) return nodes
    let thought = event.round == null
      ? activeThought(nodes)
      : nodes.find((node): node is ExploreThoughtNode => node.kind === 'thought' && node.round === event.round)
    // 完整快照已经固化的轮次不再接收迟到增量。
    if (thought?.status === 'done') return nodes
    if (!thought) {
      nodes = closeThoughts(nodes)
      thought = createThought(nodes, event.round)
      nodes = [...nodes, thought]
    }
    return updateThought(nodes, { ...thought, text: thought.text + (event.delta || ''), reasoning: thought.reasoning + (event.thinking_delta || '') })
  }
  if (event.type === 'plan.thought') {
    let thought = activeThought(nodes)
    if (!thought) {
      const last = nodes[nodes.length - 1]
      if (last?.kind === 'thought' && last.text === (event.thought || '') && (!event.reasoning || last.reasoning === event.reasoning)) return nodes
      if (!event.thought && !event.reasoning) return nodes
      thought = createThought(nodes)
      nodes = [...nodes, thought]
    }
    return updateThought(nodes, { ...thought, text: event.thought || thought.text, reasoning: event.reasoning || thought.reasoning, status: 'done' })
  }
  if (event.type === 'step.start' || event.type === 'step.meta' || event.type === 'step.chunk' || event.type === 'step.done') {
    const known = nodes.some((node) => node.kind === 'step' && node.stepId === event.id)
    const linked = nodes.find((node): node is ExploreThoughtNode => node.kind === 'thought' && node.stepId === event.id)
    const current = !known && (event.type === 'step.start' || event.type === 'step.meta') ? activeThought(nodes) : undefined
    const thought = linked || (current?.stepId ? undefined : current)
    if (thought) {
      nodes = updateThought(nodes, {
        ...thought,
        stepId: event.id,
        todoId: event.todo_id || thought.todoId,
        text: event.type === 'step.meta' ? event.thought || thought.text : thought.text,
        status: event.type === 'step.meta' || event.type === 'step.done' ? 'done' : thought.status,
      })
    }
    return known ? nodes : [...nodes, { kind: 'step', key: `step:${event.id}`, stepId: event.id }]
  }
  if (event.type === 'plan.update' || event.type === 'final' || event.type === 'done' || event.type === 'failed') return closeThoughts(nodes)
  return nodes
}

/** 中止或断流时结束仍在运行的节点，保留已完成结果。 */
export function settleExploreItem(item: ExploreItem, status: Exclude<ExploreStatus, 'running'>, finishReason?: string, error?: ExploreItem['error']): ExploreItem {
  const stepStatus = status === 'completed' ? 'done' : status
  return {
    ...item,
    status,
    finishReason: finishReason || item.finishReason,
    error: error || item.error,
    processTimeline: closeThoughts(item.processTimeline || []),
    steps: item.steps.map((step) => step.status === 'running' ? { ...step, status: stepStatus } : step),
    tasks: item.tasks.map((task) => task.status === 'in_progress' ? { ...task, status } : task),
  }
}

export function interruptExploreItem(item: ExploreItem): ExploreItem {
  if (item.status !== 'running') return item
  return settleExploreItem(item, 'failed', 'stream_interrupted', { message: '连接已中断，探索尚未完成。' })
}
