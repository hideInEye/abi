import { describe, expect, it } from 'vitest'

import { resolveAbiBootstrapBranch } from './branch'

describe('resolveAbiBootstrapBranch', () => {
  it('keeps qiankun mounts on the full application branch', () => {
    expect(resolveAbiBootstrapBranch('https://example.com/dashboard_share_page/code', true)).toEqual({ kind: 'app' })
  })

  it('preserves the existing hash bridge for assistant shares', () => {
    expect(resolveAbiBootstrapBranch('https://example.com/#/dashboard_share_page/code?embed=1', false)).toEqual({
      kind: 'chat-share',
      targetUrl: 'https://example.com/chat-ui/#/dashboard_share_page/code?embed=1',
    })
  })

  it.each(['/dashboard-share-page/code', '/dashboard_share_page/code'])(
    'routes the dashboard alias %s before loading the ABI app',
    path => {
      expect(resolveAbiBootstrapBranch(`https://example.com${path}?preview=1`, false)).toEqual({
        kind: 'dashboard-share',
        targetUrl: `https://example.com/dashboard-ui${path}?preview=1`,
      })
    },
  )

  it('uses the full application for ordinary routes', () => {
    expect(resolveAbiBootstrapBranch('https://example.com/home', false)).toEqual({ kind: 'app' })
  })
})
