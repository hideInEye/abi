import { ArrowRightOutlined, CheckOutlined, ClockCircleOutlined, CloseOutlined, CompassOutlined, InboxOutlined, LoadingOutlined, MinusOutlined, OrderedListOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import React from 'react'

import ExploreRichText from './ExploreRichText'
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

function renderCurrentOutput(output: ExploreStepOutput, index: number) {
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
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) {
    return <ExploreRichText key={index} text={`\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`} />
  }
  return <ExploreRichText key={index} text={String(content ?? '')} />
}

const ExploreMessageRow: React.FC<ExploreMessageRowProps> = ({ item, active = false, onOpen }) => {
  const completedCount = item.tasks.filter((task) => task.status === 'completed' || task.status === 'done').length
  const statusTag = getCardStatusTag(item.status)
  const running = item.status === 'running'
  const thinking = getCurrentThinking(item)
  const focusedStep = getFocusedStep(item)
  const resultStepCount = item.steps.filter((step) => step.outputs.length > 0).length
  const hasResult = Boolean(item.finalContent) || resultStepCount > 0 || Boolean(item.summary)

  const focusedStepTitle = focusedStep?.title || focusedStep?.action || (focusedStep?.step != null ? `步骤 ${focusedStep.step}` : '当前步骤')
  const focusedOutputs = focusedStep?.outputs || []
  const activeTodoId = focusedStep?.todoId
  const openDesc = [
    resultStepCount > 0 ? `${resultStepCount} 个步骤结果` : '',
    item.finalContent ? '最终结论' : '',
    item.summary ? '执行摘要' : '',
  ].filter(Boolean).join(' · ') || '查看完整执行数据与结论'

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
          {item.planVersion != null && <span className={styles.cardMeta}>v{item.planVersion}</span>}
        </div>

        <div className={styles.cardWorkspace}>
          <div className={styles.todoColumn}>
            {/* 思考区：走到每一步只展示当前步骤思考 */}
            <section className={styles.panel}>
              <div className={`${styles.panelTitle} ${styles.panelTitleThink}`}>
                <ThunderboltOutlined /> {running ? '正在深度思考' : '思考过程'}
              </div>
              {thinking.thought ? (
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
                    const isActive = task.status === 'in_progress' || Boolean(activeTodoId && task.todo_id === activeTodoId)
                    return (
                      <div className={styles.todoRow} key={task.todo_id || index}>
                        <span className={`${styles.todoStatus} ${meta.cls}`}>{meta.icon}</span>
                        <span className={`${styles.todoText} ${isActive ? styles.todoTextActive : ''}`}>{task.content || `任务 ${index + 1}`}</span>
                        {task.priority && <Tag className={styles.todoPriority}>{task.priority}</Tag>}
                      </div>
                    )
                  })}
                </div>
              </section>
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
                {focusedOutputs.length > 0 ? (
                  <div className={styles.currentOutputList}>{focusedOutputs.map((output, index) => <div className={styles.currentOutputItem} key={index}>{renderCurrentOutput(output, index)}</div>)}</div>
                ) : (
                  <div className={styles.currentResultEmpty}>
                    {focusedStep.status === 'running' ? <LoadingOutlined /> : <InboxOutlined />}
                    {focusedStep.status === 'running' ? '当前步骤正在执行，结果会实时出现在这里…' : '当前步骤暂无输出'}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.currentResultEmpty}>
                {running ? <LoadingOutlined /> : <InboxOutlined />}
                {running ? '等待步骤开始…' : '暂无步骤结果'}
              </div>
            )}
          </section>
        </div>

        {/* 打开结果入口：点开右侧工作室查看全部结果 */}
        {hasResult ? (
          <div
            className={styles.openCard}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen?.()
              }
            }}
          >
            <div className={styles.openCardMain}>
              <span className={styles.openCardIcon}><InboxOutlined /></span>
              <div className={styles.openCardInfo}>
                <div className={styles.openCardTitle}>全部执行结果</div>
                <div className={styles.openCardDesc}>{openDesc}</div>
              </div>
            </div>
            <span className={`${styles.openCardAction} ${active ? styles.openCardActionActive : ''}`}>
              {active ? '查看中' : '打开结果'} <ArrowRightOutlined />
            </span>
          </div>
        ) : (
          <div className={styles.cardHint}>
            {running ? <LoadingOutlined /> : <InboxOutlined />}
            {running ? '运行中不会自动打开右侧结果；当前步骤输出会显示在上方右栏。' : '暂无完整执行结果'}
          </div>
        )}

        {item.error && <Alert className={styles.inlineAlert} type="error" showIcon message={item.error.message} />}
      </div>
    </article>
  )
}

export default ExploreMessageRow
