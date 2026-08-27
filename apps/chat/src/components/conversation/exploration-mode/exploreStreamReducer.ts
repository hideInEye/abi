import type { ExploreItem, ExploreStep, ExploreStreamEvent } from './types'

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
        tasks: Array.isArray(event.tasks) ? event.tasks.map((task) => ({ ...task })) : item.tasks,
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
