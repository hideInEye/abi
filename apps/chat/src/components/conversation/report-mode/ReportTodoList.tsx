import { CheckOutlined, ClockCircleOutlined, CloseOutlined, DownOutlined, LoadingOutlined, MinusOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { getRenderableStepChunks } from './embeddedChunkPayload'
import { getCollapsedTodoExecutionSummary, getCurrentTaskTitle, getReportStatusTone, getReportTaskProgressText, getStepSummary, getTaskKey, isReportContentChunk, isReportGenerationTask, isVisibleReportStep, toReportChunkMarkdown } from './helpers'
import type { ReportItem, ReportPublicChunk, ReportPublicStep, ReportTaskExecutionGroup } from './types'
import styles from './styles.module.css'

interface ReportTodoListProps {
  report: ReportItem
  onToggleTodo: () => void
  onToggleTask: (taskKey: string) => void
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending':
      return '等待执行'
    case 'in_progress':
      return '执行中'
    case 'completed':
    case 'done':
      return '已完成'
    case 'cancelled':
      return '已取消'
    case 'failed':
      return '失败'
    case 'skipped':
      return '已跳过'
    default:
      return status
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'in_progress':
      return <LoadingOutlined />
    case 'completed':
    case 'done':
      return <CheckOutlined />
    case 'failed':
      return <CloseOutlined />
    case 'cancelled':
    case 'skipped':
      return <MinusOutlined />
    default:
      return <ClockCircleOutlined />
  }
}

function getStatusClass(status: string) {
  switch (getReportStatusTone(status)) {
    case 'running':
      return styles.todoStatusRunning
    case 'done':
      return styles.todoStatusDone
    case 'failed':
      return styles.todoStatusFailed
    case 'skipped':
      return styles.todoStatusSkipped
    default:
      return styles.todoStatusPending
  }
}

function getExecutionDetail(status: string, stepCount: number) {
  if (stepCount > 0) return `${stepCount} 个执行步骤`
  if (['completed', 'done', 'cancelled', 'failed', 'skipped'].includes(status)) return '无执行详情'
  return '等待执行记录'
}

const ChunkContent: React.FC<{ chunk: ReportPublicChunk }> = ({ chunk }) => {
  const [imageFailed, setImageFailed] = useState(false)

  switch (chunk.outputType) {
    case 'image':
      return (
        <div className={styles.stepImageWrap}>
          {!imageFailed && <img src={chunk.content} alt={chunk.title || '步骤输出'} className={styles.stepImage} onError={() => setImageFailed(true)} />}
          {imageFailed && <Alert type="warning" showIcon message="图片加载失败" description={chunk.content} />}
          <a href={chunk.content} target="_blank" rel="noreferrer">
            查看原图
          </a>
        </div>
      )
    default:
      return (
        <div className={styles.stepMarkdown}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {toReportChunkMarkdown(chunk)}
          </ReactMarkdown>
        </div>
      )
  }
}

