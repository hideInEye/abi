import type { ReportCandidate, ReportItem, ReportPlanTask, ReportPublicChunk, ReportPublicStep } from './types'

export type ReportPresentationStage = 'thinking' | 'todo' | 'report'
export type ReportPreviewOpenReason = 'auto' | 'manual'

const HIDDEN_STEP_TITLES = new Set(['思考中', 'thinking'])
const HIDDEN_STEP_DETAILS = new Set(['thought/action/observation'])

/** completed 与 cancelled 都表示该任务已经结束，但完成数量仍只统计 completed。 */
export function areReportTasksSettled(tasks: Array<Pick<ReportPlanTask, 'status'>>) {
  return tasks.every((task) => task.status === 'completed' || task.status === 'cancelled')
}

/**
 * 报告消息只允许按“思考 → ToDo → 报告”依次显露。
 * reportCandidate 可以提前到达，但在整体完成且任务全部结束前只保存在内存中。
 */
export function getReportPresentationStage(report: Pick<ReportItem, 'currentPlan' | 'tasks' | 'status' | 'reportCandidate'>): ReportPresentationStage {
  if (!report.currentPlan) return 'thinking'

  if (report.status === 'completed' && report.reportCandidate && areReportTasksSettled(report.tasks)) {
    return 'report'
  }

  return 'todo'
}

export function canRevealReport(report: Pick<ReportItem, 'currentPlan' | 'tasks' | 'status' | 'reportCandidate'>) {
  return getReportPresentationStage(report) === 'report'
}

/** 历史报告和用户手动重开都直接显示完整内容，避免每次查看都重复播放。 */
export function shouldAnimateReportPreview(report: Pick<ReportItem, 'currentPlan' | 'tasks' | 'status' | 'reportCandidate' | 'source'>, reason: ReportPreviewOpenReason) {
  return reason === 'auto' && report.source === 'task' && report.reportCandidate?.format === 'html' && canRevealReport(report)
}

export function isReportContentChunk(chunk: Pick<ReportPublicChunk, 'outputType'>) {
  const outputType = String(chunk.outputType).toLowerCase()
  return outputType === 'html' || outputType === 'markdown' || outputType === 'report_payload'
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

export function getTaskKey(planEntryId: string | undefined, taskIndex: number) {
  return `${planEntryId || 'plan-pending'}:${taskIndex}`
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
export function isVisibleReportStep(step: ReportPublicStep) {
  if (step.actionIntention || step.actionReason) return true
  if (step.action && step.action.toLowerCase() !== 'todowrite') return true
  if (step.chunks.some((chunk) => !isReportContentChunk(chunk) && chunk.content.trim())) return true

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

export function getStepSummary(step: ReportPublicStep) {
  const latestPublicChunk = [...step.chunks].reverse().find((chunk) => !isReportContentChunk(chunk))
  const rawSummary = step.actionIntention || step.actionReason || step.detail || step.action || latestPublicChunk?.content || '正在执行'
  const summary = rawSummary.trim()

  return summary.length > 160 ? `${summary.slice(0, 160)}…` : summary
}

/** 思考区仅展示公开字段，避免组件误用原始 thought/action_input。 */
export function getPublicStepLines(step: ReportPublicStep) {
  const lines: string[] = []

  if (step.actionIntention) lines.push(step.actionIntention)
  else if (step.detail) lines.push(step.detail)
  else if (step.action) lines.push(`调用 ${step.action}`)

  if (step.actionReason && step.actionReason !== step.actionIntention) lines.push(step.actionReason)

  for (const chunk of step.chunks) {
    // 报告正文可能先于整体完成到达，只更新内部候选，不在思考或 ToDo 中提前泄露。
    if (isReportContentChunk(chunk)) continue

    const content = chunk.content.trim()
    if (content) lines.push(content.length > 500 ? `${content.slice(0, 500)}…` : content)
  }

  return lines.length > 0 ? lines : ['正在执行']
}
