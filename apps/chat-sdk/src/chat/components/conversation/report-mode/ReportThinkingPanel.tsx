import { BulbOutlined, DownOutlined, LoadingOutlined } from '@ant-design/icons'
import React, { useEffect, useRef, useState } from 'react'

import type { ReportItem } from './types'
import styles from './styles.module.css'

interface ReportThinkingPanelProps {
  report: ReportItem
  onToggle: () => void
  onTypewriterComplete?: () => void
}

const THINKING_TYPEWRITER_INTERVAL_MS = 30
const THINKING_TYPEWRITER_MAX_TICKS = 180

/**
 * 后端会一次性返回完整 step.plan，这里只负责把首次实时正文模拟为逐步输入。
 * completedEntryIdRef 保证组件重渲染、展开或收起时不会重复播放同一条正文。
 */
function useThinkingTypewriter(content: string, entryId: string | undefined, enabled: boolean, onComplete?: () => void) {
  const [displayedContent, setDisplayedContent] = useState(() => (enabled && content ? '' : content))
  const completedEntryIdRef = useRef<string>()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!enabled || !content || !entryId) {
      setDisplayedContent(content)
      return undefined
    }

    if (completedEntryIdRef.current === entryId) {
      setDisplayedContent(content)
      return undefined
    }

    const characters = Array.from(content)
    const batchSize = Math.max(1, Math.ceil(characters.length / THINKING_TYPEWRITER_MAX_TICKS))
    let visibleCount = 0
    setDisplayedContent('')

    const timer = window.setInterval(() => {
      visibleCount = Math.min(visibleCount + batchSize, characters.length)
      setDisplayedContent(characters.slice(0, visibleCount).join(''))

      if (visibleCount >= characters.length) {
        completedEntryIdRef.current = entryId
        window.clearInterval(timer)
        onCompleteRef.current?.()
      }
    }, THINKING_TYPEWRITER_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [content, enabled, entryId])

  return {
    displayedContent,
    typing: enabled && Boolean(content) && displayedContent !== content,
  }
}

function getThinkingSummary(report: ReportItem) {
  if (report.status === 'submitting') return '正在理解你的问题'
  if (report.status === 'waiting_stream') return '正在分析问题'
  if (report.status === 'syncing_history') return '正在整理报告结果'
  if (report.thinkingCompleted) return '分析完成'
  if (report.thinkingPlan) return '正在制定任务计划'

  return '正在分析问题'
}

const ReportThinkingPanel: React.FC<ReportThinkingPanelProps> = ({ report, onToggle, onTypewriterComplete }) => {
  const thinkingPlanContent = report.thinkingPlan?.content
  const shouldAnimateThinking = report.source === 'task' && report.animateThinkingPlan === true
  const { displayedContent, typing } = useThinkingTypewriter(thinkingPlanContent || '', report.thinkingPlan?.entryId, shouldAnimateThinking, onTypewriterComplete)

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.panelHeader} onClick={onToggle} aria-expanded={report.thinkingOpen}>
        <span className={styles.panelTitle}>
          <BulbOutlined />
          思考
        </span>
        <span className={styles.panelSummary}>{getThinkingSummary(report)}</span>
        <DownOutlined style={{ transform: report.thinkingOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      <div className={`${styles.panelBody} ${styles.thinkingPanelBody}`}>
        <div className={`${styles.thinkingContentViewport} ${report.thinkingOpen ? '' : styles.thinkingContentCollapsed}`} data-testid="report-thinking-viewport" data-collapsed={!report.thinkingOpen}>
          {thinkingPlanContent ? (
            <div className={styles.thinkingPlanContent} data-typewriter-active={typing}>
              {displayedContent}
              {typing && <span className={styles.thinkingTypewriterCursor} aria-hidden="true" />}
            </div>
          ) : (
            <div className={styles.thinkingPlaceholder}>
              <LoadingOutlined />
              <span>{getThinkingSummary(report)}</span>
            </div>
          )}
          {!report.thinkingOpen && <div className={styles.thinkingContentFade} data-testid="report-thinking-fade" aria-hidden="true" />}
        </div>
      </div>
    </section>
  )
}

export default ReportThinkingPanel
