import { createFileRoute } from '@tanstack/react-router'

import { AssistantSharePageView } from '../assistant-share-page/$shareCode'

/** 后端分享链接统一为哈希路径 dashboard_share_page/{code}，直接在后端路径上渲染（不重定向，URL 保持不变） */
export const Route = createFileRoute('/dashboard_share_page/$shareCode')({
  component: AssistantSharePage,
  // embed=1 时以可嵌入悬浮对话框（铺满 iframe）形态渲染，供第三方系统 iframe 直嵌
  // TanStack 默认 JSON 解析 search，?embed=1 会解析为数字 1，故数字/字符串/布尔均需兼容
  validateSearch: (search: Record<string, unknown>): { embed?: boolean } => ({
    embed: search.embed === 1 || search.embed === '1' || search.embed === 'true' || search.embed === true,
  }),
})

function AssistantSharePage() {
  const { shareCode } = Route.useParams()
  const { embed } = Route.useSearch()
  return <AssistantSharePageView shareCode={shareCode} embed={embed} />
}
