import type { ReportCandidate, ReportPlanTask, ReportPublicStep } from './types'

export function getCompletedTaskCount(tasks: Array<Pick<ReportPlanTask, 'status'>>) {
  return tasks.filter((task) => task.status === 'completed').length
}

export function getCurrentTaskTitle(tasks: Array<Pick<ReportPlanTask, 'content' | 'status'>>) {
  return tasks.find((task) => task.status === 'in_progress')?.content
    || tasks.find((task) => task.status === 'pending')?.content
    || tasks[tasks.length - 1]?.content
    || '等待任务计划'
}

export function getTaskKey(planEntryId: string | undefined, taskIndex: number) {
  return `${planEntryId || 'plan-pending'}:${taskIndex}`
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
  const rawSummary = step.actionIntention || step.detail || step.action || step.chunks[step.chunks.length - 1]?.content || '正在执行'
  const summary = rawSummary.trim()

  return summary.length > 160 ? `${summary.slice(0, 160)}…` : summary
}

/** 思考区仅展示公开字段，避免组件误用原始 thought/action_input。 */
export function getPublicStepLines(step: ReportPublicStep) {
  const lines: string[] = []

  if (step.actionIntention) lines.push(step.actionIntention)
  else if (step.detail) lines.push(step.detail)
  else if (step.action) lines.push(`调用 ${step.action}`)

  for (const chunk of step.chunks) {
    if (chunk.outputType === 'html') {
      lines.push('已生成 HTML 报告候选')
      continue
    }

    if (chunk.outputType === 'markdown') {
      lines.push('已生成 Markdown 内容')
      continue
    }

    const content = chunk.content.trim()
    if (content) lines.push(content.length > 500 ? `${content.slice(0, 500)}…` : content)
  }

  return lines.length > 0 ? lines : ['正在执行']
}
