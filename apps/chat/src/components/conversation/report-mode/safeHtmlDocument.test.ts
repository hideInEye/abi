import { describe, expect, it } from 'vitest'

import { createSafeHtmlDocument } from './safeHtmlDocument'

describe('safe HTML report document', () => {
  it('adds a restrictive CSP without adding executable code', () => {
    const result = createSafeHtmlDocument('<html><head><title>报告</title></head><body>内容<script>alert(1)</script></body></html>')
    expect(result).toContain('Content-Security-Policy')
    expect(result).toContain("script-src 'none'")
    expect(result).toContain("connect-src 'none'")
    expect(result).not.toContain('data-report-typewriter-runtime')
  })

  it('supports fragments and enforces its own policy even if input contains CSP metadata', () => {
    expect(createSafeHtmlDocument('<p>内容</p>')).toMatch(/^<meta /)
    const secured = createSafeHtmlDocument('<head><meta http-equiv="Content-Security-Policy" content="default-src none"></head>')
    expect(secured.match(/Content-Security-Policy/g)).toHaveLength(2)
    expect(secured).toContain("script-src 'none'")
  })
})
