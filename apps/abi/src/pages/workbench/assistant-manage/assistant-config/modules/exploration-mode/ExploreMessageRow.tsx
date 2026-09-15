import { CheckOutlined, ClockCircleOutlined, CloseOutlined, CompassOutlined, DesktopOutlined, DownOutlined, InboxOutlined, LoadingOutlined, MinusOutlined, OrderedListOutlined, RightOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, Tag } from 'antd'
import React, { useEffect, useRef, useState } from 'react'

import ExploreRichText, { containsText } from './ExploreRichText'
import type { ExploreItem, ExploreStep, ExploreStepOutput, ExploreTask } from './types'
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

/** 待办状态中文文案：用于报告式待办详情行的状态标签。 */
function getTodoStatusText(status: string): string {
  switch (status) {
    case 'completed':
    case 'done':
      return '已完成'
    case 'in_progress':
      return '执行中'
    case 'failed':
      return '失败'
    case 'cancelled':
      return '已取消'
    default:
      return '等待执行'
  }
}

/** 待办详情行的执行步骤描述：有步骤展示数量，终态无步骤提示无详情，否则等待。 */
function getExecutionDetail(status: string, stepCount: number): string {
  if (stepCount > 0) return `${stepCount} 个执行步骤`
  if (['completed', 'done', 'cancelled', 'failed'].includes(status)) return '无执行详情'
  return '等待执行记录'
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

/** 取当前聚焦步骤：运行中跟随 running，结束后停在最后一个有输出的步骤；用于高亮进行中的待办。 */
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

/** 上块只展示技能执行过程信息（过程文本/文件），表格等数据去右侧工作室查看。 */
function isProcessOutput(output: ExploreStepOutput): boolean {
  const content = output.content
  if (output.outputType === 'image' || output.outputType === 'pdf' || output.outputType === 'word') {
    return typeof content === 'string' && content.length > 0
  }
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) return false
  return typeof content === 'string' && containsText(content)
}

