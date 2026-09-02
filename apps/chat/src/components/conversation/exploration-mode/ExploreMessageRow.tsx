import { CheckOutlined, ClockCircleOutlined, CloseOutlined, CompassOutlined, DislikeOutlined, DownOutlined, ExpandOutlined, InboxOutlined, LikeOutlined, LoadingOutlined, MinusOutlined, OrderedListOutlined, ShrinkOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, message, Tooltip } from 'antd'
import React, { useEffect, useRef, useState } from 'react'

import ExploreCodeBlock, { detectCodeLanguage, type ExploreCodeEditPayload, type ExploreCodeLanguage } from './ExploreCodeBlock'
import ExploreRichText, { containsText } from './ExploreRichText'
import type { ExploreItem, ExploreStep, ExploreStepOutput } from './types'
import styles from './styles.module.css'

interface ExploreMessageRowProps {
  item: ExploreItem
  /** 是否为当前在右侧工作室打开的探索项。 */
  active?: boolean
  /** 打开右侧工作室查看执行结果。 */
  onOpen?: () => void
  /** 关闭右侧工作室。 */
  onClose?: () => void
  /** 代码块点击编辑时，由上层在右侧面板打开代码编辑器。 */
  onEditCode?: (payload: ExploreCodeEditPayload) => void
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
      return { cls: styles.statusTagRunning, text: '执行中' }
    case 'completed':
      return { cls: styles.statusTagCompleted, text: '已完成' }
    case 'failed':
      return { cls: styles.statusTagFailed, text: '失败' }
    case 'cancelled':
      return { cls: styles.statusTagCancelled, text: '已取消' }
    default:
      return { cls: styles.statusTagCancelled, text: status }
  }
}

