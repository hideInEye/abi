import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ExploreMessageRow from './ExploreMessageRow'
import type { ExploreItem } from './types'

function createExploreItem(): ExploreItem {
  return {
    createdAt: 1,
    id: 'explore-1',
    question: '分析订单变化',
    roundIndex: 3,
    sortOrder: 3,
    status: 'completed',
    steps: [],
    tasks: [],
  }
}

describe('ExploreMessageRow', () => {
  it('持久化探索轮次接入统一删除入口', () => {
    const markup = renderToStaticMarkup(
      <ExploreMessageRow item={createExploreItem()} onDelete={() => undefined} />,
    )

    expect(markup).toContain('分析订单变化')
    expect(markup).toContain('aria-label="删除"')
  })

  it('只读场景未传删除回调时不渲染删除入口', () => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={createExploreItem()} />)

    expect(markup).not.toContain('aria-label="删除"')
  })
})
