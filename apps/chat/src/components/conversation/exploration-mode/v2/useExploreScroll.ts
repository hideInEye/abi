import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

import type { ExploreItem } from '../types'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function isNearBottom(container: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>): boolean {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= 72
}

export function restoreExploreAnchor(container: HTMLElement, trigger: HTMLElement, previousTop: number): HTMLElement | null {
  const root = trigger.closest<HTMLElement>('[data-explore-id]')
  if (root) root.style.minHeight = ''
  const target = Math.max(0, container.scrollTop + trigger.getBoundingClientRect().top - previousTop)
  if (root && target > container.scrollHeight - container.clientHeight) {
    // 内容短于视口时临时留白，否则浏览器会钳制 scrollTop，无法保住点击行。
    const naturalHeight = root.offsetHeight
    root.style.minHeight = `${naturalHeight + container.clientHeight + target}px`
    const excess = container.scrollHeight - container.clientHeight - target
    root.style.minHeight = `${Math.max(naturalHeight, root.offsetHeight - excess)}px`
  }
  container.scrollTop = target
  return root
}

export function useExploreScroll(item: ExploreItem, containerRef?: RefObject<HTMLDivElement>) {
  const following = useRef(false)
  const manual = useRef(false)
  const anchor = useRef<{ top: number; trigger: HTMLElement } | null>(null)
  const reservedRoot = useRef<HTMLElement | null>(null)
  const wasRunning = useRef(item.status === 'running')

  useEffect(() => {
    const container = containerRef?.current
    if (!container) return
    following.current = isNearBottom(container)
    const releaseReserve = () => {
      if (reservedRoot.current) reservedRoot.current.style.minHeight = ''
      reservedRoot.current = null
    }
    const onScroll = () => {
      if (!manual.current) {
        releaseReserve()
        following.current = isNearBottom(container)
      }
    }
    const onWheel = (event: WheelEvent) => {
      manual.current = false
      releaseReserve()
      if (event.deltaY < 0) following.current = false
    }
    const onNavigate = () => { manual.current = false }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
        onNavigate()
        releaseReserve()
      }
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    container.addEventListener('wheel', onWheel, { passive: true })
    container.addEventListener('touchstart', onNavigate, { passive: true })
    container.addEventListener('pointerdown', onNavigate)
    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('scroll', onScroll)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchstart', onNavigate)
      container.removeEventListener('pointerdown', onNavigate)
      container.removeEventListener('keydown', onKeyDown)
      releaseReserve()
    }
  }, [containerRef])

  useEffect(() => {
    const container = containerRef?.current
    const running = item.status === 'running'
    if (container && (running || wasRunning.current) && following.current && !manual.current) {
      container.scrollTop = container.scrollHeight
    }
    wasRunning.current = running
  }, [item, containerRef])

  useBrowserLayoutEffect(() => {
    const pending = anchor.current
    const container = containerRef?.current
    anchor.current = null
    if (pending?.trigger.isConnected && container) {
      reservedRoot.current = restoreExploreAnchor(container, pending.trigger, pending.top)
    }
  })

  return (trigger: HTMLElement) => {
    if (!containerRef?.current) return
    // 在折叠提交后的绘制前恢复锚点，避免闪跳，也不依赖后台页面暂停的动画帧。
    manual.current = true
    following.current = false
    anchor.current = { top: trigger.getBoundingClientRect().top, trigger }
  }
}