/** 步骤状态复用待办状态图标：running 视为进行中、done 视为已完成，failed/cancelled 原样透传。 */
function getStepStatusMeta(status: ExploreStep['status']) {
  if (status === 'running') return getTodoStatusMeta('in_progress')
  if (status === 'done') return getTodoStatusMeta('completed')
  return getTodoStatusMeta(status)
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

/** 步骤列表平滑滚动到指定步骤行（容器未渲染或 id 缺失时静默跳过）。 */
function scrollStepIntoView(container: HTMLDivElement | null, stepId?: string) {
  if (!container || !stepId) return
  const target = container.querySelector(`[data-step-id="${stepId}"]`)
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

/** 可展开行的键盘操作：Enter/空格切换展开收起。 */
function handleToggleKeyDown(event: React.KeyboardEvent, toggle: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}

interface ExploreStepBlockProps {
  readonly index: number
  readonly step: ExploreStep
}

/** 单个执行步骤：技能执行信息直接展开展示、不支持折叠（左侧蓝色引导线，对齐报告模式执行步骤）。 */
const ExploreStepBlock: React.FC<ExploreStepBlockProps> = ({ step, index }) => {
  const stepRunning = step.status === 'running'
  const meta = getStepStatusMeta(step.status)
  const processOutputs = step.outputs.filter(isProcessOutput)
  const actionInput = normalizeActionInput(step.actionInput)
  const hasMeta = Boolean(step.actionIntention) || Boolean(step.actionReason)
  const hasContent = processOutputs.length > 0 || Boolean(actionInput) || hasMeta
  return (
    <div data-step-id={step.id} className={styles.stepBlock}>
      <div className={styles.stepHeader}>
        <span className={`${styles.todoStatus} ${meta.cls}`}>{meta.icon}</span>
        <span className={styles.stepName}>{step.title || step.action || `步骤 ${step.step ?? index + 1}`}</span>
      </div>
      {hasContent ? (
        <div className={styles.stepBody}>
          <div className={styles.processInfo}>
            {hasMeta && (
              <div className={styles.processMeta}>
                {step.actionIntention && <div><b>当前动作：</b>{step.actionIntention}</div>}
                {step.actionReason && <div><b>执行原因：</b>{step.actionReason}</div>}
              </div>
            )}
            {processOutputs.map((output, outputIndex) => renderProcessOutput(output, outputIndex))}
            {actionInput && <pre className={styles.processCode}>{actionInput}</pre>}
          </div>
        </div>
      ) : (
        <div className={styles.stepEmpty}>
          {stepRunning ? <LoadingOutlined /> : <InboxOutlined />}
          {stepRunning ? '当前步骤正在执行，执行信息会实时出现在这里…' : '当前步骤暂无执行信息'}
        </div>
      )}
    </div>
  )
}

/** 收集从 in_progress 变为终态的待办 id：用于清除手动覆盖态，保证待办执行完自动收起。 */
function collectFinishedTodoIds(tasks: ExploreTask[], prev: Record<string, string>): { finishedIds: string[]; next: Record<string, string> } {
  const next: Record<string, string> = {}
  const finishedIds: string[] = []
  tasks.forEach((task) => {
    if (!task.todo_id) return
    next[task.todo_id] = task.status
    if (prev[task.todo_id] === 'in_progress' && task.status !== 'in_progress') finishedIds.push(task.todo_id)
  })
  return { finishedIds, next }
}

/** 折叠展开态：手动覆盖优先，否则回退自动态。 */
function resolveExpanded(override: boolean | undefined, auto: boolean): boolean {
  return override ?? auto
}

/** 待办行展示状态派生入参。 */
interface TodoRowViewInput {
  readonly activeTodoId?: string
  readonly selectedTodoId: string | null
  readonly selectionActive: boolean
  readonly steps: ExploreStep[]
  readonly task: ExploreTask
  readonly todoExpandedOverride: Record<string, boolean>
}

/** 待办行展示状态派生：高亮/选中/可展开/展开态集中计算，降低组件内分支复杂度。 */
function getTodoRowView({ task, steps, activeTodoId, selectedTodoId, selectionActive, todoExpandedOverride }: TodoRowViewInput) {
  const isDone = task.status === 'completed' || task.status === 'done'
  // 完成态统一灰显：避免残留 activeTodoId 使已完成项继续加黑
  const isActive = !isDone && (task.status === 'in_progress' || Boolean(activeTodoId && task.todo_id === activeTodoId))
  const isSelected = selectionActive && task.todo_id === selectedTodoId
  const expandable = steps.length > 0
  const todoId = task.todo_id || ''
  // 展开态：手动覆盖 > 历史选中 / 待办正在执行时自动展开。
  // 自动开合以“任务级”为粒度：任务 in_progress 期间持续展开（不因步骤间隙无 running 步骤而闪烁/折叠），
  // 转终态后自动收起；steps.some(running) 作为兼容兵底（步骤先于 plan.update 到达时仍能展开）。
  const expanded = Boolean(todoId) && resolveExpanded(
    todoId ? todoExpandedOverride[todoId] : undefined,
    isSelected || task.status === 'in_progress' || steps.some((step) => step.status === 'running'),
  )
  return { isActive, isSelected, expandable, expanded, meta: getTodoStatusMeta(task.status) }
}

interface ExploreTodoBlockProps {
  readonly activeTodoId?: string
  readonly index: number
  readonly onTodoClick: (todoId?: string) => void
  readonly selectedTodoId: string | null
  readonly selectionActive: boolean
  readonly steps: ExploreStep[]
  readonly task: ExploreTask
  readonly todoExpandedOverride: Record<string, boolean>
}

/** 单条待办卡片 + 内嵌其下的执行步骤列表；点击卡片头部展开/收起步骤（运行中的待办自动展开、运行完自动折叠）。 */
const ExploreTodoBlock: React.FC<ExploreTodoBlockProps> = ({
  task, index, steps, activeTodoId, selectedTodoId, selectionActive, todoExpandedOverride, onTodoClick,
}) => {
  const { meta, isActive, isSelected, expandable, expanded } = getTodoRowView({ task, steps, activeTodoId, selectedTodoId, selectionActive, todoExpandedOverride })
  const toggle = () => onTodoClick(task.todo_id)
  return (
    <div className={styles.todoBlock}>
      <div
        className={`${styles.todoRow} ${expandable ? styles.todoRowClickable : ''} ${isSelected ? styles.todoRowSelected : ''}`}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        onClick={expandable ? toggle : undefined}
        onKeyDown={expandable ? (event) => handleToggleKeyDown(event, toggle) : undefined}
      >
        <span className={`${styles.todoStatus} ${meta.cls}`}>{meta.icon}</span>
        <div className={styles.todoContent}>
          <div className={`${styles.todoText} ${isActive || isSelected ? styles.todoTextActive : ''}`}>{task.content || `任务 ${index + 1}`}</div>
          <div className={styles.todoDetail}>
            <span className={`${styles.todoStateTag} ${meta.cls}`}>{getTodoStatusText(task.status)}</span>
            <span>{getExecutionDetail(task.status, steps.length)}</span>
          </div>
        </div>
        {expandable && <span className={styles.todoToggleIcon}>{expanded ? <DownOutlined /> : <RightOutlined />}</span>}
      </div>
      {expanded && (
        <div className={styles.todoSteps}>
          {steps.map((step, stepIndex) => (
            <ExploreStepBlock key={step.id} step={step} index={stepIndex} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 未关联任何待办的步骤（孤儿步骤）分组标题，避免出现执行信息无处展示。 */
const ORPHAN_STEPS_LABEL = '其他执行步骤'

interface ExploreOrphanStepsProps {
  readonly expanded: boolean
  readonly onToggleGroup: () => void
  readonly steps: ExploreStep[]
}

/** 孤儿步骤分组：未关联待办的步骤兜底展示在待办列表末尾，运行中自动展开、运行完自动折叠。 */
const ExploreOrphanSteps: React.FC<ExploreOrphanStepsProps> = ({ steps, expanded, onToggleGroup }) => {
  if (steps.length === 0) return null
  const toggle = () => onToggleGroup()
  return (
    <div className={styles.todoBlock}>
      <div
        className={`${styles.todoRow} ${styles.todoRowClickable}`}
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(event) => handleToggleKeyDown(event, toggle)}
      >
        <span className={`${styles.todoStatus} ${styles.todoStatusPending}`}><ToolOutlined /></span>
        <div className={styles.todoContent}>
          <div className={styles.todoText}>{ORPHAN_STEPS_LABEL}</div>
          <div className={styles.todoDetail}>
            <span>{getExecutionDetail('completed', steps.length)}</span>
          </div>
        </div>
        <span className={styles.todoToggleIcon}>{expanded ? <DownOutlined /> : <RightOutlined />}</span>
      </div>
      {expanded && (
        <div className={styles.todoSteps}>
          {steps.map((step, stepIndex) => (
            <ExploreStepBlock key={step.id} step={step} index={stepIndex} />
          ))}
        </div>
      )}
    </div>
  )
}

interface ExploreTodoPanelProps {
  readonly activeTodoId?: string
  readonly onGroupToggle: (key: string, autoExpanded: boolean) => void
  readonly onTodoClick: (todoId?: string) => void
  readonly selectedTodoId: string | null
  readonly selectionActive: boolean
  readonly steps: ExploreStep[]
  readonly tasks: ExploreTask[]
  readonly todoExpandedOverride: Record<string, boolean>
}

/** 待办事项面板：每条待办下内嵌其执行步骤，未关联待办的孤儿步骤兜底展示在列表末尾。 */
const ExploreTodoPanel: React.FC<ExploreTodoPanelProps> = ({
  tasks, steps, activeTodoId, selectedTodoId, selectionActive, todoExpandedOverride, onTodoClick, onGroupToggle,
}) => {
  const completedCount = tasks.filter((task) => task.status === 'completed' || task.status === 'done').length
  const taskIds = new Set(tasks.map((task) => task.todo_id).filter(Boolean))
  const orphanSteps = steps.filter((step) => !step.todoId || !taskIds.has(step.todoId))
  if (tasks.length === 0 && orphanSteps.length === 0) return null
  const orphanExpanded = resolveExpanded(todoExpandedOverride[ORPHAN_STEPS_LABEL], orphanSteps.some((step) => step.status === 'running'))
  return (
    <section className={styles.panel}>
      <div className={`${styles.panelTitle} ${styles.panelTitleTodo}`}>
        <OrderedListOutlined /> 待办事项
        {tasks.length > 0 && <span className={styles.panelStats}>{completedCount}/{tasks.length}</span>}
      </div>
      <div className={styles.todoList}>
        {tasks.map((task, index) => (
          <ExploreTodoBlock
            key={task.todo_id || index}
            task={task}
            index={index}
            steps={task.todo_id ? steps.filter((step) => step.todoId === task.todo_id) : []}
            activeTodoId={activeTodoId}
            selectedTodoId={selectedTodoId}
            selectionActive={selectionActive}
            todoExpandedOverride={todoExpandedOverride}
            onTodoClick={onTodoClick}
          />
        ))}
        <ExploreOrphanSteps
          steps={orphanSteps}
          expanded={orphanExpanded}
          onToggleGroup={() => onGroupToggle(ORPHAN_STEPS_LABEL, orphanSteps.some((step) => step.status === 'running'))}
        />
      </div>
    </section>
  )
}

const ExploreMessageRow: React.FC<ExploreMessageRowProps> = ({ item, active = false, onOpen }) => {
  const statusTag = getCardStatusTag(item.status)
  const running = item.status === 'running'
  // 深度思考折叠：实时执行中展开，执行完自动折叠；历史默认折叠，可手动展开
  const [thinkingExpanded, setThinkingExpanded] = useState(running)
  useEffect(() => {
    setThinkingExpanded(running)
  }, [running])
  // 打字机流式输出时思考区自动滚到底部，保证最新内容可见
  const thinkingScrollRef = useRef<HTMLDivElement>(null)
  // 待办区引用：运行中或历史探索选中待办后滚动到对应步骤行
  const todoColumnRef = useRef<HTMLDivElement>(null)
  // 待办折叠手动覆盖态：运行中的待办自动展开，执行完自动收起（清除覆盖态），手动点击可临时覆盖；孤儿步骤分组也复用此态
  const [todoExpandedOverride, setTodoExpandedOverride] = useState<Record<string, boolean>>({})
  // 待办从 in_progress 变为终态时清除其手动覆盖态，保证“执行完自动收起”（历史模式手动展开不受影响）
  const prevTaskStatusRef = useRef<Record<string, string>>({})
  useEffect(() => {
    const { next, finishedIds } = collectFinishedTodoIds(item.tasks, prevTaskStatusRef.current)
    prevTaskStatusRef.current = next
    if (finishedIds.length === 0) return
    setTodoExpandedOverride((old) => {
      const finished = new Set(finishedIds)
      const rest: Record<string, boolean> = {}
      Object.keys(old).forEach((key) => {
        if (!finished.has(key)) rest[key] = old[key]
      })
      return rest
    })
  }, [item.tasks])

  // 历史探索支持点击待办查看该步骤的历史信息（思考过程 / 步骤详情），再次点击取消选中
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  useEffect(() => {
    setSelectedTodoId(null)
  }, [running])
  const selectedSteps = selectedTodoId ? item.steps.filter((step) => step.todoId === selectedTodoId) : []
  const selectionActive = !running && selectedSteps.length > 0
  useEffect(() => {
    scrollStepIntoView(todoColumnRef.current, selectionActive ? selectedSteps[0].id : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTodoId, selectionActive])
  // 运行中自动滚动到执行中的步骤，保证新展开的执行信息可见
  const runningStepId = item.steps.find((step) => step.status === 'running')?.id
  useEffect(() => {
    scrollStepIntoView(todoColumnRef.current, runningStepId)
  }, [runningStepId])
  const handleTodoClick = (todoId?: string) => {
    if (!todoId) return
    // 手动切换待办展开态，覆盖自动态
    const autoExpanded = todoId === selectedTodoId || item.steps.some((step) => step.todoId === todoId && step.status === 'running')
    const nextExpanded = !resolveExpanded(todoExpandedOverride[todoId], autoExpanded)
    setTodoExpandedOverride((prev) => ({ ...prev, [todoId]: nextExpanded }))
    // 运行中仅切换展开；历史探索联动选中态与思考区
    if (running || !item.steps.some((step) => step.todoId === todoId)) return
    const nextSelected = selectedTodoId === todoId ? null : todoId
    setSelectedTodoId(nextSelected)
    if (nextSelected) setThinkingExpanded(true)
  }

  const thinking = selectionActive ? getStepsThinking(selectedSteps) : getCurrentThinking(item)
  useEffect(() => {
    if (!running) return
    const el = thinkingScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thinking.thought, running])
  const activeTodoId = getFocusedStep(item)?.todoId
  // 孤儿步骤分组展开切换：手动覆盖自动态（运行中自动展开）
  const handleGroupToggle = (key: string, autoExpanded: boolean) => setTodoExpandedOverride((prev) => ({ ...prev, [key]: !resolveExpanded(prev[key], autoExpanded) }))

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
          </div>
        </div>

        <div className={styles.cardWorkspace}>
          <div ref={todoColumnRef} className={styles.todoColumn}>
            {/* 思考区：走到每一步只展示当前步骤思考，标题可点击折叠 */}
            <section className={styles.panel}>
              <div
                className={`${styles.panelTitle} ${styles.panelTitleThink} ${styles.panelTitleToggle}`}
                role="button"
                tabIndex={0}
                onClick={() => setThinkingExpanded((prev) => !prev)}
                onKeyDown={(event) => handleToggleKeyDown(event, () => setThinkingExpanded((prev) => !prev))}
              >
                <ThunderboltOutlined /> {running ? '正在深度思考' : '思考过程'}
                <span className={styles.panelToggleIcon}>{thinkingExpanded ? <DownOutlined /> : <RightOutlined />}</span>
              </div>
              {thinkingExpanded && (
                <div ref={thinkingScrollRef} className={styles.thinkingScroll}>
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
                </div>
              )}
            </section>

            {/* 待办事项：执行步骤内嵌在对应待办下方，点击待办展开/收起，运行中自动展开、运行完自动折叠 */}
            <ExploreTodoPanel
              tasks={item.tasks}
              steps={item.steps}
              activeTodoId={activeTodoId}
              selectedTodoId={selectedTodoId}
              selectionActive={selectionActive}
              todoExpandedOverride={todoExpandedOverride}
              onTodoClick={handleTodoClick}
              onGroupToggle={handleGroupToggle}
            />

            {/* 左栏底部提示语：任务运行中提醒用户留在当前页面 */}
            {running && (
              <div className={styles.runningHint}>
                💡 温馨提示：任务正在处理中，请留在当前对话页面哦~ 当前暂不支持后台运行，离开会导致任务中断。
              </div>
            )}
          </div>

        </div>

        {item.error && <Alert className={styles.inlineAlert} type="error" showIcon message={item.error.message} />}
      </div>
    </article>
  )
}

export default ExploreMessageRow
