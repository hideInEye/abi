export type AbiBootstrapBranch =
  | { kind: 'app' }
  | { kind: 'chat-share'; shareCode: string }
  | { kind: 'dashboard-share'; targetUrl: string }

const CHAT_SHARE_HASH = /^#\/?dashboard_share_page\/([^/?#]+)/i
const DASHBOARD_SHARE_PATH = /\/(dashboard-share-page|dashboard_share_page)\/[^/?#]+/i

export function resolveAbiBootstrapBranch(href: string, poweredByQiankun: boolean): AbiBootstrapBranch {
  if (poweredByQiankun) return { kind: 'app' }

  const url = new URL(href)
  const chatShare = url.hash.match(CHAT_SHARE_HASH)
  if (chatShare) {
    return {
      kind: 'chat-share',
      shareCode: chatShare[1],
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
