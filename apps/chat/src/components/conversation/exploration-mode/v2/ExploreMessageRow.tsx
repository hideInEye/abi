import { ClockCircleOutlined, CloseOutlined, CompassOutlined, CopyOutlined, DeleteOutlined, DislikeOutlined, ExpandOutlined, FileTextOutlined, LikeOutlined, RightOutlined, ShrinkOutlined, StopOutlined } from '@ant-design/icons'
import { Dropdown, Tooltip, message } from 'antd'
import { type RefObject, useEffect, useId, useMemo, useRef, useState } from 'react'

import type { ExploreCodeEditPayload } from '../ExploreCodeBlock'
import { EXPORT_MENU_ITEMS, downloadExploreExport, isStructuredOutput, type ExploreExportFormat } from '../exploreExport'
import ExploreRichText from '../ExploreRichText'
import type { ExploreItem } from '../types'

import ExploreProcess from './ExploreProcess'
import { buildProcessBlocks, getFinalSummary } from './displayModel'
import styles from './styles.module.css'
import { useExploreScroll } from './useExploreScroll'
import { useProcessDisclosure } from './useProcessDisclosure'

export interface ExploreMessageRowProps {
  readonly active?: boolean
  readonly compact?: boolean
  readonly item: ExploreItem
  /** 工作室当前屏绑定的步骤：展开并滚动定位到该步骤，短暂高亮。 */
  readonly locateStepId?: string
  readonly onClose?: () => void
  readonly onDelete?: (item: ExploreItem) => void
  readonly onEditCode?: (payload: ExploreCodeEditPayload) => void
  readonly onOpen?: () => void
  /** 取消排队（仅 status='queued' 时生效） */
  readonly onCancelQueued?: (item: ExploreItem) => void
  /** 停止当前执行中的探索任务（仅 status='running' 时生效） */
  readonly onStop?: () => void
  readonly scrollContainerRef?: RefObject<HTMLDivElement>
}

const STATUS_LABELS = { queued: '探索排队中', running: '探索执行中', completed: '探索已完成', failed: '探索失败', cancelled: '探索已取消' } as Record<string, string>
const STATUS_BADGES = { queued: '排队中', running: '执行中', completed: '已完成', failed: '失败', cancelled: '已取消' } as Record<string, string>

