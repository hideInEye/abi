import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SidebarCollapseButton } from './SidebarCollapseButton'
import { SidebarCollapseProvider } from './SidebarCollapseContext'

function renderButton(collapsed: boolean) {
  return renderToStaticMarkup(
    <SidebarCollapseProvider
      value={{
        collapsed,
        toggleSidebar: vi.fn(),
        collapseSidebar: vi.fn(),
      }}
    >
      <SidebarCollapseButton />
    </SidebarCollapseProvider>,
  )
}

describe('SidebarCollapseButton', () => {
  it('侧栏展开时提供收起入口及可访问名称', () => {
    const html = renderButton(false)

    expect(html).toContain('aria-label="收起侧边栏"')
    expect(html).toContain('title="收起侧边栏"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('points="15 9 12 12 15 15"')
  })

  it('侧栏收起时提供展开入口及对应图标', () => {
    const html = renderButton(true)

    expect(html).toContain('aria-label="展开侧边栏"')
    expect(html).toContain('title="展开侧边栏"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('points="12 9 15 12 12 15"')
  })
})
