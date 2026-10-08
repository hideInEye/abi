import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createElement() {
  return {
    addEventListener: vi.fn(),
    onerror: null as null | (() => void),
    onload: null as null | (() => void),
    remove: vi.fn(),
    setAttribute: vi.fn(),
    style: { cssText: '' }
  }
}

function mockDocument() {
  const root = { replaceChildren: vi.fn() }
  const script = createElement()
  const stylesheet = createElement()
  const assistant = createElement()
  const iframe = createElement()
  const elements = { 'abi-assistant': assistant, iframe, link: stylesheet, script }
  const head = { appendChild: vi.fn() }
  vi.stubGlobal('document', {
    createElement: vi.fn((tag: keyof typeof elements) => elements[tag]),
    getElementById: vi.fn(() => root),
    head
  })
  vi.stubGlobal('customElements', { get: vi.fn(() => class {}) })
  return { assistant, head, iframe, root, script, stylesheet }
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('share entry bridge', () => {
  it('loads the SDK only when requested and waits for both resources before showing the assistant', async () => {
    const { assistant, head, root, script, stylesheet } = mockDocument()
    const { mountAssistantShare } = await import('./shareBridge')
    expect(head.appendChild).not.toHaveBeenCalled()
    const mounting = mountAssistantShare('share-code')
    expect(head.appendChild).toHaveBeenCalledTimes(2)
    expect(script).toMatchObject({ async: true, src: '/chat-ui/abi-assistant-widget.js' })
    expect(stylesheet).toMatchObject({ href: '/chat-ui/abi-assistant-widget.css', id: 'abi-assistant-widget-styles', rel: 'stylesheet' })
    script.onload?.()
    await Promise.resolve()
    expect(root.replaceChildren).not.toHaveBeenCalled()
    stylesheet.onload?.()
    await mounting
    expect(assistant.setAttribute.mock.calls).toEqual([
      ['share-code', 'share-code'], ['base', '/api'], ['theme-switch', '']
    ])
    expect(root.replaceChildren).toHaveBeenCalledWith(assistant)
    assistant.addEventListener.mock.calls[0][1]()
    expect(assistant.remove).toHaveBeenCalledOnce()
    await mountAssistantShare('another-code')
    expect(head.appendChild).toHaveBeenCalledTimes(2)
    expect(assistant.setAttribute).toHaveBeenCalledWith('share-code', 'another-code')
  })

  it('keeps the startup shell on failure and can load the SDK again', async () => {
    const { head, root, script, stylesheet } = mockDocument()
    const { mountAssistantShare } = await import('./shareBridge')
    const mounting = mountAssistantShare('share-code')
    const failed = expect(mounting).rejects.toThrow('助手分享资源加载失败')
    script.onerror?.()
    await failed
    expect(root.replaceChildren).not.toHaveBeenCalled()
    expect(script.remove).toHaveBeenCalledOnce()
    expect(stylesheet.remove).toHaveBeenCalledOnce()
    const retry = mountAssistantShare('share-code')
    script.onload?.()
    stylesheet.onload?.()
    await retry
    expect(head.appendChild).toHaveBeenCalledTimes(4)
    expect(root.replaceChildren).toHaveBeenCalledOnce()
  })

  it('rejects a script that did not register the custom element', async () => {
    const { root, script, stylesheet } = mockDocument()
    vi.stubGlobal('customElements', { get: vi.fn() })
    const { mountAssistantShare } = await import('./shareBridge')
    const mounting = mountAssistantShare('share-code')
    const failed = expect(mounting).rejects.toThrow('助手分享组件初始化失败')
    script.onload?.()
    stylesheet.onload?.()
    await failed
    expect(root.replaceChildren).not.toHaveBeenCalled()
  })

  it('keeps dashboard shares in their standalone iframe without loading the assistant SDK', async () => {
    const { head, iframe, root } = mockDocument()
    const { mountShareBridge } = await import('./shareBridge')
    mountShareBridge('/dashboard-ui/preview/share/example')
    expect(iframe).toMatchObject({ src: '/dashboard-ui/preview/share/example', title: '分享页面' })
    expect(root.replaceChildren).toHaveBeenCalledWith(iframe)
    expect(head.appendChild).not.toHaveBeenCalled()
  })
})