const ExecutionStep: React.FC<{ step: ReportPublicStep; hideReportContent: boolean }> = ({ step, hideReportContent }) => {
  // 格式本身不能证明内容是最终报告；仅在报告产物步骤中隐藏 HTML/Markdown 等文件内容。
  const visibleChunks = getRenderableStepChunks(step.chunks).filter((chunk) => !hideReportContent || !isReportContentChunk(chunk))

  return (
    <div className={styles.executionStep}>
      <div className={styles.executionStepHeader}>
        <span className={`${styles.todoStatus} ${getStatusClass(step.status)}`} data-status={step.status}>{getStatusIcon(step.status)}</span>
        <div>
          <div className={styles.executionStepTitle}>{step.title || step.action || `步骤 ${step.ordinal || ''}`}</div>
          <div className={styles.executionStepSummary}>{getStepSummary(step, hideReportContent)}</div>
        </div>
      </div>
      {visibleChunks.length > 0 && (
        <div className={styles.stepChunks}>
          {visibleChunks.map((chunk) => (
            <ChunkContent key={chunk.entryId} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  )
}

function isKnownReportArtifactStep(report: ReportItem, stepId: string) {
  return report.reportCandidate?.stepId === stepId || report.reportAttachments.some((attachment) => attachment.stepId === stepId)
}

function getGroupSteps(report: ReportItem, groups: ReportTaskExecutionGroup[], hideReportContent: boolean) {
  const stepIds = groups.flatMap((group) => group.stepIds)
  return [...new Set(stepIds)]
    .map((stepId) => report.stepsById[stepId])
    .filter((step): step is ReportPublicStep => Boolean(step))
    .filter((step) => isVisibleReportStep(step, hideReportContent || isKnownReportArtifactStep(report, step.id)))
}

function getTaskGroups(report: ReportItem, taskContent: string, taskIndex: number) {
  return report.executionGroups.filter((group) => group.taskContent === taskContent || (group.planEntryId === report.currentPlan?.entryId && group.taskIndex === taskIndex))
}

function getTaskSummary(report: ReportItem, taskContent: string, taskIndex: number) {
  return [...report.todoSummaries].reverse().find((summary) => summary.taskIndex === taskIndex && summary.taskContent === taskContent)
}

const TodoPlanSummary: React.FC<{ content: string }> = ({ content }) => (
  <div className={styles.todoPlanSummary}>
    <div className={styles.todoPlanSummaryLabel}>阶段总结</div>
    <div className={styles.todoPlanSummaryContent}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  </div>
)

const ReportTodoList: React.FC<ReportTodoListProps> = ({ report, onToggleTodo, onToggleTask }) => {
  // 无计划时由父组件只展示思考区；这里再做防御，避免空 ToDo 闪现。
  if (!report.currentPlan) return null

  const currentTask = getCurrentTaskTitle(report.tasks)
  const collapsedExecutionSummary = getCollapsedTodoExecutionSummary(report)
  const matchedGroupKeys = new Set<string>()
  const unassignedSteps = report.unassignedStepIds
    .map((stepId) => report.stepsById[stepId])
    .filter((step): step is ReportPublicStep => Boolean(step))
    .filter((step) => isVisibleReportStep(step, isKnownReportArtifactStep(report, step.id)))

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.panelHeader} onClick={onToggleTodo}>
        <span className={styles.panelTitle}>
          <CheckOutlined />
          待办事项
        </span>
        <span className={styles.panelSummary}>{currentTask}</span>
        <span className={styles.todoHeaderStats}>
          {getReportTaskProgressText(report.tasks)}
          <DownOutlined style={{ transform: report.todoOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </span>
      </button>

      {!report.todoOpen && collapsedExecutionSummary && (
        <div className={styles.todoCollapsedActivity} aria-live="polite">
          <span className={styles.todoCollapsedActivityDot} aria-hidden="true" />
          <span>{collapsedExecutionSummary}</span>
        </div>
      )}

      {report.todoOpen && (
        <div className={styles.panelBody}>
          <div className={styles.todoList}>
            {report.tasks.map((task, index) => {
              const taskKey = getTaskKey(report.currentPlan?.entryId, index)
              const groups = getTaskGroups(report, task.content, index)
              groups.forEach((group) => matchedGroupKeys.add(group.key))
              const hideReportContent = isReportGenerationTask(task)
              const steps = getGroupSteps(report, groups, hideReportContent)
              const summary = getTaskSummary(report, task.content, index)
              const expanded = report.expandedTaskKeys.includes(taskKey)

              return (
                <div key={taskKey} className={styles.todoRow}>
                  <button type="button" className={`${styles.todoMain} ${styles.todoMainClickable}`} onClick={() => onToggleTask(taskKey)}>
                    <span className={`${styles.todoStatus} ${getStatusClass(task.status)}`} data-status={task.status}>{getStatusIcon(task.status)}</span>
                    <div className={styles.todoContent}>
                      <div className={`${styles.todoTitle} ${task.status === 'in_progress' ? styles.todoTitleRunning : ''}`}>{task.content}</div>
                      <div className={styles.todoDetail}>
                        <span className={`${styles.todoStateTag} ${getStatusClass(task.status)}`} data-status={task.status}>{getStatusText(task.status)}</span>
                        {getExecutionDetail(task.status, steps.length)}
                      </div>
                    </div>
                    <DownOutlined className={styles.taskExpandIcon} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  {expanded && (
                    <div className={styles.executionList}>
                      {steps.map((step) => <ExecutionStep key={step.id} step={step} hideReportContent={hideReportContent || isKnownReportArtifactStep(report, step.id)} />)}
                      {summary && <TodoPlanSummary content={summary.content} />}
                      {steps.length === 0 && !summary && (
                        <div className={styles.executionEmpty}>{task.status === 'pending' || task.status === 'in_progress' ? '尚未收到该任务的执行步骤' : '该任务没有可展示的执行详情'}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {report.executionGroups
              .filter((group) => !matchedGroupKeys.has(group.key))
              .map((group) => {
                const hideReportContent = isReportGenerationTask({ content: group.taskContent })
                return (
                  <div key={group.key} className={styles.todoRow}>
                    <div className={styles.historyGroupTitle}>重规划前的执行记录：{group.taskContent}</div>
                    <div className={styles.executionList}>
                      {getGroupSteps(report, [group], hideReportContent).map((step) => (
                        <ExecutionStep key={step.id} step={step} hideReportContent={hideReportContent || isKnownReportArtifactStep(report, step.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}

            {unassignedSteps.length > 0 && (
              <div className={styles.todoRow}>
                <div className={styles.historyGroupTitle}>未归属执行记录</div>
                <div className={styles.executionList}>
                  {unassignedSteps.map((step) => (
                    <ExecutionStep key={step.id} step={step} hideReportContent={isKnownReportArtifactStep(report, step.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default ReportTodoList
