import type { ReportAttachment, ReportCandidate, ReportItem, ReportPlanTask, ReportPublicChunk, ReportPublicStep } from './types'
import { getRenderableStepChunks } from './embeddedChunkPayload'

export type ReportPresentationStage = 'thinking' | 'todo' | 'report'
export type ReportPreviewOpenReason = 'auto' | 'manual'

const HIDDEN_STEP_TITLES = new Set(['思考中', 'thinking'])
const HIDDEN_STEP_DETAILS = new Set(['thought/action/observation'])
const REPORT_GENERATING_STATUSES = new Set<ReportItem['status']>(['submitting', 'waiting_stream', 'thinking', 'running'])
const REPORT_TASK_NAME_PATTERN = /(?:报告|report)/i

/** 预计耗时只服务仍在真实生成中的任务，成功、失败和历史同步阶段均不再展示。 */
export function shouldShowReportEstimate(status: ReportItem['status']) {
  return REPORT_GENERATING_STATUSES.has(status)
}

/** completed 与 cancelled 都表示该任务已经结束，但完成数量仍只统计 completed。 */
export function areReportTasksSettled(tasks: Array<Pick<ReportPlanTask, 'status'>>) {
  return tasks.every((task) => task.status === 'completed' || task.status === 'cancelled')
}

/**
 * 后端没有单独返回报告任务标识，目前以计划中的业务名称识别负责产出报告的 Todo。
 * 该判断只用于报告产物归属，不参与步骤归属或任务状态计算。
 */
export function isReportGenerationTask(task: Pick<ReportPlanTask, 'content'>) {
  return REPORT_TASK_NAME_PATTERN.test(task.content.trim())
}

/**
 * 报告消息只允许按“思考 → ToDo → 报告”依次显露。
 * reportCandidate 可以提前到达，但在整体完成且任务全部结束前只保存在内存中。
 */
export function getReportPresentationStage(report: Pick<ReportItem, 'currentPlan' | 'thinkingCompleted' | 'tasks' | 'status' | 'reportCandidate'> & Partial<Pick<ReportItem, 'reportAttachments' | 'thinkingAnimationCompleted'>>): ReportPresentationStage {
  if (!report.currentPlan || !report.thinkingCompleted || report.thinkingAnimationCompleted === false) return 'thinking'

  if (report.status === 'completed' && (report.reportCandidate || report.reportAttachments?.length) && areReportTasksSettled(report.tasks)) {
    return 'report'
  }

  return 'todo'
}

export function canRevealReport(report: Pick<ReportItem, 'currentPlan' | 'thinkingCompleted' | 'tasks' | 'status' | 'reportCandidate'> & Partial<Pick<ReportItem, 'reportAttachments' | 'thinkingAnimationCompleted'>>) {
  return getReportPresentationStage(report) === 'report'
}

/** 打字机与后端思考步骤均结束后，原子切换为“思考收起、Todo 展开”。 */
export function completeReportThinkingTypewriter(report: ReportItem): ReportItem {
  const canEnterTodo = report.thinkingCompleted && Boolean(report.currentPlan)

  return {
    ...report,
    animateThinkingPlan: false,
    thinkingAnimationCompleted: true,
    thinkingOpen: canEnterTodo ? false : report.thinkingOpen,
    todoOpen: canEnterTodo ? true : report.todoOpen,
  }
}

/** 历史报告和用户手动重开都直接显示完整内容，避免每次查看都重复播放。 */
export function shouldAnimateReportPreview(report: Pick<ReportItem, 'currentPlan' | 'thinkingCompleted' | 'tasks' | 'status' | 'reportCandidate' | 'source'>, reason: ReportPreviewOpenReason) {
  return reason === 'auto' && report.source === 'task' && report.reportCandidate?.format === 'html' && canRevealReport(report)
}

export function isReportContentChunk(chunk: Pick<ReportPublicChunk, 'outputType'>) {
  const outputType = String(chunk.outputType).toLowerCase()
  return outputType === 'html' || outputType === 'markdown' || outputType === 'pdf' || outputType === 'word' || outputType === 'report_payload'
}

export function getCompletedTaskCount(tasks: Array<Pick<ReportPlanTask, 'status'>>) {
  return tasks.filter((task) => task.status === 'completed').length
}

/** 终态计划分别说明完成与取消数量，避免 cancelled 被误看成仍未执行。 */
export function getReportTaskProgressText(tasks: Array<Pick<ReportPlanTask, 'status'>>) {
  if (tasks.length === 0) return '准备执行'

  const completedCount = getCompletedTaskCount(tasks)
  const cancelledCount = tasks.filter((task) => task.status === 'cancelled').length
  if (areReportTasksSettled(tasks) && cancelledCount > 0) {
    return [completedCount > 0 ? `${completedCount} 已完成` : '', `${cancelledCount} 已取消`].filter(Boolean).join(' · ')
  }

  return `${completedCount} / ${tasks.length} 已完成`
}

