import { CheckOutlined, ClockCircleOutlined, CloseOutlined, CodeOutlined, DownOutlined, FileMarkdownOutlined, FileTextOutlined, LoadingOutlined, MinusOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { getCompletedTaskCount, getCurrentTaskTitle, getStepSummary, getTaskKey } from './helpers'
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
  switch (status) {
    case 'in_progress':
      return styles.todoStatusRunning
    case 'completed':
    case 'done':
      return styles.todoStatusDone
    case 'failed':
      return styles.todoStatusFailed
    case 'cancelled':
    case 'skipped':
      return styles.todoStatusSkipped
    default:
      return styles.todoStatusPending
  }
}

const ChunkContent: React.FC<{ chunk: ReportPublicChunk }> = ({ chunk }) => {
  const [imageFailed, setImageFailed] = useState(false)

  switch (chunk.outputType) {
    case 'html':
      return <div className={styles.chunkHint}><FileTextOutlined /> HTML 报告候选已生成，正在右侧预览</div>
    case 'markdown':
      return (
        <div className={styles.stepMarkdown}>
          <div className={styles.chunkHint}><FileMarkdownOutlined /> Markdown 内容</div>
          <ReactMarkdown>{chunk.content}</ReactMarkdown>
        </div>
      )
    case 'code':
      return <pre className={styles.stepCode}><CodeOutlined />{`\n${chunk.content}`}</pre>
    case 'image':
      return (
        <div className={styles.stepImageWrap}>
          {!imageFailed && <img src={chunk.content} alt="步骤输出" className={styles.stepImage} onError={() => setImageFailed(true)} />}
          {imageFailed && <Alert type="warning" showIcon message="图片加载失败" description={chunk.content} />}
          <a href={chunk.content} target="_blank" rel="noreferrer">查看原图</a>
        </div>
      )
    default:
      return <div className={styles.stepText}>{chunk.content}</div>
  }
}

const ExecutionStep: React.FC<{ step: ReportPublicStep }> = ({ step }) => (
  <div className={styles.executionStep}>
    <div className={styles.executionStepHeader}>
      <span className={`${styles.todoStatus} ${getStatusClass(step.status)}`}>{getStatusIcon(step.status)}</span>
      <div>
        <div className={styles.executionStepTitle}>{step.title || step.action || `步骤 ${step.ordinal || ''}`}</div>
        <div className={styles.executionStepSummary}>{getStepSummary(step)}</div>
      </div>
    </div>
    {step.chunks.length > 0 && (
      <div className={styles.stepChunks}>
        {step.chunks.map((chunk) => <ChunkContent key={chunk.entryId} chunk={chunk} />)}
      </div>
    )}
  </div>
)

function getGroupSteps(report: ReportItem, groups: ReportTaskExecutionGroup[]) {
  const stepIds = groups.flatMap((group) => group.stepIds)
  return [...new Set(stepIds)]
    .map((stepId) => report.stepsById[stepId])
    .filter((step): step is ReportPublicStep => Boolean(step))
}

function getTaskGroups(report: ReportItem, taskContent: string, taskIndex: number) {
  return report.executionGroups.filter((group) => (
    group.taskContent === taskContent
    || (group.planEntryId === report.currentPlan?.entryId && group.taskIndex === taskIndex)
  ))
}

const ReportTodoList: React.FC<ReportTodoListProps> = ({ report, onToggleTodo, onToggleTask }) => {
  const completedCount = getCompletedTaskCount(report.tasks)
  const currentTask = getCurrentTaskTitle(report.tasks)
  const hasPlan = Boolean(report.currentPlan)
  const matchedGroupKeys = new Set<string>()

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.panelHeader} onClick={onToggleTodo}>
        <span className={styles.panelTitle}>
          <CheckOutlined />
          ToDo list
        </span>
        <span className={styles.panelSummary}>{currentTask}</span>
        <span className={styles.todoHeaderStats}>
          {report.tasks.length > 0 ? `${completedCount} / ${report.tasks.length} 已完成` : '等待任务计划'}
          <DownOutlined style={{ transform: report.todoOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </span>
      </button>

      {report.todoOpen && (
        <div className={styles.panelBody}>
          {!hasPlan ? (
            <Alert type="info" showIcon message="正在等待任务计划" description="第一条 plan.update 到达后，这里会实时展示 ToDo 和每一步执行记录。" />
          ) : (
            <div className={styles.todoList}>
              {report.tasks.map((task, index) => {
                const taskKey = getTaskKey(report.currentPlan?.entryId, index)
                const groups = getTaskGroups(report, task.content, index)
                groups.forEach((group) => matchedGroupKeys.add(group.key))
                const steps = getGroupSteps(report, groups)
                const expanded = task.status === 'in_progress' || report.expandedTaskKeys.includes(taskKey)

                return (
                  <div key={taskKey} className={styles.todoRow}>
                    <button type="button" className={`${styles.todoMain} ${styles.todoMainClickable}`} onClick={() => onToggleTask(taskKey)}>
                      <span className={`${styles.todoStatus} ${getStatusClass(task.status)}`}>{getStatusIcon(task.status)}</span>
                      <div className={styles.todoContent}>
                        <div className={styles.todoTitle}>{task.content}</div>
                        <div className={styles.todoDetail}>
                          <Tag color={task.status === 'in_progress' ? 'blue' : task.status === 'completed' ? 'green' : 'default'}>{getStatusText(task.status)}</Tag>
                          {steps.length > 0 ? `${steps.length} 个执行步骤` : '等待执行记录'}
                        </div>
                      </div>
                      <DownOutlined className={styles.taskExpandIcon} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {expanded && (
                      <div className={styles.executionList}>
                        {steps.length > 0
                          ? steps.map((step) => <ExecutionStep key={step.id} step={step} />)
                          : <div className={styles.executionEmpty}>尚未收到该任务的执行步骤</div>}
                      </div>
                    )}
                  </div>
                )
              })}

              {report.executionGroups.filter((group) => !matchedGroupKeys.has(group.key)).map((group) => (
                <div key={group.key} className={styles.todoRow}>
                  <div className={styles.historyGroupTitle}>重规划前的执行记录：{group.taskContent}</div>
                  <div className={styles.executionList}>
                    {getGroupSteps(report, [group]).map((step) => <ExecutionStep key={step.id} step={step} />)}
                  </div>
                </div>
              ))}

              {report.unassignedStepIds.length > 0 && (
                <div className={styles.todoRow}>
                  <div className={styles.historyGroupTitle}>未归属执行记录</div>
                  <div className={styles.executionList}>
                    {report.unassignedStepIds
                      .map((stepId) => report.stepsById[stepId])
                      .filter((step): step is ReportPublicStep => Boolean(step))
                      .map((step) => <ExecutionStep key={step.id} step={step} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ReportTodoList
