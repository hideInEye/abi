import { useEffect, useRef, useState } from 'react'

import type { ExploreItem } from './types'

export type ExplorePreviewTransitionPhase = 'closed' | 'opening' | 'open' | 'closing'

/**
 * 桌面端探索结果侧栏的呈现状态。
 *
 * activeItem 被清空时不能立刻卸载内容，否则关闭动画无法播放、内部滚动位置会瞬间丢失。
 * 这里保留最后一份探索项直到退场动画结束。与报告侧栏共用同一套分屏动画壳。
 */
export function useExplorePreviewPresence(activeItem?: ExploreItem) {
  const [renderedItem, setRenderedItem] = useState<ExploreItem | undefined>(activeItem)
  const [phase, setPhase] = useState<ExplorePreviewTransitionPhase>(activeItem ? 'open' : 'closed')
  const phaseRef = useRef(phase)
  const renderedItemRef = useRef(renderedItem)
  const animationFrameRef = useRef<number>()
  const openFrameRef = useRef<number>()
  const closeTimerRef = useRef<number>()

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    renderedItemRef.current = renderedItem
  }, [renderedItem])

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

    if (activeItem) {
      setRenderedItem(activeItem)

      // 内容更新时只替换数据；仅从关闭态进入时重新播放入场动画。
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

    if (!renderedItemRef.current) {
      setPhase('closed')
      return clearScheduledTransition
    }

    setPhase('closing')
    closeTimerRef.current = window.setTimeout(() => {
      setRenderedItem(undefined)
      setPhase('closed')
      closeTimerRef.current = undefined
    }, 300)

    return clearScheduledTransition
  }, [activeItem])

  return {
    renderedItem,
    phase,
    mounted: Boolean(renderedItem),
    visible: phase === 'open',
  }
}