/** 取当前应展示的思考：运行中优先打字机流（简洁思考流 > 深度思考流），其次运行中的步骤，其次最后一个有思考的步骤，最后回退计划思考。 */
function getCurrentThinking(item: ExploreItem): { thought?: string; intention?: string } {
  if (item.status === 'running') {
    if (item.thoughtStream) return { thought: item.thoughtStream }
    if (item.reasoningStream) return { thought: item.reasoningStream }
  }
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

/** 历史探索点击待办后，取该待办下的思考：优先最后一个有思考的步骤。 */
function getStepsThinking(steps: ExploreStep[]): { thought?: string; intention?: string } {
  const step = [...steps].reverse().find((s) => s.thought || s.actionReason || s.actionIntention)
  if (!step) return {}
  return { thought: step.thought || step.actionReason || undefined, intention: step.actionIntention || undefined }
}

/** 历史探索点击待办后，取该待办下应展示详情的步骤：优先最后一个有输出的步骤。 */
function getStepsFocused(steps: ExploreStep[]): ExploreStep | undefined {
  return [...steps].reverse().find((step) => step.outputs.length > 0) || steps[steps.length - 1]
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

function renderProcessOutput(output: ExploreStepOutput, index: number, onEditCode?: (code: string, language: ExploreCodeLanguage) => void) {
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
    // 识别 sql / python / shell / json 代码，按千问风格代码块渲染；后端标记 code 但未识别语言时兜底纯文本代码块
    const language = detectCodeLanguage(content)
    if (language || output.outputType === 'code') {
      return <ExploreCodeBlock key={index} code={content} language={language ?? 'text'} onEdit={onEditCode} />
    }
    return <ExploreRichText key={index} text={content} hideTables />
  }
  return null
}

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

const ExploreMessageRow: React.FC<ExploreMessageRowProps> = ({ item, active = false, onOpen, onClose, onEditCode }) => {
  const completedCount = item.tasks.filter((task) => task.status === 'completed' || task.status === 'done').length
  const statusTag = getCardStatusTag(item.status)
  const running = item.status === 'running'
  // 深度思考折叠：实时执行中展开，执行完自动折叠；历史默认折叠，可手动展开
  const [thinkingExpanded, setThinkingExpanded] = useState(running)
  useEffect(() => {
    setThinkingExpanded(running)
  }, [running])
  
  // 技能列表自动滚动到当前执行中的技能
  const skillListRef = useRef<HTMLDivElement>(null)
  const runningStepId = item.steps.find((step) => step.status === 'running')?.id
  useEffect(() => {
    if (!skillListRef.current || !runningStepId) return
    const runningElement = skillListRef.current.querySelector(`[data-step-id="${runningStepId}"]`)
    if (runningElement) {
      runningElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [runningStepId])

  // 打字机流式输出时思考区自动滚到底部，保证最新内容可见
  const thinkingScrollRef = useRef<HTMLDivElement>(null)

  // 历史探索支持点击待办查看该步骤的历史信息（思考过程 / 步骤详情 / 技能高亮），再次点击取消选中
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  useEffect(() => {
    setSelectedTodoId(null)
  }, [running])
  const selectedSteps = selectedTodoId ? item.steps.filter((step) => step.todoId === selectedTodoId) : []
  const selectionActive = !running && selectedSteps.length > 0
  useEffect(() => {
    if (!skillListRef.current || !selectionActive) return
    const firstSelected = skillListRef.current.querySelector(`[data-step-id="${selectedSteps[0].id}"]`)
    if (firstSelected) firstSelected.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTodoId, selectionActive])
  const handleTodoClick = (todoId?: string) => {
    if (running || !todoId || !item.steps.some((step) => step.todoId === todoId)) return
    setSelectedTodoId((prev) => (prev === todoId ? null : todoId))
    setThinkingExpanded(true)
  }

  const thinking = selectionActive ? getStepsThinking(selectedSteps) : getCurrentThinking(item)
  useEffect(() => {
    if (!running) return
    const el = thinkingScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thinking.thought, running])

  // 思考内容未超出区域时不展示展开/收起控件
  const [thinkingOverflow, setThinkingOverflow] = useState(false)
  useEffect(() => {
    const el = thinkingScrollRef.current
    if (!el) return
    const check = () => setThinkingOverflow(el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [thinking.thought, running])
  const focusedStep = selectionActive ? getStepsFocused(selectedSteps) : getFocusedStep(item)
  const focusedStepTitle = focusedStep?.title || focusedStep?.action || (focusedStep?.step != null ? `步骤 ${focusedStep.step}` : '当前步骤')
  // 过程代码与调用入参共用同一编辑入口；上层未传回调（如调试抽屉）时编辑按钮自动隐藏
  const handleEditCode = onEditCode
    ? (code: string, language: ExploreCodeLanguage) => onEditCode({ code, language, title: focusedStepTitle })
    : undefined
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
            {running && <span className={styles.statusDot} />}
            <span className={`${styles.statusTag} ${statusTag.cls}`}>{statusTag.text}</span>
          </div>
          <div className={styles.cardHeaderActions}>
            {item.planVersion != null && <span className={styles.cardMeta}>v{item.planVersion}</span>}
            <button
              type="button"
              className={`${styles.studioChip} ${active ? styles.studioChipActive : ''}`}
              onClick={active ? onClose : onOpen}
              aria-label={active ? '收起工作室' : '打开工作室'}
            >
              {active ? <ShrinkOutlined /> : <ExpandOutlined />}
              <span>工作室</span>
            </button>
          </div>
        </div>

        <div className={styles.cardWorkspace}>
          <div className={styles.todoColumn}>
            {/* 思考区：走到每一步只展示当前步骤思考；内容超出区域时标题才可点击折叠 */}
            <section className={styles.panel}>
              <div
                className={`${styles.panelTitle} ${styles.panelTitleThink} ${thinkingOverflow ? styles.panelTitleToggle : ''}`}
                role={thinkingOverflow ? 'button' : undefined}
                tabIndex={thinkingOverflow ? 0 : undefined}
                onClick={thinkingOverflow ? () => setThinkingExpanded((prev) => !prev) : undefined}
                onKeyDown={thinkingOverflow ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setThinkingExpanded((prev) => !prev)
                  }
                } : undefined}
              >
                <ThunderboltOutlined /> {running ? '正在深度思考' : '思考过程'}
                {thinkingOverflow && (
                  <DownOutlined
                    className={styles.panelToggleIcon}
                    style={{
                      transform: thinkingExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                )}
              </div>
              <div className={styles.thinkingCollapsible}>
                <div
                  ref={thinkingScrollRef}
                  className={styles.thinkingCollapsibleInner}
                  style={{
                    // 展开时内部滚动；收起时填满思考区并裁切，配合底部渐变遮罩逐渐隐藏
                    overflow: thinkingExpanded ? undefined : 'hidden',
                  }}
                >
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
                  {/* 遮罩置于内容容器内，折叠且内容超出时紧贴区域底部淡出 */}
                  {!thinkingExpanded && thinkingOverflow && <div className={styles.thinkingFade} />}
                </div>
              </div>
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
                    // 历史探索：有对应执行步骤的待办可点击查看该步骤历史信息
                    const clickable = !running && Boolean(task.todo_id) && item.steps.some((step) => step.todoId === task.todo_id)
                    const isSelected = selectionActive && task.todo_id === selectedTodoId
                    return (
                      <div
                        className={`${styles.todoRow} ${clickable ? styles.todoRowClickable : ''} ${isSelected ? styles.todoRowSelected : ''}`}
                        key={task.todo_id || index}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => handleTodoClick(task.todo_id) : undefined}
                        onKeyDown={clickable ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handleTodoClick(task.todo_id)
                          }
                        } : undefined}
                      >
                        <span className={`${styles.todoStatus} ${meta.cls}`}>{meta.icon}</span>
                        <span className={`${styles.todoText} ${isActive || isSelected ? styles.todoTextActive : ''}`}>{task.content || `任务 ${index + 1}`}</span>
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
                <ToolOutlined /> {running ? '当前步骤结果' : '当前步骤详情'}
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
                    {focusedProcessOutputs.map((output, index) => renderProcessOutput(output, index, handleEditCode))}
                    {/* 调用入参为 JSON，按 json 代码块规范渲染（高亮 + 复制/编辑） */}
                    {focusedActionInput && <ExploreCodeBlock code={focusedActionInput} language="json" onEdit={handleEditCode} />}
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
              <div ref={skillListRef} className={styles.skillList}>
                {item.steps.map((step, index) => {
                  const isSelectedSkill = selectionActive && step.todoId === selectedTodoId
                  return (
                    <div key={step.id} data-step-id={step.id} className={`${styles.skillRow} ${step.status === 'running' ? styles.skillRowRunning : ''} ${isSelectedSkill ? styles.skillRowSelected : ''}`}>
                      <ToolOutlined />
                      <span className={styles.skillName}>{step.title || step.action || `步骤 ${step.step ?? index + 1}`}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* 底部提示语：任务运行中提醒用户留在当前页面 */}
        {running && (
          <div className={styles.runningHint}>
            💡 <span className={styles.runningHintLabel}>温馨提示：</span>任务正在处理中，请留在当前对话页面哦~ 当前暂不支持后台运行，离开会导致任务中断。
          </div>
        )}

        {item.error && <Alert className={styles.inlineAlert} type="error" message={item.error.message} />}

        {/* 底部工具栏：反馈按钮（占位功能，后续接入实际评价逻辑），样式对齐交互模式操作栏图标按钮 */}
        <div className={styles.footerBar}>
          <Tooltip title="点赞">
            <button type="button" className={styles.footerAction} onClick={() => message.info('功能开发中...')}>
              <LikeOutlined />
            </button>
          </Tooltip>
          <Tooltip title="点踩">
            <button type="button" className={styles.footerAction} onClick={() => message.info('功能开发中...')}>
              <DislikeOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    </article>
  )
}

export default ExploreMessageRow
