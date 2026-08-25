import { CheckOutlined, ClockCircleOutlined, CloseOutlined, CompassOutlined, DesktopOutlined, DownOutlined, InboxOutlined, LoadingOutlined, MinusOutlined, OrderedListOutlined, RightOutlined, ShrinkOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import React, { useEffect, useState } from 'react'

import ExploreRichText, { containsText } from './ExploreRichText'
import type { ExploreItem, ExploreStep, ExploreStepOutput } from './types'
import styles from './styles.module.css'

interface ExploreMessageRowProps {
  item: ExploreItem
  /** 是否为当前在右侧工作室打开的探索项。 */
  active?: boolean
  /** 打开右侧工作室查看执行结果。 */
  onOpen?: () => void
}

function getTodoStatusMeta(status: string) {
  switch (status) {
    case 'completed':
    case 'done':
      return { icon: <CheckOutlined />, cls: styles.todoStatusDone }
    case 'in_progress':
      return { icon: <LoadingOutlined />, cls: styles.todoStatusRunning }
    case 'failed':
      return { icon: <CloseOutlined />, cls: styles.todoStatusFailed }
    case 'cancelled':
      return { icon: <MinusOutlined />, cls: styles.todoStatusCancelled }
    default:
      return { icon: <ClockCircleOutlined />, cls: styles.todoStatusPending }
  }
}

/** 优先级标签色块：high 红 / medium 橙 / low 绿，其余回退默认灰。 */
function getTodoPriorityCls(priority: string): string {
  switch (priority) {
    case 'high':
      return styles.todoPriorityHigh
    case 'medium':
      return styles.todoPriorityMedium
    case 'low':
      return styles.todoPriorityLow
    default:
      return ''
  }
}

function getCardStatusTag(status: ExploreItem['status']) {
  switch (status) {
    case 'running':
      return { color: 'processing', text: '执行中' }
    case 'completed':
      return { color: 'green', text: '已完成' }
    case 'failed':
      return { color: 'red', text: '失败' }
    case 'cancelled':
      return { color: 'default', text: '已取消' }
    default:
      return { color: 'default', text: status }
  }
}

/** 取当前应展示的思考：优先运行中的步骤，其次最后一个有思考的步骤，最后回退计划思考。 */
function getCurrentThinking(item: ExploreItem): { thought?: string; intention?: string } {
  const running = [...item.steps].reverse().find((step) => step.status === 'running')
  const lastWithThought = [...item.steps].reverse().find((step) => step.thought || step.actionReason)
  const step = running || lastWithThought
  if (step && (step.thought || step.actionReason || step.actionIntention)) {
    return { thought: step.thought || step.actionReason || undefined, intention: step.actionIntention || undefined }
  }
  return { thought: item.planThought?.thought, intention: item.planThought?.actionIntention }
}

/** 左侧工作区右栏只展示当前步骤结果：运行中跟随 running，结束后停在最后一个有输出的步骤。 */
function getFocusedStep(item: ExploreItem): ExploreStep | undefined {
  const running = [...item.steps].reverse().find((step) => step.status === 'running')
  if (running) return running
  const lastWithOutput = [...item.steps].reverse().find((step) => step.outputs.length > 0)
  if (lastWithOutput) return lastWithOutput
  return [...item.steps].reverse().find((step) => step.status === 'done' || step.status === 'failed' || step.status === 'cancelled') || item.steps[item.steps.length - 1]
}

/** 上块只展示技能执行过程信息（过程文本/文件），表格等数据去右侧工作室查看。 */
function isProcessOutput(output: ExploreStepOutput): boolean {
  const content = output.content
  if (output.outputType === 'image' || output.outputType === 'pdf' || output.outputType === 'word') {
    return typeof content === 'string' && content.length > 0
  }
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) return false
  return typeof content === 'string' && containsText(content)
}

const SQL_LIKE = /^\s*(select|with|insert|update|delete|create|drop|alter|show|describe)\b/i