function ExploreMessage({ item, active, onOpen, onClose, onEditCode, onDelete, onCancelQueued, onStop, compact, scrollContainerRef, locateStepId }: ExploreMessageRowProps) {
  const processId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const beforeToggle = useExploreScroll(item, scrollContainerRef)
  const disclosure = useProcessDisclosure(beforeToggle)
  const automatic = item.status !== 'completed'
  const open = disclosure.isOpen('process', automatic)
  const blocks = useMemo(() => buildProcessBlocks(item), [item])
  const summary = getFinalSummary(item)
  // 与工作室分屏口径一致：有结构化步骤或最终结论/摘要才可保存为文档
  const canSave = item.steps.some((step) => step.outputs.some(isStructuredOutput)) || Boolean(item.finalContent) || Boolean(item.summary)
  // 复制问题文案，口径同报告模式（仅复制用户提问文本）
  const copyQuestion = async () => {
    try {
      await navigator.clipboard.writeText(item.question)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }
  const [highlightId, setHighlightId] = useState<string>()
  const locatedRef = useRef<string>()
  // 只在工作室当前打开的行内定位：step id 是单次运行内序号（step-1 等），
  // 同一 id 存在于每张探索卡片，不按 active 隔离会连带展开、滚动并高亮历史卡片。
  useEffect(() => {
    if (!active) {
      locatedRef.current = undefined
      setHighlightId(undefined)
      return
    }
    if (!locateStepId || locateStepId === locatedRef.current) return
    if (!item.steps.some((step) => step.id === locateStepId)) return
    locatedRef.current = locateStepId
    disclosure.reveal(`tool:${locateStepId}`)
    // 展开是异步重渲染，等两帧后再量位置滚动，否则量到折叠态的旧布局。
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => {
      const container = scrollContainerRef?.current
      const target = rootRef.current?.querySelector<HTMLElement>(`[data-step-id="${locateStepId}"]`)
      if (!container || !target) return
      const top = container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - 72
      container.scrollTo({ top: Math.max(0, top) })
    }))
    setHighlightId(locateStepId)
    return () => cancelAnimationFrame(frame)
  }, [active, locateStepId, item, disclosure, scrollContainerRef])
  // 消退倒计时与定位 effect 分离：实时流式期间 item 逐帧变化、disclosure 每次渲染都是新身份，
  // 定时器若写在定位 effect 内会被重跑时的 cleanup 取消，导致高亮不消退、背景被永久染色。
  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(undefined), 1600)
    return () => clearTimeout(timer)
  }, [highlightId])

  // 排队中：简化卡片，等待标识在问题上方，与问题气泡等高
  if (item.status === 'queued') {
    return (
      <article ref={rootRef} className={`${styles.message} ${compact ? styles.compact : ''}`} data-explore-id={item.id}>
        <div className={styles.questionWrap}>
          <div className={styles.questionColumn}>
            {/* 等待执行标识：与问题气泡等高 */}
            <div className={styles.queuedBadge}>
              <ClockCircleOutlined />
              <span>等待执行</span>
            </div>
            <div className={styles.question}>{item.question}</div>
            <div className={styles.questionActions}>
              <Tooltip title="复制"><button type="button" className={styles.questionActionButton} aria-label="复制" onClick={copyQuestion}><CopyOutlined /></button></Tooltip>
              {onCancelQueued && <Tooltip title="取消排队"><button type="button" className={styles.questionActionButton} aria-label="取消排队" onClick={() => onCancelQueued(item)}><CloseOutlined /></button></Tooltip>}
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article ref={rootRef} className={`${styles.message} ${compact ? styles.compact : ''}`} data-explore-id={item.id}>
      <div className={styles.questionWrap}>
        <div className={styles.questionColumn}>
          <div className={styles.question}>{item.question}</div>
          <div className={styles.questionActions}>
            <Tooltip title="复制"><button type="button" className={styles.questionActionButton} aria-label="复制" onClick={copyQuestion}><CopyOutlined /></button></Tooltip>
            {item.status === 'running' && onStop && <Tooltip title="停止执行"><button type="button" className={`${styles.questionActionButton} ${styles.stopButton}`} aria-label="停止执行" onClick={onStop}><StopOutlined /></button></Tooltip>}
            {onDelete && <Tooltip title="删除"><button type="button" className={styles.questionActionButton} aria-label="删除" onClick={() => onDelete(item)}><DeleteOutlined /></button></Tooltip>}
          </div>
        </div>
      </div>
      <section className={styles.answerCard} aria-label="探索回答">
        <header className={styles.header}>
          <button type="button" className={`${styles.toggle} ${styles.headerToggle}`} aria-label={STATUS_LABELS[item.status]} aria-expanded={open} aria-controls={processId}
            onClick={(event) => disclosure.toggle('process', automatic, event.currentTarget)}>
            <CompassOutlined />
            <span className={styles.headerTitle}>探索模式</span>
            <span className={styles.statusBadge} data-status={item.status}><span className={styles.statusDot} aria-hidden="true" />{STATUS_BADGES[item.status]}</span>
            <RightOutlined className={`${styles.chevron} ${open ? styles.expanded : ''}`} />
          </button>
          <button type="button" className={`${styles.studio} ${active ? styles.studioActive : ''}`} aria-label={active ? '收起工作室' : '打开工作室'}
            aria-pressed={Boolean(active)} onClick={active ? onClose : onOpen} disabled={active ? !onClose : !onOpen}>
            {active ? <ShrinkOutlined /> : <ExpandOutlined />} 工作室
          </button>
        </header>
        <div className={styles.answerBody}>
          {open && <div id={processId} className={styles.process} aria-label="探索执行过程">
            <ExploreProcess blocks={blocks} disclosure={disclosure} onEditCode={onEditCode} highlightStepId={highlightId} />
            {!blocks.length && <p className={styles.metadata}>{item.status === 'running' ? '正在规划任务…' : '暂无已保存的过程详情'}</p>}
          </div>}
          {item.status === 'failed' && <p role="alert" className={styles.error}>{item.error?.message || '探索未完成。'}</p>}
          {item.status === 'cancelled' && <p className={styles.hint}>已停止探索。</p>}
          {summary && <section className={`${styles.finalSummary} ${open ? styles.summarySeparated : ''}`} aria-label="最终摘要"><ExploreRichText text={summary} /></section>}
        </div>
        <footer className={styles.actions}>
          <Tooltip title="点赞"><button type="button" aria-label="点赞" onClick={() => message.info('功能开发中...')}><LikeOutlined /></button></Tooltip>
          <Tooltip title="点踩"><button type="button" aria-label="点踩" onClick={() => message.info('功能开发中...')}><DislikeOutlined /></button></Tooltip>
          <Dropdown
            trigger={['click']}
            placement="topRight"
            disabled={!canSave}
            menu={{ items: EXPORT_MENU_ITEMS, onClick: ({ key }) => downloadExploreExport(item, key as ExploreExportFormat) }}
          >
            <Tooltip title="保存为文档">
              <button type="button" aria-label="保存为文档" aria-haspopup="menu" disabled={!canSave}>
                <FileTextOutlined />
              </button>
            </Tooltip>
          </Dropdown>
        </footer>
      </section>
    </article>
  )
}

export default function ExploreMessageRow(props: ExploreMessageRowProps) {
  return <ExploreMessage key={props.item.id} {...props} />
}
