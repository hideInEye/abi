export type AbiBootstrapBranch =
  | { kind: 'app' }
  | { kind: 'chat-share'; targetUrl: string }
  | { kind: 'dashboard-share'; targetUrl: string }

const CHAT_SHARE_HASH = /^#\/?dashboard_share_page\/[^/?#]+/i
const DASHBOARD_SHARE_PATH = /\/(dashboard-share-page|dashboard_share_page)\/[^/?#]+/i

export function resolveAbiBootstrapBranch(href: string, poweredByQiankun: boolean): AbiBootstrapBranch {
  if (poweredByQiankun) return { kind: 'app' }

  const url = new URL(href)
  if (CHAT_SHARE_HASH.test(url.hash)) {
    return {
      kind: 'chat-share',
      targetUrl: `${url.origin}/chat-ui/${url.hash}`,
    }
  }

  const dashboardPath = url.pathname.match(DASHBOARD_SHARE_PATH)?.[0]
  if (dashboardPath) {
    return {
      kind: 'dashboard-share',
      targetUrl: `${url.origin}/dashboard-ui${dashboardPath}${url.search}`,
    }
  }

  return { kind: 'app' }
}
