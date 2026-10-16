import { CompassOutlined, DeleteOutlined, DislikeOutlined, ExpandOutlined, FileTextOutlined, LikeOutlined, RightOutlined, ShrinkOutlined } from '@ant-design/icons'
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
  /** 点击步骤内工作室入口时定位到该步骤屏；缺省时回退 onOpen。 */
  readonly onOpenStep?: (stepId: string) => void
  readonly scrollContainerRef?: RefObject<HTMLDivElement>
}

const STATUS_LABELS = { running: '探索执行中', completed: '探索已完成', failed: '探索失败', cancelled: '探索已取消' }
const STATUS_BADGES = { running: '执行中', completed: '已完成', failed: '失败', cancelled: '已取消' }

function ExploreMessage({ item, active, onOpen, onClose, onEditCode, onDelete, compact, scrollContainerRef, locateStepId, onOpenStep }: ExploreMessageRowProps) {
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
  const [highlightId, setHighlightId] = useState<string>()
  const locatedRef = useRef<string>()
  useEffect(() => {
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
    const timer = setTimeout(() => setHighlightId(undefined), 1600)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [locateStepId, item, disclosure, scrollContainerRef])
  return (
    <article ref={rootRef} className={`${styles.message} ${compact ? styles.compact : ''}`} data-explore-id={item.id}>
      <div className={styles.questionWrap}>
        <div className={styles.questionColumn}>
          <div className={styles.question}>{item.question}</div>
          {onDelete && <Tooltip title="删除"><button type="button" className={styles.deleteButton} aria-label="删除" onClick={() => onDelete(item)}><DeleteOutlined /></button></Tooltip>}
        </div>
      </div>
      <section className={styles.answerCard} aria-label="探索回答">
        <header className={styles.header}>
          <button type="button" className={`${styles.toggle} ${styles.headerToggle}`} aria-label={STATUS_LABELS[item.status]} aria-expanded={open} aria-controls={processId}
            onClick={(event) => disclosure.toggle('process', automatic, event.currentTarget)}>
            <CompassOutlined />
            <span className={styles.headerTitle}>探索分析</span>
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
            <ExploreProcess blocks={blocks} disclosure={disclosure} onEditCode={onEditCode} onOpen={onOpen}
              onOpenStep={onOpenStep} highlightStepId={highlightId} />
            {!blocks.length && <p className={styles.metadata}>{item.status === 'running' ? '正在规划任务…' : '暂无已保存的过程详情'}</p>}
          </div>}
          {item.status === 'running' && <p className={styles.hint}>正在处理中，请留在当前对话页面，离开将中断任务。</p>}
          {item.status === 'failed' && <p role="alert" className={styles.error}>{item.error?.message || '探索未完成，已收到的内容已保留。'}</p>}
          {item.status === 'cancelled' && <p className={styles.hint}>已停止探索，已收到的内容已保留。</p>}
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