export function getCurrentTaskTitle(tasks: Array<Pick<ReportPlanTask, 'content' | 'status'>>) {
  return tasks.find((task) => task.status === 'in_progress')?.content || tasks.find((task) => task.status === 'pending')?.content || tasks[tasks.length - 1]?.content || '准备执行'
}

export type ReportStatusTone = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

/** 将后端状态统一为报告卡片使用的有限视觉语义。 */
export function getReportStatusTone(status: string): ReportStatusTone {
  switch (status) {
    case 'in_progress':
      return 'running'
    case 'completed':
    case 'done':
      return 'done'
    case 'failed':
      return 'failed'
    case 'cancelled':
    case 'skipped':
      return 'skipped'
    default:
      return 'pending'
  }
}

function getCollapsedTodoInvocationName(step: ReportPublicStep | undefined) {
  return (step?.title || step?.actionIntention || step?.action)?.trim().replace(/[，。；;：:]+$/g, '')
}

type CollapsedTodoReport = Pick<ReportItem, 'tasks' | 'currentPlan' | 'executionGroups' | 'stepsById' | 'stepOrder'>

/**
 * Todo 总面板收起时使用的公开执行摘要。
 * 只读取当前任务与公开步骤模型；该模型没有 thought/action_input，因此不会泄露内部推理。
 */
export function getCollapsedTodoExecutionSummary(report: CollapsedTodoReport) {
  const taskIndex = report.tasks.findIndex((task) => task.status === 'in_progress')
  if (taskIndex < 0) return undefined

  const task = report.tasks[taskIndex]
  const relevantGroups = report.executionGroups.filter((group) => group.taskContent === task.content || (group.planEntryId === report.currentPlan?.entryId && group.taskIndex === taskIndex))
  const stepIds = new Set(
    relevantGroups.flatMap((group) => group.stepIds),
  )
  const visibleSteps = [...report.stepOrder]
    .reverse()
    .filter((stepId) => stepIds.has(stepId))
    .map((stepId) => report.stepsById[stepId])
    .filter((step): step is ReportPublicStep => Boolean(step && isVisibleReportStep(step)))
  // step.done 会早于下一条 plan.update 到达，这个窗口内仍需保留最近的子步骤标题。
  const currentStep = visibleSteps.find((step) => step.status === 'in_progress') || visibleSteps[0]
  const taskName = task.content.trim().replace(/[，。；;：:]+$/g, '')
  if (!taskName) return undefined

  const taskLabel = taskName.endsWith('步骤') ? taskName : `${taskName} 步骤`
  const invocationName = getCollapsedTodoInvocationName(currentStep)
  if (!invocationName) return `当前正在执行 ${taskLabel}`

  const invocationLabel = /(?:技能|skill)/i.test(invocationName) ? invocationName : `${invocationName} 技能`
  return `当前正在执行 ${taskLabel}，调用 ${invocationLabel}`
}

export function getTaskKey(planEntryId: string | undefined, taskIndex: number) {
  return `${planEntryId || 'plan-pending'}:${taskIndex}`
}

/** 展开 key 是纯 UI 状态；当前执行项由 plan.update 首次写入，之后允许用户自由收起和展开。 */
export function toggleReportTaskKey(expandedTaskKeys: string[], taskKey: string) {
  return expandedTaskKeys.includes(taskKey) ? expandedTaskKeys.filter((key) => key !== taskKey) : [...expandedTaskKeys, taskKey]
}

/** 将后端文本中的不同换行表示统一为 Markdown 可消费的真实换行。 */
export function normalizeReportChunkContent(content: string) {
  return content.replace(/\r\n?/g, '\n').replace(/\\r\\n|\\n|\\r/g, '\n')
}

/** code 同样走 Markdown 渲染，并使用足够长的 fence 避免内容中的反引号截断代码块。 */
export function toReportChunkMarkdown(chunk: Pick<ReportPublicChunk, 'outputType' | 'content'>) {
  const content = normalizeReportChunkContent(chunk.content)
  if (String(chunk.outputType).toLowerCase() !== 'code') return content
  if (/^\s*(`{3,}|~{3,})/.test(content)) return content

  const longestBacktickRun = Math.max(0, ...[...content.matchAll(/`+/g)].map((match) => match[0].length))
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1))
  return `${fence}\n${content}\n${fence}`
}

/** 过滤只有内部占位语义、没有任何公开摘要或输出的空步骤。 */
export function isVisibleReportStep(step: ReportPublicStep, hideReportContent = false) {
  if (step.actionIntention || step.actionReason) return true
  if (step.action && step.action.toLowerCase() !== 'todowrite') return true
  if (getRenderableStepChunks(step.chunks).some((chunk) => (!hideReportContent || !isReportContentChunk(chunk)) && chunk.content.trim())) return true

  const title = step.title?.trim().toLowerCase()
  if (title && !HIDDEN_STEP_TITLES.has(title) && !title.startsWith('todo::')) return true

  const detail = step.detail?.trim().toLowerCase()
  return Boolean(detail && !HIDDEN_STEP_DETAILS.has(detail) && detail !== 'todowrite')
}

