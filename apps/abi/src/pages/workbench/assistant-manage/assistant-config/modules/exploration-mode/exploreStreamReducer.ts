import type { ExploreItem, ExploreStep, ExploreStreamEvent, ExploreTask } from './types'

const EXPLORE_EVENT_TYPES = new Set([
  'plan.thought',
  'plan.thought.chunk',
  'plan.update',
  'step.start',
  'step.meta',
  'step.chunk',
  'step.done',
  'final',
  'summary',
  'done',
  'failed',
])

export function parseExploreStreamEvent(data: string): ExploreStreamEvent | undefined {
  try {
    const parsed: unknown = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object') return undefined
    const type = (parsed as { type?: unknown }).type
    if (typeof type !== 'string' || !EXPLORE_EVENT_TYPES.has(type)) return undefined
    return parsed as ExploreStreamEvent
  } catch {
    return undefined
  }
}

function mapStepStatus(status?: string): ExploreStep['status'] {
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'done') return 'done'
  return 'running'
}

/** plan.update 按 todo_id 做 keyed diff：顺序以首次到达的 plan.update 为准，
 *  已知 id 保持首次出现顺序、仅更新字段，新 id 按到达顺序追加。
 *  注意：todo_id 为随机哈希（如 todo-fec68b39），无数值顺序，不能按 id 值排序，
 *  否则会把后端正确的下发顺序排反；后续乱序到达的更新只改状态、不改顺序。 */
export function mergeExploreTasks(prev: ExploreTask[], incoming: ExploreTask[]): ExploreTask[] {
  const incomingById = new Map<string, ExploreTask>()
  for (const task of incoming) {
    if (task.todo_id && !incomingById.has(task.todo_id)) incomingById.set(task.todo_id, task)
  }
  // 后端未下发 todo_id 时无法做 keyed diff，退回整组替换，避免丢失任务
  if (incomingById.size === 0) return incoming.map((task) => ({ ...task }))
  const consumed = new Set<string>()
  const merged: ExploreTask[] = prev.map((task) => {
    const next = task.todo_id ? incomingById.get(task.todo_id) : undefined
    if (!next) return task
    consumed.add(next.todo_id as string)
    return { ...next }
  })
  for (const task of incoming) {
    if (task.todo_id && !consumed.has(task.todo_id)) merged.push({ ...task })
  }
  return merged
}

function upsertStep(item: ExploreItem, stepId: string, updater: (step: ExploreStep) => ExploreStep): ExploreItem {
  const existing = item.steps.find((step) => step.id === stepId)
  const base: ExploreStep = existing || {
    id: stepId,
    status: 'running',
    outputs: [],
  }
  const nextStep = updater(base)
  if (existing) {
    return {
      ...item,
      steps: item.steps.map((step) => (step.id === stepId ? nextStep : step)),
    }
  }
  return {
    ...item,
    steps: [...item.steps, nextStep],
  }
}

export function reduceExploreEvent(item: ExploreItem, event: ExploreStreamEvent): ExploreItem {
  switch (event.type) {
    case 'plan.thought':
      return {
        ...item,
        status: 'running',
        planThought: {
          thought: event.thought,
          reasoning: event.reasoning,
          actionIntention: event.action_intention,
          actionReason: event.action_reason,
        },
        // 思考已固化，清空打字机流，展示区回退到固化思考
        thoughtRound: undefined,
        thoughtStream: '',
        reasoningStream: '',
      }
    case 'plan.thought.chunk': {
      const delta = event.delta || ''
      const thinkingDelta = event.thinking_delta || ''
      if (!delta && !thinkingDelta) return item
      // 轮次切换时重置流，避免上一轮思考残留拼接
      const reset = event.round != null && event.round !== item.thoughtRound
      return {
        ...item,
        status: 'running',
        thoughtRound: event.round ?? item.thoughtRound,
        thoughtStream: delta ? (reset ? '' : item.thoughtStream || '') + delta : reset ? '' : item.thoughtStream,
        reasoningStream: thinkingDelta ? (reset ? '' : item.reasoningStream || '') + thinkingDelta : reset ? '' : item.reasoningStream,
      }
    }
    case 'plan.update': {
      if (event.version != null && item.planVersion != null && event.version < item.planVersion) return item
      return {
        ...item,
        status: 'running',
        tasks: Array.isArray(event.tasks) ? mergeExploreTasks(item.tasks, event.tasks) : item.tasks,
        planVersion: event.version ?? item.planVersion,
        planSource: event.source ?? item.planSource,
      }
    }
    case 'step.start':
      return upsertStep(item, event.id, (step) => ({
        ...step,
        step: event.step ?? step.step,
        todoId: event.todo_id || step.todoId,
        title: event.title || step.title,
        detail: event.detail || step.detail,
        status: 'running',
      }))
    case 'step.meta':
      return {
        ...upsertStep(item, event.id, (step) => ({
          ...step,
          todoId: event.todo_id || step.todoId,
          title: event.title || step.title,
          thought: event.thought ?? step.thought,
          actionIntention: event.action_intention ?? step.actionIntention,
          actionReason: event.action_reason ?? step.actionReason,
          action: event.action ?? step.action,
          actionInput: event.action_input ?? step.actionInput,
        })),
        // 步骤思考已固化，清空打字机流，展示区回退到固化思考
        thoughtRound: undefined,
        thoughtStream: '',
        reasoningStream: '',
      }
    case 'step.chunk':
      return upsertStep(item, event.id, (step) => ({
        ...step,
        todoId: event.todo_id || step.todoId,
        outputs: [
          ...step.outputs,
          {
            outputType: event.output_type || 'text',
            content: event.content ?? '',
          },
        ],
      }))
    case 'step.done':
      return upsertStep(item, event.id, (step) => ({
        ...step,
        todoId: event.todo_id || step.todoId,
        status: mapStepStatus(event.status),
      }))
    case 'final':
      return {
        ...item,
        finalContent: event.content || item.finalContent,
        finishReason: event.finish_reason || item.finishReason,
      }
    case 'summary':
      return {
        ...item,
        summary: event.content || item.summary,
      }
    case 'done':
      return {
        ...item,
        status: event.finish_reason === 'user_cancelled' ? 'cancelled' : 'completed',
        finishReason: event.finish_reason || item.finishReason,
      }
    case 'failed':
      return {
        ...item,
        status: 'failed',
        finishReason: event.finish_reason || item.finishReason,
        error: {
          code: event.code,
          message: event.message || item.finalContent || '探索任务执行失败',
        },
      }
    default:
      return item
  }
}
