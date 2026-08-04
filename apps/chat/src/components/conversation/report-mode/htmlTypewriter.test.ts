import { describe, expect, it } from 'vitest'

import { createTypewriterHtmlDocument, REPORT_TYPEWRITER_MARKER } from './htmlTypewriter'

describe('HTML report typewriter document', () => {
  it('保留完整 HTML，并在文档末尾只注入一次打字机运行时', () => {
    const html = '<!doctype html><html><head><title>报告</title></head><body><main>第一段</main></body></html>'
    const result = createTypewriterHtmlDocument(html)

    expect(result.startsWith(html)).toBe(true)
    expect(result).toContain(REPORT_TYPEWRITER_MARKER)
    expect(result.match(new RegExp(REPORT_TYPEWRITER_MARKER, 'g'))).toHaveLength(1)
    expect(createTypewriterHtmlDocument(result)).toBe(result)

    const runtime = result.match(/<script[^>]*>([\s\S]*)<\/script>$/)?.[1]
    expect(runtime).toBeTruthy()
    expect(() => new Function(runtime || '')).not.toThrow()
  })

  it('兼容 HTML 片段并声明动画降级与非正文节点过滤规则', () => {
    const result = createTypewriterHtmlDocument('<section><h1>标题</h1><p>内容</p></section>')

    expect(result).toContain('<section><h1>标题</h1><p>内容</p></section>')
    expect(result).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(result).toContain('parent.closest(\'script,style,noscript,template,textarea,svg,[hidden],[aria-hidden="true"]\')')
    expect(result).toContain('requestAnimationFrame')
    expect(result).toContain('Math.min(8000')
  })
})
