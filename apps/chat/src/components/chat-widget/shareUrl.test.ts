import { describe, expect, it } from 'vitest'

import { ASSISTANT_SHARE_ROUTE, convertShareUrl, parseShareCode } from './shareUrl'

describe('parseShareCode', () => {
  it('从完整 URL 提取 shareCode', () => {
    expect(parseShareCode('https://demo.com/chat-ui/#/assistant_share_page/abc123')).toBe('abc123')
  })

  it('从纯路径提取 shareCode', () => {
    expect(parseShareCode('/#/assistant_share_page/abc_1')).toBe('abc_1')
  })

  it('兼容连字线路径格式', () => {
    expect(parseShareCode('https://demo.com/#/assistant-share-page/xyz9')).toBe('xyz9')
  })

  it('兼容大屏 dashboard_share_page 标识（后端统一返回格式）', () => {
    expect(parseShareCode('https://192.168.1.195/#/dashboard_share_page/qpulk6sb')).toBe('qpulk6sb')
    expect(convertShareUrl('https://demo.com/#/dashboard_share_page/vi1i3pe2')).toBe(
      `${ASSISTANT_SHARE_ROUTE}/vi1i3pe2`,
    )
  })

  it('非法输入返回空串', () => {
    expect(parseShareCode('')).toBe('')
    expect(parseShareCode('https://demo.com/#/other/xyz')).toBe('')
  })
})

describe('convertShareUrl', () => {
  it('下划线路径转前端连字符路由', () => {
    expect(convertShareUrl('https://demo.com/#/assistant_share_page/abc123')).toBe(
      `${ASSISTANT_SHARE_ROUTE}/abc123`,
    )
  })

  it('无法解析时返回空串', () => {
    expect(convertShareUrl('bad-input')).toBe('')
  })
})