/** 从最终候选中提取可读标题；失败时使用统一文件名。 */
export function getReportTitle(candidate?: Pick<ReportCandidate, 'format' | 'content'>) {
  if (!candidate) return '报告文件'

  if (candidate.format === 'html') {
    const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(candidate.content)
    const title = match?.[1]?.replace(/<[^>]+>/g, '').trim()
    return title || 'HTML 报告'
  }

  const heading = candidate.content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || 'Markdown 报告'
}

/** 生成前端本地下载所需的文件名与 MIME，不依赖额外后端下载接口。 */
export function getReportDownloadDescriptor(candidate: Pick<ReportCandidate, 'format' | 'content'>) {
  const extension = candidate.format === 'html' ? 'html' : 'md'
  const mimeType = candidate.format === 'html' ? 'text/html' : 'text/markdown'
  const rawTitle = getReportTitle(candidate).replace(/\.(?:html?|md|markdown)$/i, '')
  const safeTitle = rawTitle
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim() || '报告文件'

  return {
    fileName: `${safeTitle}.${extension}`,
    mimeType,
  }
}

export type ReportDownloadOption = {
  key: string
  format: ReportCandidate['format'] | ReportAttachment['format']
  label: string
  fileName: string
  kind: 'content' | 'url'
  content?: string
  mimeType?: string
  url?: string
}

const DOWNLOAD_FORMAT_LABELS: Record<ReportDownloadOption['format'], string> = {
  html: 'HTML',
  markdown: 'Markdown',
  pdf: 'PDF',
  word: 'WORD',
}

function getAttachmentFileName(attachment: ReportAttachment) {
  const extension = attachment.format === 'pdf' ? 'pdf' : 'docx'

  try {
    const pathname = new URL(attachment.url, 'https://report.local').pathname
    const fileName = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '')
    if (fileName) return fileName
  } catch {
    // 非标准相对地址仍可以作为下载链接，文件名回退到稳定产品文案。
  }

  return `报告文件.${extension}`
}

/** 只列出真实收到的格式；同一附件格式多次返回时使用最后一个地址。 */
export function getReportDownloadOptions(candidate: ReportCandidate | undefined, attachments: ReportAttachment[] = []): ReportDownloadOption[] {
  const options: ReportDownloadOption[] = []
  if (candidate) {
    const descriptor = getReportDownloadDescriptor(candidate)
    options.push({
      key: candidate.entryId,
      format: candidate.format,
      label: DOWNLOAD_FORMAT_LABELS[candidate.format],
      fileName: descriptor.fileName,
      kind: 'content',
      content: candidate.content,
      mimeType: descriptor.mimeType,
    })
  }

  const latestByFormat = new Map<ReportAttachment['format'], ReportAttachment>()
  attachments.forEach((attachment) => latestByFormat.set(attachment.format, attachment))
  latestByFormat.forEach((attachment) => {
    options.push({
      key: attachment.entryId,
      format: attachment.format,
      label: DOWNLOAD_FORMAT_LABELS[attachment.format],
      fileName: getAttachmentFileName(attachment),
      kind: 'url',
      url: attachment.url,
    })
  })

  return options
}

/** done.time 单位为秒；非法或缺失值不生成虚假耗时。 */
export function formatReportDuration(durationSeconds: number | undefined) {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) return undefined

  const totalSeconds = Math.round(durationSeconds)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `耗时${minutes}分${seconds}秒`
}

export function getStepSummary(step: ReportPublicStep, hideReportContent = false) {
  const latestPublicChunk = getRenderableStepChunks(step.chunks).reverse().find((chunk) => !hideReportContent || !isReportContentChunk(chunk))
  const rawSummary = step.actionIntention || step.actionReason || step.detail || step.action || latestPublicChunk?.content || '正在执行'
  const summary = rawSummary.trim()

  return summary.length > 160 ? `${summary.slice(0, 160)}…` : summary
}

/** 思考区仅展示公开字段，避免组件误用原始 thought/action_input。 */
export function getPublicStepLines(step: ReportPublicStep, hideReportContent = false) {
  const lines: string[] = []

  if (step.actionIntention) lines.push(step.actionIntention)
  else if (step.detail) lines.push(step.detail)
  else if (step.action) lines.push(`调用 ${step.action}`)

  if (step.actionReason && step.actionReason !== step.actionIntention) lines.push(step.actionReason)

  for (const chunk of getRenderableStepChunks(step.chunks)) {
    // 只有已处于报告产物上下文的格式内容才隐藏；普通 Todo 返回的 Skill Markdown 仍是公开执行结果。
    if (hideReportContent && isReportContentChunk(chunk)) continue

    const content = chunk.content.trim()
    if (content) lines.push(content.length > 500 ? `${content.slice(0, 500)}…` : content)
  }

  return lines.length > 0 ? lines : ['正在执行']
}
