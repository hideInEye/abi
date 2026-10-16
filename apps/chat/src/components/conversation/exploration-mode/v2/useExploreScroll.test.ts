import { describe, expect, it } from 'vitest'

import { restoreExploreAnchor } from './useExploreScroll'

function geometry(naturalHeight: number, contentTop: number) {
  let scrollTop = 0
  const root = {
    style: { minHeight: '' },
    get offsetHeight() { return Math.max(naturalHeight, parseFloat(this.style.minHeight) || 0) },
  }
  const container = {
    clientHeight: 600,
    get scrollHeight() { return Math.max(600, root.offsetHeight) },
    get scrollTop() { return Math.min(scrollTop, this.scrollHeight - this.clientHeight) },
    set scrollTop(value: number) { scrollTop = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)) },
  }
  const trigger = {
    closest: () => root,
    getBoundingClientRect: () => ({ top: contentTop - container.scrollTop }),
  }
  const restore = (top: number) => restoreExploreAnchor(container as HTMLElement, trigger as unknown as HTMLElement, top)
  return { container, root, trigger, restore }
}

describe('探索折叠阅读锚点', () => {
  it('折叠后不足一屏时，只补足维持触发行位置所需的高度', () => {
    const { root, container, trigger, restore } = geometry(200, 200)
    restore(100)
    expect(root.style.minHeight).toBe('700px')
    expect(container.scrollTop).toBe(100)
    expect(trigger.getBoundingClientRect().top).toBe(100)
  })

  it('已有足够滚动空间时不额外留白', () => {
    const { root, container, trigger, restore } = geometry(1200, 200)
    restore(100)
    expect(root.style.minHeight).toBe('')
    expect(container.scrollTop).toBe(100)
    expect(trigger.getBoundingClientRect().top).toBe(100)
  })

  it('阅读位置在顶部时不增加高度', () => {
    const { root, container, restore } = geometry(200, 100)
    restore(100)
    expect(root.style.minHeight).toBe('')
    expect(container.scrollTop).toBe(0)
  })
})
