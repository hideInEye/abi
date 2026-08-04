import { useEffect, useRef, useState } from 'react'

import type { ReportItem } from './types'

export type ReportPreviewTransitionPhase = 'closed' | 'opening' | 'open' | 'closing'

/**
 * 桌面端报告面板的呈现状态。
 *
 * activeReport 被清空时不能立刻卸载 iframe，否则关闭动画无法播放，报告内部的
 * 滚动位置也会在渐出前瞬间丢失。这里保留最后一份报告直到退场动画结束。
 */
export function useReportPreviewPresence(activeReport?: ReportItem) {
  const [renderedReport, setRenderedReport] = useState<ReportItem | undefined>(activeReport)
  const [phase, setPhase] = useState<ReportPreviewTransitionPhase>(activeReport ? 'open' : 'closed')
  const phaseRef = useRef(phase)
  const renderedReportRef = useRef(renderedReport)
  const animationFrameRef = useRef<number>()
  const openFrameRef = useRef<number>()
  const closeTimerRef = useRef<number>()

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    renderedReportRef.current = renderedReport
  }, [renderedReport])

  useEffect(() => {
    const clearScheduledTransition = () => {
      if (animationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
      if (openFrameRef.current !== undefined) {
        window.cancelAnimationFrame(openFrameRef.current)
        openFrameRef.current = undefined
      }
      if (closeTimerRef.current !== undefined) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = undefined
      }
    }

    clearScheduledTransition()
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    if (activeReport) {
      setRenderedReport(activeReport)

      if (reduceMotion) {
        setPhase('open')
        return clearScheduledTransition
      }

      // 报告内容更新时只替换数据；仅从关闭态进入时重新播放入场动画。
      if (phaseRef.current !== 'open') {
        setPhase('opening')
        animationFrameRef.current = window.requestAnimationFrame(() => {
          openFrameRef.current = window.requestAnimationFrame(() => {
            setPhase('open')
          })
        })
      }
      return clearScheduledTransition
    }

    if (!renderedReportRef.current) {
      setPhase('closed')
      return clearScheduledTransition
    }

    if (reduceMotion) {
      setRenderedReport(undefined)
      setPhase('closed')
      return clearScheduledTransition
    }

    setPhase('closing')
    closeTimerRef.current = window.setTimeout(() => {
      setRenderedReport(undefined)
      setPhase('closed')
      closeTimerRef.current = undefined
    }, 300)

    return clearScheduledTransition
  }, [activeReport])

  return {
    renderedReport,
    phase,
    mounted: Boolean(renderedReport),
    visible: phase === 'open',
  }
}
