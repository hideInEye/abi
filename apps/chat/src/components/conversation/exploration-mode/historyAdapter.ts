import type { ExploreItem, ExploreStep, ExploreTask } from './types'

// 报告模式的 payload 同样是 react-agent，仅靠 chat_mode='chat_report' 区分。
// 探索历史提取必须排除报告轮次，否则报告会被重复渲染成探索卡片。
const REPORT_CHAT_MODE = 'chat_report'

function readContent(message: any): unknown {
  const content = message?.messageDetail?.data?.content ?? message?.context
  if (typeof content !== 'string') return content
  try {
    return JSON.parse(content)
  } catch {
    return content
  }
}

function getChatMode(message: any): string {
  return String(message?.chatMode ?? message?.messageDetail?.chat_mode ?? '').trim()
}

function isReportMessage(message: any): boolean {
  return getChatMode(message) === REPORT_CHAT_MODE
}

export function isExploreHistoryMessage(message: any): boolean {
  if (isReportMessage(message)) return false
  const content = readContent(message)
  return Boolean(content && typeof content === 'object' && (content as any).type === 'react-agent')
}

// 探索轮次需整轮排除（human 问题 + view 结果），否则问题会在普通气泡与探索卡片中各渲染一次。
export function isExploreHistoryRound(round: any): boolean {
  const messages = Array.isArray(round?.messages) ? round.messages : []
  if (messages.some(isReportMessage)) return false
  return messages.some(isExploreHistoryMessage)
}

function getQuestion(messages: any[]): string {
  const human = messages.find((message) => (message?.roleType || message?.messageDetail?.type) === 'human')
  const content = readContent(human)
  if (content && typeof content === 'object' && typeof (content as any).question === 'string') return (content as any).question
  return typeof content === 'string' ? content : ''
}

/** todo_id 为随机哈希、无数值顺序；历史恢复按 todo_id 在 steps 中首次出现的执行顺序定序，
 *  未在 steps 中出现的任务保持 task_plan 原有相对顺序并置后。 */
function orderTasksByStepAppearance(tasks: ExploreTask[], steps: ExploreStep[]): ExploreTask[] {
  const firstIndex = new Map<string, number>()
  steps.forEach((step, index) => {
    if (step.todoId && !firstIndex.has(step.todoId)) firstIndex.set(step.todoId, index)
  })
  if (firstIndex.size === 0) return tasks
  return [...tasks].sort((a, b) => {
    const indexA = a.todo_id ? firstIndex.get(a.todo_id) : undefined
    const indexB = b.todo_id ? firstIndex.get(b.todo_id) : undefined
    if (indexA == null && indexB == null) return 0
    if (indexA == null) return 1
    if (indexB == null) return -1
    return indexA - indexB
  })
}

function mapStep(raw: any, index: number): ExploreStep {
  return {
    id: String(raw?.id || `history-step-${index + 1}`),
    step: typeof raw?.step === 'number' ? raw.step : index + 1,
    todoId: raw?.todo_id,
    title: raw?.title,
    detail: raw?.detail,
    thought: typeof raw?.thought === 'string' ? raw.thought : undefined,
    actionIntention: raw?.action_intention,
    actionReason: typeof raw?.action_reason === 'string' ? raw.action_reason : undefined,
    action: raw?.action,
    actionInput: typeof raw?.action_input === 'string' ? raw.action_input : undefined,
    status: raw?.status === 'failed' ? 'failed' : raw?.status === 'cancelled' ? 'cancelled' : 'done',
    outputs: Array.isArray(raw?.outputs)
      ? raw.outputs.map((output: any) => ({
          outputType: output?.output_type || 'text',
          content: output?.content ?? '',
        }))
      : [],
  }
}

export function extractExploreHistoryItems(roundGroups: any[]): ExploreItem[] {
  return roundGroups.flatMap((group: any, index: number) => {
    const messages = Array.isArray(group?.messages) ? group.messages : []
    // 该轮任一消息标记为 chat_report 即视为报告轮次，整轮跳过探索提取。
    if (messages.some(isReportMessage)) return []
    const payloadMessage = messages.find(isExploreHistoryMessage)
    if (!payloadMessage) return []

    const payload = readContent(payloadMessage) as any
    const roundIndex = Number(group?.roundIndex ?? payloadMessage?.roundIndex ?? payloadMessage?.index ?? index + 1)
    const success = payload?.success !== false && payload?.finish_reason !== 'agent_error' && payload?.finish_reason !== 'tool_error'
    const steps = Array.isArray(payload?.steps) ? payload.steps.map(mapStep) : []

    return [{
      id: `history-explore-${roundIndex}-${index}`,
      question: getQuestion(messages),
      sortOrder: Number.isFinite(roundIndex) ? roundIndex : Date.now() + index,
      status: success ? 'completed' : 'failed',
      tasks: orderTasksByStepAppearance(Array.isArray(payload?.task_plan) ? payload.task_plan : [], steps),
      steps,
      finalContent: typeof payload?.final_content === 'string' ? payload.final_content : '',
      summary: typeof payload?.overall_summary === 'string' ? payload.overall_summary : undefined,
      finishReason: payload?.finish_reason,
      error: success ? undefined : { message: typeof payload?.final_content === 'string' ? payload.final_content : '探索任务执行失败' },
      createdAt: Date.now() - 1,
    } satisfies ExploreItem]
  })
}
