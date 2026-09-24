import { describe, expect, it } from 'vitest'

import { calculateVirtualMessageWindow, getDeferredMessageStyle } from './messageRendering'

describe('message rendering strategy', () => {
  it.each([100, 500, 1000])('keeps a bounded window while scrolling %i messages', (itemCount) => {
    const first = calculateVirtualMessageWindow({
      containerHeight: 720,
      estimatedItemHeight: 120,
      itemCount,
      overscan: 6,
      scrollTop: 0,
    })
    const middle = calculateVirtualMessageWindow({
      containerHeight: 720,
      estimatedItemHeight: 120,
      itemCount,
      overscan: 6,
      scrollTop: itemCount * 60,
    })
    const last = calculateVirtualMessageWindow({
      containerHeight: 720,
      estimatedItemHeight: 120,
      itemCount,
      overscan: 6,
      scrollTop: itemCount * 120,
    })

    expect(first.startIndex).toBe(0)
    expect(first.endIndex - first.startIndex).toBeLessThanOrEqual(18)
    expect(middle.endIndex - middle.startIndex).toBeLessThanOrEqual(18)
    expect(last.endIndex).toBe(itemCount)
    expect(last.totalHeight).toBe(itemCount * 120)
  })

  it.each([100, 500, 1000])('keeps the live tail renderable while deferring older content for %i messages', (itemCount) => {
    expect(getDeferredMessageStyle(0, itemCount, true)).toMatchObject({ contentVisibility: 'auto' })
    expect(getDeferredMessageStyle(itemCount - 2, itemCount, true)).toMatchObject({ containIntrinsicSize: 'auto 320px' })
    expect(getDeferredMessageStyle(itemCount - 1, itemCount, true)).toBeUndefined()
    expect(getDeferredMessageStyle(itemCount - 1, itemCount, false)).toMatchObject({ contentVisibility: 'auto' })
  })
})