/** 调用入参可能是 "{}" 空占位，空对象不展示；非空格式化为可读 JSON。 */
function normalizeActionInput(input?: string | null): string {
  const raw = (input || '').trim()
  if (!raw || raw === 'null') return ''
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Object.keys(parsed as object).length === 0) return ''
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

function renderProcessOutput(output: ExploreStepOutput, index: number) {
  const content = output.content
  if (output.outputType === 'image' && typeof content === 'string') {
    return <img key={index} src={content} alt="当前步骤输出" className={styles.mediaImage} />
  }
  if ((output.outputType === 'pdf' || output.outputType === 'word') && typeof content === 'string') {
    return (
      <a key={index} href={content} target="_blank" rel="noreferrer" className={styles.fileLink}>
        打开{output.outputType === 'pdf' ? ' PDF' : ' Word'} 文件
      </a>
    )
  }
  if (typeof content === 'string') {
    // SQL 语句用代码块展示，避免 markdown 把换行压成空格
    if (SQL_LIKE.test(content)) return <pre key={index} className={styles.processCode}>{content}</pre>
    return <ExploreRichText key={index} text={content} hideTables />
  }
  return null
}

const ExploreMessageRow: React.FC<ExploreMessageRowProps> = ({ item, active = false, onOpen }) => {
  const completedCount = item.tasks.filter((task) => task.status === 'completed' || task.status === 'done').length
  const statusTag = getCardStatusTag(item.status)
  const running = item.status === 'running'
  // 深度思考折叠：实时执行中展开，执行完自动折叠；历史默认折叠，可手动展开
  const [thinkingExpanded, setThinkingExpanded] = useState(running)
  useEffect(() => {
    setThinkingExpanded(running)
  }, [running])
  const thinking = getCurrentThinking(item)
  const focusedStep = getFocusedStep(item)
  const focusedStepTitle = focusedStep?.title || focusedStep?.action || (focusedStep?.step != null ? `步骤 ${focusedStep.step}` : '当前步骤')
  const focusedOutputs = focusedStep?.outputs || []
  const focusedProcessOutputs = focusedOutputs.filter(isProcessOutput)
  const focusedActionInput = normalizeActionInput(focusedStep?.actionInput)
  const hasProcessMeta = Boolean(focusedStep?.actionIntention) || Boolean(focusedStep?.actionReason)
  const hasProcessContent = focusedProcessOutputs.length > 0 || Boolean(focusedActionInput) || hasProcessMeta
  const activeTodoId = focusedStep?.todoId
  
  return (
    <article className={styles.messageRow}>
      <div className={styles.questionWrap}>
        <div className={styles.questionBubble}>{item.question}</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <CompassOutlined /> 探索模式
            <Tag color={statusTag.color}>{statusTag.text}</Tag>
          </div>
          <div className={styles.cardHeaderActions}>
            {item.planVersion != null && <span className={styles.cardMeta}>v{item.planVersion}</span>}
            <button
              type="button"
              className={`${styles.studioChip} ${active ? styles.studioChipActive : ''}`}
              onClick={onOpen}
            >
              <DesktopOutlined /> 工作室
            </button>
            <button type="button" className={styles.studioIcon} onClick={onOpen} aria-label="打开工作室">
              <ShrinkOutlined />
            </button>
          </div>
        </div>

        <div className={styles.cardWorkspace}>
          <div className={styles.todoColumn}>
            {/* 思考区：走到每一步只展示当前步骤思考，标题可点击折叠 */}
            <section className={styles.panel}>
              <div
                className={`${styles.panelTitle} ${styles.panelTitleThink} ${styles.panelTitleToggle}`}
                role="button"
                tabIndex={0}
                onClick={() => setThinkingExpanded((prev) => !prev)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setThinkingExpanded((prev) => !prev)
                  }
                }}
              >
                <ThunderboltOutlined /> {running ? '正在深度思考' : '思考过程'}
                <span className={styles.panelToggleIcon}>{thinkingExpanded ? <DownOutlined /> : <RightOutlined />}</span>
              </div>
              {thinkingExpanded && (
                thinking.thought ? (
                  <div className={styles.thinkingBox}>
                    <div className={styles.thinkingText}>{thinking.thought}</div>
                    {thinking.intention && (
                      <div className={styles.thinkingSub}>
                        <b>当前动作：</b>
                        {thinking.intention}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.thinkingPending}>
                    {running ? <LoadingOutlined /> : <ClockCircleOutlined />}
                    {running ? '规划智能体正在生成执行计划…' : '暂无思考内容'}
                  </div>
                )
              )}
            </section>

            {/* 待办事项 */}
            {item.tasks.length > 0 && (
              <section className={styles.panel}>
                <div className={`${styles.panelTitle} ${styles.panelTitleTodo}`}>
                  <OrderedListOutlined /> 待办事项
                  <span className={styles.panelStats}>{completedCount}/{item.tasks.length}</span>
                </div>
                <div className={styles.todoList}>
                  {item.tasks.map((task, index) => {
                    const meta = getTodoStatusMeta(task.status)
                    const isDone = task.status === 'completed' || task.status === 'done'
                    // 完成态统一灰显：避免残留 activeTodoId 使已完成项继续加黑
                    const isActive = !isDone && (task.status === 'in_progress' || Boolean(activeTodoId && task.todo_id === activeTodoId))
                    return (
                      <div className={styles.todoRow} key={task.todo_id || index}>
                        <span className={`${styles.todoStatus} ${meta.cls}`}>{meta.icon}</span>
                        <span className={`${styles.todoText} ${isActive ? styles.todoTextActive : ''}`}>{task.content || `任务 ${index + 1}`}</span>
                        {task.priority && <span className={`${styles.todoPriority} ${getTodoPriorityCls(task.priority)}`}>{task.priority}</span>}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 左栏底部提示语：任务运行中提醒用户留在当前页面 */}
            {running && (
              <div className={styles.runningHint}>
                💡 温馨提示：任务正在处理中，请留在当前对话页面哦~ 当前暂不支持后台运行，离开会导致任务中断。
              </div>
            )}
          </div>

          <section className={styles.currentColumn}>
            <div className={styles.currentResultHeader}>
              <div className={styles.currentResultTitle}>
                <ToolOutlined /> 当前步骤结果
              </div>
              {focusedStep && <span className={styles.currentResultMeta}>{focusedStepTitle}</span>}
            </div>

            {focusedStep ? (
              <div className={styles.currentResultBody}>
                {hasProcessContent ? (
                  <div className={styles.processInfo}>
                    {hasProcessMeta && (
                      <div className={styles.processMeta}>
                        {focusedStep?.actionIntention && <div><b>当前动作：</b>{focusedStep.actionIntention}</div>}
                        {focusedStep?.actionReason && <div><b>执行原因：</b>{focusedStep.actionReason}</div>}
                      </div>
                    )}
                    {focusedProcessOutputs.map((output, index) => renderProcessOutput(output, index))}
                    {focusedActionInput && <pre className={styles.processCode}>{focusedActionInput}</pre>}
                  </div>
                ) : (
                  <div className={styles.currentResultEmpty}>
                    {focusedStep.status === 'running' ? <LoadingOutlined /> : <InboxOutlined />}
                    {focusedStep.status === 'running' ? '当前步骤正在执行，执行信息会实时出现在这里…' : '当前步骤暂无执行信息'}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.currentResultEmpty}>
                {running ? <LoadingOutlined /> : <InboxOutlined />}
                {running ? '等待步骤开始…' : '暂无步骤结果'}
              </div>
            )}

            {/* 下块：技能名称展示区，和 todolist 一样按状态区分颜色（完成灰色 / 执行黑色） */}
            {item.steps.length > 0 && (
              <div className={styles.skillList}>
                {item.steps.map((step, index) => (
                  <div key={step.id} className={`${styles.skillRow} ${step.status === 'running' ? styles.skillRowRunning : ''}`}>
                    <ToolOutlined />
                    <span className={styles.skillName}>{step.title || step.action || `步骤 ${step.step ?? index + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {item.error && <Alert className={styles.inlineAlert} type="error" showIcon message={item.error.message} />}
      </div>
    </article>
  )
}

export default ExploreMessageRow
