import type { CSSProperties } from 'react'

const deferredMessageStyle: CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 320px',
}

export function getDeferredMessageStyle(index: number, itemCount: number, streaming: boolean): CSSProperties | undefined {
  if (streaming && index === itemCount - 1) return undefined
  return deferredMessageStyle
}

interface VirtualMessageWindowOptions {
  containerHeight: number
  estimatedItemHeight: number
  itemCount: number
  overscan: number
  scrollTop: number
}

export function calculateVirtualMessageWindow(options: VirtualMessageWindowOptions) {
  const { containerHeight, estimatedItemHeight, itemCount, overscan, scrollTop } = options
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan)
  const endIndex = Math.min(itemCount, Math.ceil((scrollTop + containerHeight) / estimatedItemHeight) + overscan)

  return {
    endIndex,
    offsetTop: startIndex * estimatedItemHeight,
    startIndex,
    totalHeight: itemCount * estimatedItemHeight,
  }
}
