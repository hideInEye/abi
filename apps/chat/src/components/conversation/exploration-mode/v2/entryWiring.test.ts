import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8')

describe('Chat 探索入口接线', () => {
  it('主消息保持懒加载并传递工作室、编辑、删除和滚动容器', () => {
    const source = read('../../components/MessageList.tsx')
    expect(source).toContain("const loadExploreMessageRow = () => import('../exploration-mode/v2/ExploreMessageRow')")
    const branch = source.slice(source.indexOf("if (item.role === 'exploration') {"), source.indexOf("if (item.role === 'human') {"))
    expect(branch).toContain('scrollContainerRef: containerRef')
    expect(branch).toContain('onClose: onCloseExplore')
    expect(branch).toContain('onEditCode: onEditExploreCode')
    expect(branch).toContain('onOpenExplore?.(exploration.id)')
    expect(branch).toContain('onEnterDeleteMode({ deleteRoundIndex })')
  })

  it('Chat 助手调试复用新版并补齐关闭和滚动接线', () => {
    const source = read('../../../../pages/chat/workshop/-AssistantDetailDrawer.tsx')
    expect(source).toContain("from '@/components/conversation/exploration-mode/v2/ExploreMessageRow'")
    expect(source).toContain('scrollContainerRef={debugScrollRef}')
    expect(source).toContain('onClose={() => setPreviewId(null)}')
    expect(source).toContain('setPreviewId(it.id)')
  })
})
