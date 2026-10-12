import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import NewChatWelcome from './NewChatWelcome'

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('chat presentation compatibility', () => {
  it('uses the original welcome icons', () => {
    const markup = renderToStaticMarkup(createElement(NewChatWelcome))
    for (const name of ['bar-chart', 'file-search', 'fund', 'line-chart']) {
      expect(markup).toContain(`data-icon="${name}"`)
    }
  })

  it('keeps hidden welcome examples hidden', () => {
    const markup = renderToStaticMarkup(createElement(NewChatWelcome, { hideExamples: true, title: '助手' }))
    expect(markup).toContain('助手')
    expect(markup).not.toContain('welcome-case-card')
  })

  it('restores the original shell icons without eagerly loading optional panels', () => {
    expect(source('../layout/CreateConversationButton.tsx')).toContain('<PlusOutlined')
    const route = source('../../pages/chat/route.tsx')
    expect(route).toContain('<ClockCircleOutlined')
    expect(route).not.toContain('◷')
    expect(route).toContain("() => import('@/components/layout/ScheduleTaskDrawer')")
  })

  it('uses Antd pagination in both workshop and skill, with compatible shared styles', () => {
    const workshop = source('../../pages/chat/workshop/index.tsx')
    const skill = source('../../pages/chat/skill/index.tsx')
    for (const page of [workshop, skill]) {
      expect(page).toMatch(/<Select[\s\S]*?className="ws-page-size-select"/)
      expect(page).toMatch(/<Input[\s\S]*?className="ws-jump-input"/)
      expect(page).toContain('onPressEnter={handleJump}')
    }
    const css = source('../../index.css')
    expect(css).toContain('.ws-page-size-select .ant-select-selector')
    const outerSelect = css.match(/\.ws-page-size-select\s*\{([^}]+)\}/)?.[1]
    expect(outerSelect).toBeDefined()
    expect(outerSelect).not.toMatch(/\b(?:padding|border|background)\s*:/)
  })

  it('keeps directory, date picker and detail drawer lazy while retaining the directory icons', () => {
    const page = source('../../pages/chat/workshop/index.tsx')
    expect(page).toMatch(/<Button\s+className="ws-filter-btn"\s+icon=\{<FolderOutlined \/>\}/)
    expect(source('../../pages/chat/workshop/-DataDirectoryDropdown.tsx')).toContain('icon={<FolderOutlined />}')
    expect(page).not.toMatch(/[▣⌄]/u)
    for (const path of ['./-DataDirectoryDropdown', './-AssistantDetailDrawer', '@/components/performance/DeferredDateRangePicker']) {
      expect(page).toContain(`() => import('${path}')`)
    }
  })
})
